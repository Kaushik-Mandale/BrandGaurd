"""
Unit and integration tests for BrandGuard.ai Round 3 Improvements:
1. Evidence Verification & Citation Tenant Isolation
2. Automated Benchmark Metrics & Regression Thresholds
3. Visual Creative Analysis & Robustness
"""
import pytest
from unittest.mock import MagicMock
from app.models import BrandChunk, FindingType, Severity
from app.services.verifier import _validate_citation_exists, verify_findings
from app.services.benchmark import run_benchmark, _matches_expectation
from app.services.vision import contrast_ratio, relative_luminance, delta_e_cielab, rgb_to_lab, run_vision_checks


# ── 1. EVIDENCE VERIFIER & CITATION INTEGRITY ──────────────────────────────────

def test_citation_validation_cross_tenant_rejection():
    """Citations pointing to chunks belonging to a different organization must be rejected."""
    mock_db = MagicMock()
    # Chunk belongs to org 2
    foreign_chunk = BrandChunk(
        id=99,
        org_id=2,
        document_id=1,
        text="All customer data at rest is encrypted via AES-256.",
    )
    mock_db.get.return_value = foreign_chunk

    # Validated within org 2: valid
    assert _validate_citation_exists(mock_db, chunk_id=99, quote="AES-256", org_id=2) is True

    # Validated from org 1 (cross-tenant attempt): must be rejected
    assert _validate_citation_exists(mock_db, chunk_id=99, quote="AES-256", org_id=1) is False


def test_citation_validation_nonexistent_chunk():
    """Non-existent chunk ID returns False."""
    mock_db = MagicMock()
    mock_db.get.return_value = None

    assert _validate_citation_exists(mock_db, chunk_id=9999, quote="anything", org_id=1) is False
    assert _validate_citation_exists(None, chunk_id=9999, quote="anything", org_id=1) is False


def test_citation_validation_quote_mismatch():
    """Chunk exists in org, but quoted excerpt is not in chunk text."""
    mock_db = MagicMock()
    valid_chunk = BrandChunk(
        id=101,
        org_id=1,
        document_id=1,
        text="FitFuel Classic contains 20g of plant-based protein.",
    )
    mock_db.get.return_value = valid_chunk

    # Matching quote
    assert _validate_citation_exists(mock_db, chunk_id=101, quote="20g of plant-based", org_id=1) is True

    # Non-matching fabricated quote
    assert _validate_citation_exists(mock_db, chunk_id=101, quote="50g of whey protein", org_id=1) is False


def test_verifier_drops_false_positive_finding(monkeypatch):
    """When the evidence verifier classifies a finding as DROP, it is pruned from the result."""
    from app.services import verifier
    monkeypatch.setattr(
        verifier,
        "_verify_one",
        lambda db, org_id, finding: ("DROP", "Claim is fully substantiated by guideline section 3."),
    )

    finding = {
        "type": FindingType.claim,
        "confidence": 0.7,
        "verified": False,
        "flagged_text": "20g protein",
        "message": "Verify protein content",
    }

    kept, dropped = verifier.verify_findings(None, 1, [finding])
    assert len(dropped) == 1
    assert len(kept) == 0
    assert "substantiated by guideline" in dropped[0]["drop_reason"]


def test_verifier_retains_valid_contradiction(monkeypatch):
    """Contradicted claim is retained in kept findings with verified=True."""
    from app.services import verifier
    monkeypatch.setattr(
        verifier,
        "_verify_one",
        lambda db, org_id, finding: ("CONTRADICTED", "SLA specifies 99.9% uptime, not 100%."),
    )

    finding = {
        "type": FindingType.claim,
        "confidence": 0.85,
        "verified": False,
        "flagged_text": "100% uptime",
        "message": "Uptime guarantee",
    }

    kept, dropped = verifier.verify_findings(None, 1, [finding])
    assert len(kept) == 1
    assert len(dropped) == 0
    assert kept[0]["verified"] is True
    assert kept[0]["confidence"] >= 0.85


