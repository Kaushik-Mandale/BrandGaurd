"""
Vision analysis: OCR, multi-scale logo detection, and CIELAB perceptual color checks.

Capabilities:
1. Multi-scale template matching for brand logos with peak confidence & detected bounding box.
2. Perceptual CIELAB Delta E (CIE76) dominant color extraction vs registered brand palettes.
3. OCR text extraction with bounding boxes via pytesseract (with graceful fallback).
4. WCAG AA Contrast ratio calculations (4.5:1 normal text, 3.0:1 large text).
"""
import logging
import os
from pathlib import Path
from sqlalchemy.orm import Session
from app.config import settings
from app.models import BrandAsset, FindingType, Severity

log = logging.getLogger("brandguard.vision")

IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp", ".bmp"}
NO_TEXT = "[NO_TEXT_LAYER]"


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


def relative_luminance(r: int, g: int, b: int) -> float:
    """Calculate relative luminance for WCAG contrast ratio."""
    def channel_lum(c: int) -> float:
        s = c / 255.0
        return s / 12.92 if s <= 0.03928 else ((s + 0.055) / 1.055) ** 2.4

    return 0.2126 * channel_lum(r) + 0.7152 * channel_lum(g) + 0.0722 * channel_lum(b)


def contrast_ratio(rgb1: tuple[int, int, int], rgb2: tuple[int, int, int]) -> float:
    """Calculate standard WCAG contrast ratio between two RGB colors (1:1 to 21:1)."""
    l1 = relative_luminance(*rgb1)
    l2 = relative_luminance(*rgb2)
    lighter = max(l1, l2)
    darker = min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)


