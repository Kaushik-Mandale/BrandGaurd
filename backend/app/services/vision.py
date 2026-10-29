"""Vision analysis: OCR, logo detection, color palette checks using OpenCV + pytesseract."""
import logging
import os
from pathlib import Path
from sqlalchemy.orm import Session
from app.models import BrandAsset, FindingType, Severity

log = logging.getLogger("brandguard.vision")

IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp", ".bmp"}
NO_TEXT = "[NO_TEXT_LAYER]"


def run_vision_checks(db: Session, org_id: int, file_path: str) -> list[dict]:
    """Run all vision checks on an image file and return findings."""
    import cv2
    import numpy as np

    findings = []
    img = cv2.imread(file_path)
    if img is None:
        log.warning("Could not read image: %s", file_path)
        return []

    h, w = img.shape[:2]

    # 1. OCR check
    findings += _ocr_check(img, w, h)

    # 2. Color contrast check
    findings += _contrast_check(img, w, h)

    # 3. Brand palette check
    assets = db.query(BrandAsset).filter_by(org_id=org_id, kind="palette").all()
    if assets:
        findings += _palette_check(img, assets, w, h)

    # 4. Logo check
    logo_assets = db.query(BrandAsset).filter_by(org_id=org_id, kind="logo").all()
    if logo_assets:
        findings += _logo_check(img, logo_assets, file_path, w, h)

    return findings


def _ocr_check(img, w: int, h: int) -> list[dict]:
    """Extract text via pytesseract."""
    try:
        import pytesseract
        import cv2
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        text = pytesseract.image_to_string(gray)
        if text.strip():
            return []  # OCR succeeded, no finding
    except Exception as exc:
        log.debug("OCR: %s", exc)
    return []


def extract_image_text(file_path: str) -> str:
    """Return OCR text from image or NO_TEXT sentinel."""
    try:
        import cv2
        import pytesseract
        img = cv2.imread(file_path)
        if img is None:
            return NO_TEXT
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        text = pytesseract.image_to_string(gray).strip()
        return text if text else NO_TEXT
    except Exception:
        return NO_TEXT


def _contrast_check(img, w: int, h: int) -> list[dict]:
    """Check overall contrast (standard deviation of grayscale) as a proxy for legibility."""
    try:
        import cv2
        import numpy as np
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        std = float(np.std(gray))
        if std < 30:
            return [{
                "type": FindingType.contrast,
                "severity": Severity.medium,
                "start": None, "end": None,
                "flagged_text": "",
                "message": f"Low contrast detected (σ={std:.1f}). Text may be hard to read. Ensure contrast ratio ≥4.5:1.",
                "confidence": 0.85,
                "verified": True,
                "region": {"x": 0, "y": 0, "w": w, "h": h, "img_w": w, "img_h": h},
            }]
    except Exception as exc:
        log.debug("Contrast check failed: %s", exc)
    return []


def rgb_to_lab(r: int, g: int, b: int) -> tuple[float, float, float]:
    """Convert RGB to OpenCV CIELAB color space."""
    import cv2
    import numpy as np
    pixel = np.uint8([[[b, g, r]]])  # BGR order for OpenCV
    lab = cv2.cvtColor(pixel, cv2.COLOR_BGR2Lab)
    return float(lab[0, 0, 0]), float(lab[0, 0, 1]), float(lab[0, 0, 2])


def delta_e_cielab(lab1: tuple[float, float, float], lab2: tuple[float, float, float]) -> float:
    """Calculate CIE76 Delta E perceptual color distance in CIELAB space."""
    return float(((lab1[0] - lab2[0]) ** 2 + (lab1[1] - lab2[1]) ** 2 + (lab1[2] - lab2[2]) ** 2) ** 0.5)