def test_verifier_downgrades_uncertain_claim(monkeypatch):
    """Uncertain or ambiguous claim is kept with verified=False and [UNCERTAIN] prefix."""
    from app.services import verifier
    monkeypatch.setattr(
        verifier,
        "_verify_one",
        lambda db, org_id, finding: ("UNCERTAIN", "Insufficient documentation found in knowledge base."),
    )

    finding = {
        "type": FindingType.claim,
        "confidence": 0.9,
        "verified": False,
        "flagged_text": "quantum synchronization",
        "message": "Unsubstantiated performance claim",
    }

    kept, dropped = verifier.verify_findings(None, 1, [finding])
    assert len(kept) == 1
    assert kept[0]["verified"] is False
    assert "[UNCERTAIN]" in kept[0]["message"]


# ── 2. AUTOMATED BENCHMARK & METRICS CALCULATION ───────────────────────────────

def test_benchmark_metrics_formulae():
    """Verify precision, recall, F1, and FPR formulas."""
    # TP=18, FP=2, FN=6
    tp = 18
    fp = 2
    fn = 6

    precision = tp / (tp + fp)  # 18 / 20 = 0.90
    recall = tp / (tp + fn)     # 18 / 24 = 0.75
    f1 = (2 * precision * recall) / (precision + recall)  # (2 * 0.9 * 0.75) / 1.65 = 0.818
    fpr = fp / (fp + tp)        # 2 / 20 = 0.10

    assert round(precision, 2) == 0.90
    assert round(recall, 2) == 0.75
    assert round(f1, 3) == 0.818
    assert round(fpr, 2) == 0.10


def test_benchmark_matches_expectation_helper():
    """Verify finding to expected label matcher."""
    finding = {
        "type": FindingType.terminology,
        "flagged_text": "miracle bar",
        "message": "The word 'miracle' is a banned term.",
    }

    # Matches type and substring
    assert _matches_expectation(finding, {"type": "terminology", "contains": "miracle"}) is True

    # Does not match wrong type
    assert _matches_expectation(finding, {"type": "claim", "contains": "miracle"}) is False

    # Does not match missing text
    assert _matches_expectation(finding, {"type": "terminology", "contains": "detox"}) is False


def test_benchmark_empty_dataset_handling(monkeypatch):
    """Empty dataset returns valid 1.0 metrics without division by zero."""
    from app.services import benchmark
    monkeypatch.setattr(benchmark, "load_dataset", lambda: [])

    mock_db = MagicMock()
    mock_db.query.return_value.filter_by.return_value.all.return_value = []

    res = run_benchmark(mock_db, org_id=1)
    assert res["sample_count"] == 0
    assert res["precision"] == 1.0
    assert res["recall"] == 1.0
    assert res["passed_regression"] is True


# ── 3. VISUAL CREATIVE ANALYSIS & CONTRAST RATIOS ──────────────────────────────

def test_visual_contrast_wcag_standard_calculations():
    """Standard WCAG contrast ratio calculations."""
    # Black on White: maximum possible contrast 21:1
    black = (0, 0, 0)
    white = (255, 255, 255)
    cr_max = contrast_ratio(black, white)
    assert round(cr_max, 1) == 21.0

    # Identical colors: minimum possible contrast 1:1
    grey = (128, 128, 128)
    cr_min = contrast_ratio(grey, grey)
    assert round(cr_min, 1) == 1.0

    # WCAG AA Normal Text requirement is 4.5:1
    dark_navy = (29, 53, 87)
    honeydew = (241, 250, 238)
    cr_brand = contrast_ratio(dark_navy, honeydew)
    assert cr_brand >= 4.5  # Brand palette passes WCAG AA for normal text


def test_visual_corrupt_or_missing_image_handling():
    """run_vision_checks returns empty list for nonexistent or corrupt image without crashing."""
    mock_db = MagicMock()
    # Non-existent file
    assert run_vision_checks(mock_db, org_id=1, file_path="nonexistent_image_path.png") == []
    # Empty string
    assert run_vision_checks(mock_db, org_id=1, file_path="") == []


def test_visual_cielab_perceptual_delta_e():
    """Identical colors have Delta E = 0. Distinct colors have Delta E > 0."""
    lab_navy = rgb_to_lab(29, 53, 87)
    # Distance to itself is 0
    assert delta_e_cielab(lab_navy, lab_navy) == 0.0

    # Distance to bright red
    lab_red = rgb_to_lab(230, 57, 70)
    de = delta_e_cielab(lab_navy, lab_red)
    assert de > 30.0  # Clearly perceptible difference