def _ocr_and_contrast_check(img, w: int, h: int) -> list[dict]:
    """
    Extracts text bounding boxes and checks WCAG contrast between foreground text
    and immediate background region.
    """
    findings = []
    try:
        import cv2
        import numpy as np
        import pytesseract

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # 1. OCR bounding boxes
        try:
            ocr_data = pytesseract.image_to_data(gray, output_type=pytesseract.Output.DICT)
            n_boxes = len(ocr_data.get("text", []))

            for i in range(n_boxes):
                word = ocr_data["text"][i].strip()
                conf = float(ocr_data.get("conf", [0])[i])
                if len(word) >= 3 and conf >= 40:
                    bx, by, bw, bh = (
                        int(ocr_data["left"][i]),
                        int(ocr_data["top"][i]),
                        int(ocr_data["width"][i]),
                        int(ocr_data["height"][i]),
                    )
                    if bw > 5 and bh > 5 and bx + bw <= w and by + bh <= h:
                        crop = gray[by : by + bh, bx : bx + bw]
                        if crop.size > 0:
                            # Estimate foreground vs background from otsu threshold
                            _, thresh = cv2.threshold(crop, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
                            fg_mask = thresh == 255
                            bg_mask = thresh == 0
                            if np.sum(fg_mask) > 0 and np.sum(bg_mask) > 0:
                                fg_val = int(np.mean(crop[fg_mask]))
                                bg_val = int(np.mean(crop[bg_mask]))
                                ratio = contrast_ratio((fg_val, fg_val, fg_val), (bg_val, bg_val, bg_val))
                                if ratio < settings.VISION_WCAG_AA_NORMAL_RATIO:
                                    findings.append({
                                        "type": FindingType.contrast,
                                        "severity": Severity.medium if ratio >= 3.0 else Severity.high,
                                        "start": None,
                                        "end": None,
                                        "flagged_text": word,
                                        "message": (
                                            f"WCAG AA contrast failure on text '{word}': "
                                            f"measured contrast is {ratio:.1f}:1 (minimum required: 4.5:1 for normal copy)."
                                        ),
                                        "confidence": round(conf / 100.0, 2),
                                        "verified": True,
                                        "region": {
                                            "x": bx,
                                            "y": by,
                                            "w": bw,
                                            "h": bh,
                                            "img_w": w,
                                            "img_h": h,
                                        },
                                    })
                                    if len(findings) >= 3:  # Cap at top 3 region-specific warnings
                                        break
        except Exception as ocr_err:
            log.debug("Detailed OCR bounding box extraction skipped: %s", ocr_err)

        # 2. Global contrast heuristic fallback if no bounding box findings
        if not findings:
            std = float(np.std(gray))
            if std < 30.0:
                findings.append({
                    "type": FindingType.contrast,
                    "severity": Severity.medium,
                    "start": None,
                    "end": None,
                    "flagged_text": "Overall Creative Surface",
                    "message": (
                        f"Low contrast detected: luminance standard deviation σ={std:.1f}. "
                        "Text elements may be difficult to read; ensure copy maintains at least 4.5:1 contrast against backdrops."
                    ),
                    "confidence": 0.85,
                    "verified": True,
                    "region": {"x": 0, "y": 0, "w": w, "h": h, "img_w": w, "img_h": h},
                })

    except Exception as exc:
        log.debug("Contrast check failed: %s", exc)

    return findings


def _palette_check(img, assets: list[BrandAsset], w: int, h: int) -> list[dict]:
    """Check dominant image colors against registered brand palette using CIELAB Delta E."""
    import cv2
    import numpy as np

    findings = []
    threshold = settings.VISION_DELTA_E_THRESHOLD

    for asset in assets:
        brand_colors = asset.data.get("colors", [])
        if not brand_colors:
            continue

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

        # K-Means dominant color extraction
        data = img.reshape(-1, 3).astype(np.float32)
        k = min(5, data.shape[0])
        _, labels, centers = cv2.kmeans(
            data,
            k,
            None,
            (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 10, 1.0),
            3,
            cv2.KMEANS_RANDOM_CENTERS,
        )
        dominant_rgbs = [tuple(int(c) for c in center[::-1]) for center in centers]  # BGR -> RGB

        matched = False
        min_delta_e = float("inf")
        closest_brand_color = brand_colors[0]

        for dom_rgb in dominant_rgbs:
            dom_lab = rgb_to_lab(dom_rgb[0], dom_rgb[1], dom_rgb[2])
            for idx, b_lab in enumerate(brand_labs):
                de = delta_e_cielab(dom_lab, b_lab)
                if de < min_delta_e:
                    min_delta_e = de
                    closest_brand_color = brand_colors[idx]
                if de <= threshold:
                    matched = True
                    break
            if matched:
                break

        if not matched:
            findings.append({
                "type": FindingType.palette,
                "severity": Severity.medium,
                "start": None,
                "end": None,
                "flagged_text": f"Creative Palette (Nearest: {closest_brand_color})",
                "message": (
                    f"Off-brand colors detected. Minimum perceptual distance to approved palette "
                    f"is CIELAB ΔE={min_delta_e:.1f} (acceptable tolerance threshold is ΔE ≤ {threshold}). "
                    f"Approved brand colors: {', '.join(brand_colors[:5])}."
                ),
                "confidence": 0.88,
                "verified": True,
                "region": {"x": 0, "y": 0, "w": w, "h": h, "img_w": w, "img_h": h},
            })

    return findings


def _logo_check(img, logo_assets: list[BrandAsset], file_path: str, w: int, h: int) -> list[dict]:
    """Multi-scale template matching for brand logos with region detection."""
    import cv2

    findings = []
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    threshold = settings.VISION_LOGO_THRESHOLD

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

        # Multi-scale pyramid search
        scales = [0.35, 0.5, 0.7, 0.85, 1.0, 1.25, 1.5]
        for scale in scales:
            sw = int(tw_orig * scale)
            sh = int(th_orig * scale)
            if sw > w or sh > h or sw < 12 or sh < 12:
                continue
            scaled_tpl = cv2.resize(
                template_orig,
                (sw, sh),
                interpolation=cv2.INTER_AREA if scale < 1.0 else cv2.INTER_LINEAR,
            )
            result = cv2.matchTemplate(gray, scaled_tpl, cv2.TM_CCOEFF_NORMED)
            _, max_val, _, max_loc = cv2.minMaxLoc(result)
            if max_val > best_val:
                best_val = max_val
                best_loc = max_loc
                best_w = sw
                best_h = sh

        if best_val < threshold:
            findings.append({
                "type": FindingType.logo,
                "severity": Severity.high,
                "start": None,
                "end": None,
                "flagged_text": f"Logo: {asset.name}",
                "message": (
                    f"Approved brand logo '{asset.name}' was not detected in the creative "
                    f"(match confidence: {max(0.0, best_val):.2f}, required: {threshold}). "
                    "Ensure the registered vector or raster brand mark is present and unobstructed."
                ),
                "confidence": round(1.0 - max(0.0, best_val), 2),
                "verified": True,
                "region": {
                    "x": int(best_loc[0]),
                    "y": int(best_loc[1]),
                    "w": int(best_w),
                    "h": int(best_h),
                    "img_w": w,
                    "img_h": h,
                } if best_val >= 0.3 else None,
            })

    return findings


# Backwards-compatible alias used in tests
_contrast_check = _ocr_and_contrast_check


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


def run_vision_checks(db: Session, org_id: int, file_path: str) -> list[dict]:
    """Execute complete vision compliance pipeline on an uploaded creative."""
    try:
        import cv2
    except ImportError:
        log.warning("OpenCV not available: skipping vision checks")
        return []

    if not file_path or not os.path.exists(file_path):
        log.warning("Image file does not exist: %s", file_path)
        return []

    findings = []
    try:
        img = cv2.imread(file_path)
    except Exception as e:
        log.warning("Corrupted image file: %s (%s)", file_path, e)
        return []

    if img is None:
        log.warning("Could not read image file: %s", file_path)
        return []

    h, w = img.shape[:2]
    if h == 0 or w == 0:
        return []

    # 1. OCR text extraction & WCAG contrast analysis
    try:
        findings += _ocr_and_contrast_check(img, w, h)
    except Exception as exc:
        log.warning("Contrast/OCR check failed: %s", exc)

    # 2. CIELAB brand color palette comparison
    try:
        palette_assets = db.query(BrandAsset).filter_by(org_id=org_id, kind="palette").all()
        if palette_assets:
            findings += _palette_check(img, palette_assets, w, h)
    except Exception as exc:
        log.warning("Palette check failed: %s", exc)

    # 3. Registered logo matching
    try:
        logo_assets = db.query(BrandAsset).filter_by(org_id=org_id, kind="logo").all()
        if logo_assets:
            findings += _logo_check(img, logo_assets, file_path, w, h)
    except Exception as exc:
        log.warning("Logo check failed: %s", exc)

    return findings