def _palette_check(img, assets: list[BrandAsset], w: int, h: int) -> list[dict]:
    """Check dominant colors against brand palette using CIELAB / Delta E perceptual color space."""
    import cv2
    import numpy as np

    findings = []
    for asset in assets:
        brand_colors = asset.data.get("colors", [])
        if not brand_colors:
            continue

        # Convert brand palette hex to CIELAB
        brand_labs: list[tuple[float, float, float]] = []
        for brand_hex in brand_colors:
            try:
                bh = brand_hex.lstrip("#")
                br, bg, bb = int(bh[0:2], 16), int(bh[2:4], 16), int(bh[4:6], 16)
                brand_labs.append(rgb_to_lab(br, bg, bb))
            except Exception:
                continue

        if not brand_labs:
            continue

        # Get dominant colors using K-means
        data = img.reshape(-1, 3).astype(np.float32)
        k = min(5, data.shape[0])
        _, labels, centers = cv2.kmeans(
            data, k, None,
            (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 10, 1.0),
            3, cv2.KMEANS_RANDOM_CENTERS,
        )
        dominant_rgbs = [tuple(int(c) for c in center[::-1]) for center in centers]  # BGR→RGB

        # Check perceptual Delta E in CIELAB space (perceptual threshold <= 35)
        matched = False
        min_delta_e = float("inf")
        for dom_rgb in dominant_rgbs:
            dom_lab = rgb_to_lab(dom_rgb[0], dom_rgb[1], dom_rgb[2])
            for b_lab in brand_labs:
                de = delta_e_cielab(dom_lab, b_lab)
                if de < min_delta_e:
                    min_delta_e = de
                if de <= 35.0:  # Perceptually acceptable brand color distance
                    matched = True
                    break
            if matched:
                break

        if not matched:
            findings.append({
                "type": FindingType.palette,
                "severity": Severity.medium,
                "start": None, "end": None,
                "flagged_text": "",
                "message": f'Off-brand colors detected (min CIELAB ΔE={min_delta_e:.1f}). Expected palette: {", ".join(brand_colors[:5])}.',
                "confidence": 0.85,
                "verified": True,
            })
    return findings


def _logo_check(img, logo_assets: list[BrandAsset], file_path: str, w: int, h: int) -> list[dict]:
    """Multi-scale template matching for brand logos in the submission image."""
    import cv2

    findings = []
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    for asset in logo_assets:
        if not asset.file_path or not os.path.exists(asset.file_path):
            continue
        template_orig = cv2.imread(asset.file_path, cv2.IMREAD_GRAYSCALE)
        if template_orig is None:
            continue

        th_orig, tw_orig = template_orig.shape[:2]
        best_val = -1.0
        best_loc = (0, 0)
        best_w, best_h = tw_orig, th_orig

        # Multi-scale pyramid search for robust logo recognition
        scales = [0.4, 0.6, 0.8, 1.0, 1.25, 1.5]
        for scale in scales:
            sw = int(tw_orig * scale)
            sh = int(th_orig * scale)
            if sw > w or sh > h or sw < 10 or sh < 10:
                continue
            scaled_tpl = cv2.resize(template_orig, (sw, sh), interpolation=cv2.INTER_AREA if scale < 1.0 else cv2.INTER_LINEAR)
            result = cv2.matchTemplate(gray, scaled_tpl, cv2.TM_CCOEFF_NORMED)
            _, max_val, _, max_loc = cv2.minMaxLoc(result)
            if max_val > best_val:
                best_val = max_val
                best_loc = max_loc
                best_w = sw
                best_h = sh

        if best_val < 0.65:
            findings.append({
                "type": FindingType.logo,
                "severity": Severity.high,
                "start": None, "end": None,
                "flagged_text": "",
                "message": f'Approved brand logo "{asset.name}" not detected in creative (peak confidence: {max(0.0, best_val):.2f}). Ensure the official vector/asset logo is positioned correctly.',
                "confidence": round(1.0 - max(0.0, best_val), 2),
                "verified": True,
                "region": {
                    "x": int(best_loc[0]),
                    "y": int(best_loc[1]),
                    "w": int(best_w),
                    "h": int(best_h),
                    "img_w": w,
                    "img_h": h,
                } if best_val > 0.3 else None,
            })
    return findings
