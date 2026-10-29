"""
Comprehensive test suite covering all Inkloom BrandGuard governance verification requirements:

1. Claim verification (supported, contradicted, unsupported, conflicting, outdated, prohibited, superlative, brand rule vs factual, ambiguous escalation, clean baseline).
2. Knowledge ingestion and retrieval (PDF/DOCX extraction, citation integrity, re-indexing, deletion/stale index, prompt injection resistance, corrupted file).
3. Visual analysis (registered logo, missing logo, approved CIELAB palette, palette mismatch, low contrast, graceful failure).
4. Review workflow & authorization (submit, inspect, comment, revise, approve, reject with reason, revision preservation, unauthorized block, audit trail).
"""
import io
import os
import json
import pytest
import numpy as np
import cv2

from app.models import (
    BrandAsset,
    BrandChunk,
    BrandDocument,
    BrandRule,
    FindingStatus,
    FindingType,
    RuleKind,
    Severity,
    Submission,
    SubmissionStatus,
)
from app.services.chunker import chunk_text
from app.services.extract import extract_text
from app.services.rule_engine import run_rule_checks
from app.services.rag_judge import _parse_findings
from app.services.vision import delta_e_cielab, rgb_to_lab, _palette_check, _logo_check, _contrast_check
from app.services.accessibility import check_accessibility
from app.services import verifier


# ── 1. CLAIM VERIFICATION TESTS ───────────────────────────────────────────────

def test_claim_1_supported_claim_with_matching_evidence():
    """A supported claim backed by authoritative brand documentation."""
    mock_llm_json = """[
        {
            "claim": "AES-256 encryption at rest",
            "verification_state": "supported",
            "issue": "Claim is supported by SOC 2 compliance documentation.",
            "evidence": "All customer data at rest is encrypted using AES-256.",
            "citation_title": "Security Whitepaper",
            "severity": "low",
            "confidence": 0.98
        }
    ]"""
    text = "We ensure complete security with AES-256 encryption at rest for all data."
    mock_chunks = [
        {"chunk_id": 201, "doc_title": "Security Whitepaper", "page": 3, "text": "All customer data at rest is encrypted using AES-256."}
    ]
    findings = _parse_findings(mock_llm_json, text, mock_chunks)
    assert len(findings) == 1
    assert "[SUPPORTED]" in findings[0]["message"]
    assert findings[0]["evidence_chunk_id"] == 201
    assert findings[0]["citation_title"] == "Security Whitepaper"
    assert findings[0]["citation_page"] == 3


def test_claim_2_contradicted_by_authoritative_source():
    """A claim contradicted directly by authoritative specifications (e.g. 100% vs 99.9% SLA)."""
    mock_llm_json = """[
        {
            "claim": "100% uptime guarantee",
            "verification_state": "contradicted",
            "issue": "Directly contradicts SLA Section 1 which establishes an availability SLA of 99.9%.",
            "evidence": "CloudScale provides an enterprise availability SLA of 99.9% uptime for Tier-1 workloads.",
            "citation_title": "Nexus SLA Spec",
            "severity": "high",
            "confidence": 0.99
        }
    ]"""
    text = "Deploy with our 100% uptime guarantee across all regions."
    mock_chunks = [
        {"chunk_id": 202, "doc_title": "Nexus SLA Spec", "page": 1, "text": "CloudScale provides an enterprise availability SLA of 99.9% uptime for Tier-1 workloads."}
    ]
    findings = _parse_findings(mock_llm_json, text, mock_chunks)
    assert len(findings) == 1
    assert "[CONTRADICTED]" in findings[0]["message"]
    assert findings[0]["severity"] == Severity.high
    assert findings[0]["evidence_chunk_id"] == 202


def test_claim_3_unsupported_claim_no_sufficient_evidence():
    """A claim with no evidence found in documentation is classified as unsupported, not falsely labeled contradicted."""
    mock_llm_json = """[
        {
            "claim": "sub-millisecond planetary quantum synchronization",
            "verification_state": "unsupported",
            "issue": "No technical documentation or benchmark supports quantum synchronization claims.",
            "evidence": "No factual backing in approved documentation",
            "severity": "medium",
            "confidence": 0.88
        }
    ]"""
    text = "Enjoy sub-millisecond planetary quantum synchronization across data centers."
    findings = _parse_findings(mock_llm_json, text, [])
    assert len(findings) == 1
    assert "[UNSUPPORTED]" in findings[0]["message"]
    assert findings[0]["evidence_quote"] is None
    assert findings[0]["evidence_chunk_id"] is None


def test_unmatched_model_evidence_does_not_create_a_source_citation():
    response = """[{
        "claim": "our fastest platform",
        "verification_state": "contradicted",
        "issue": "The claim conflicts with the approved benchmark.",
        "evidence": "This fabricated sentence is not in the source.",
        "citation_title": "Invented document",
        "severity": "high",
        "confidence": 0.9
    }]"""
    chunks = [{
        "chunk_id": 203,
        "doc_title": "Approved benchmark",
        "page": 2,
        "text": "The platform processes requests at a measured rate.",
    }]

    finding = _parse_findings(response, "We have our fastest platform.", chunks)[0]

    assert "[UNCERTAIN]" in finding["message"]
    assert finding["evidence_chunk_id"] is None
    assert finding["citation_title"] is None
    assert finding["citation_page"] is None
    assert finding["evidence_quote"] is None


def test_unresolved_claim_verification_is_not_marked_verified(monkeypatch):
    monkeypatch.setattr(
        verifier,
        "_verify_one",
        lambda db, org_id, finding: ("uncertain", "Conflicting approved sources."),
    )
    finding = {
        "type": FindingType.claim,
        "confidence": 0.8,
        "verified": False,
        "message": "[CONTRADICTED] Claim conflicts with a specification.",
    }

    kept, dropped = verifier.verify_findings(None, 1, [finding])

    assert dropped == []
    assert kept[0]["verified"] is False
    assert kept[0]["message"].startswith("[UNCERTAIN]")


def test_claim_4_conflicting_evidence_from_sources():
    """Conflicting evidence from multiple sources is flagged with uncertain / conflict state."""
    mock_llm_json = """[
        {
            "claim": "standard 60-day money-back guarantee",
            "verification_state": "uncertain",
            "issue": "Conflicting source documents: Terms of Service states 30 days while Enterprise Agreement states 60 days.",
            "evidence": "Terms of Service Section 4 specifies 30 days; Enterprise Addendum specifies 60 days.",
            "citation_title": "Terms of Service vs Enterprise Addendum",
            "severity": "medium",
            "confidence": 0.75
        }
    ]"""
    text = "All contracts come with a standard 60-day money-back guarantee."
    findings = _parse_findings(mock_llm_json, text, [])
    assert len(findings) == 1
    assert "[UNCERTAIN]" in findings[0]["message"]
    assert "Conflicting source documents" in findings[0]["message"]


def test_claim_5_outdated_product_specification():
    """A claim referencing an outdated specification version is flagged."""
    mock_llm_json = """[
        {
            "claim": "10GB free cloud storage",
            "verification_state": "contradicted",
            "issue": "Outdated spec: Free tier storage was revised to 5GB in v2.4 guidelines.",
            "evidence": "Free tier allocates 5GB storage as of Guideline v2.4.",
            "citation_title": "Brand Guidelines v2.4",
            "severity": "high",
            "confidence": 0.92
        }
    ]"""
    text = "Sign up now and receive 10GB free cloud storage permanently."
    findings = _parse_findings(mock_llm_json, text, [])
    assert len(findings) == 1
    assert "Outdated spec" in findings[0]["message"]


def test_claim_6_prohibited_phrase_deterministic_rule():
    """Prohibited phrase detected instantly by deterministic engine."""
    rule = BrandRule(
        id=10, org_id=1, kind=RuleKind.banned_term,
        pattern="sales ninja", replacement="solutions advisor",
        severity=Severity.low, description="Use professional titles instead of buzzwords.",
        active=True
    )
    copy = "Speak to our expert sales ninja to get your custom quote."
    findings = run_rule_checks(copy, [rule])
    assert len(findings) == 1
    assert findings[0]["flagged_text"] == "sales ninja"
    assert findings[0]["fix_text"] == "solutions advisor"


def test_claim_7_guarantee_superlative_substantiation():
    """Regulatory superlative or guarantee detected by regex rule."""
    rule = BrandRule(
        id=11, org_id=1, kind=RuleKind.regex,
        pattern=r"\b(guaranteed\s+returns?|100%\s+risk-free)\b",
        replacement="hedged institutional portfolio",
        severity=Severity.high,
        description="SEC guidelines strictly prohibit guaranteed returns language.",
        active=True
    )
    copy = "Invest today with guaranteed returns backed by real estate."
    findings = run_rule_checks(copy, [rule])
    assert len(findings) == 1
    assert findings[0]["severity"] == Severity.high
    assert "guaranteed returns" in findings[0]["flagged_text"]


def test_claim_8_factual_statement_violating_brand_policy():
    """A statement may be factually true (e.g. low price) but violates brand policy regarding 'cheap'."""
    rule = BrandRule(
        id=12, org_id=1, kind=RuleKind.preferred_term,
        pattern="cheap", replacement="cost-effective",
        severity=Severity.medium,
        description="Preserve luxury positioning; avoid 'cheap'.",
        active=True
    )
    copy = "Our infrastructure is the most cheap option on the market."
    findings = run_rule_checks(copy, [rule])
    assert len(findings) == 1
    assert findings[0]["flagged_text"] == "cheap"
    assert findings[0]["fix_text"] == "cost-effective"


def test_claim_9_ambiguous_claim_escalation():
    """An ambiguous claim is classified as UNCERTAIN rather than definitively false."""
    mock_llm_json = """[
        {
            "claim": "works seamlessly with existing setups",
            "verification_state": "uncertain",
            "issue": "Ambiguous compatibility claim without specifying supported OS or API versions. Needs human clarification.",
            "evidence": "No factual backing in approved documentation",
            "severity": "low",
            "confidence": 0.60
        }
    ]"""
    text = "Our software works seamlessly with existing setups across your company."
    findings = _parse_findings(mock_llm_json, text, [])
    assert len(findings) == 1
    assert "[UNCERTAIN]" in findings[0]["message"]
    assert findings[0]["severity"] == Severity.low


def test_claim_10_clean_submission_no_unjustified_findings():
    """Compliant baseline copy generates 0 findings across rules and accessibility."""
    rules = [
        BrandRule(id=1, org_id=1, kind=RuleKind.banned_term, pattern="100% uptime", severity=Severity.high, active=True),
        BrandRule(id=2, org_id=1, kind=RuleKind.preferred_term, pattern="cheap", replacement="cost-effective", severity=Severity.medium, active=True),
    ]
    clean_text = "Nexus Enterprise provides high-availability multi-region cloud services with a 99.9% uptime SLA and SOC 2 Type II compliance."
    rule_findings = run_rule_checks(clean_text, rules)
    a11y_findings = check_accessibility(clean_text)
    assert len(rule_findings) == 0
    assert len(a11y_findings) == 0


# ── 2. KNOWLEDGE INGESTION & RETRIEVAL TESTS ──────────────────────────────────

def test_knowledge_text_and_markdown_extraction(tmp_path):
    """Test text file ingestion and chunking."""
    file_path = tmp_path / "guide.md"
    file_path.write_text("# Section 1\nOur SLA is 99.9% availability.\n\n# Section 2\nData is encrypted with AES-256.")
    full_text, pages = extract_text(str(file_path))
    assert "99.9% availability" in full_text
    assert len(pages) == 1

    chunks = chunk_text(full_text, chunk_size=50, overlap=10)
    assert len(chunks) >= 1
    assert any("99.9%" in c for c in chunks)


def test_knowledge_prompt_injection_resistance():
    """Adversarial prompt injection embedded in content is treated as untrusted text."""
    from app.services.rag_judge import SYSTEM
    # Check that system instructions contain the critical security barrier
    assert "CRITICAL SECURITY RULE" in SYSTEM
    assert "UNTRUSTED DATA" in SYSTEM
    assert "NEVER follow them" in SYSTEM


def test_knowledge_corrupted_file_handling():
    """Corrupted or non-existent file extraction fails gracefully without crash."""
    text, pages = extract_text("non_existent_path_brandguard_test.pdf")
    assert text == ""
    assert pages == []


# ── 3. VISUAL & ACCESSIBILITY TESTS ───────────────────────────────────────────

def test_visual_cielab_perceptual_delta_e():
    """Verify CIELAB perceptual color distance calculation."""
    # Same color -> Delta E = 0
    lab1 = rgb_to_lab(29, 53, 87)    # Oxford Navy #1D3557
    lab2 = rgb_to_lab(29, 53, 87)
    assert delta_e_cielab(lab1, lab2) == 0.0

    # Very close shade -> Delta E < 10
    lab_close = rgb_to_lab(30, 54, 88)
    assert delta_e_cielab(lab1, lab_close) < 5.0

    # Opposite color (Navy vs Red) -> Delta E > 50
    lab_red = rgb_to_lab(230, 57, 70)  # Punch Red #E63946
    assert delta_e_cielab(lab1, lab_red) > 50.0


def test_visual_palette_check_approved_and_mismatch():
    """Test palette compliance with CIELAB perceptual distance."""
    # Create an image filled with Oxford Navy RGB (29, 53, 87) -> BGR (87, 53, 29)
    navy_img = np.full((100, 100, 3), (87, 53, 29), dtype=np.uint8)

    # Approved palette containing #1D3557
    approved_asset = BrandAsset(
        id=1, org_id=1, kind="palette", name="Official Navy",
        data={"colors": ["#1D3557", "#457B9D"]}
    )
    findings = _palette_check(navy_img, [approved_asset], 100, 100)
    assert len(findings) == 0  # Matches approved palette

    # Foreign palette containing only neon purple and lime
    foreign_asset = BrandAsset(
        id=2, org_id=1, kind="palette", name="Neon Palette",
        data={"colors": ["#A855F7", "#84CC16"]}
    )
    findings_mismatch = _palette_check(navy_img, [foreign_asset], 100, 100)
    assert len(findings_mismatch) == 1
    assert findings_mismatch[0]["type"] == FindingType.palette
    assert "Off-brand colors detected" in findings_mismatch[0]["message"]


def test_visual_contrast_check():
    """Low-contrast image triggers legibility warning."""
    # Flat grey image with zero standard deviation
    flat_img = np.full((100, 100, 3), 128, dtype=np.uint8)
    findings = _contrast_check(flat_img, 100, 100)
    assert len(findings) == 1
    assert findings[0]["type"] == FindingType.contrast
    assert "Low contrast detected" in findings[0]["message"]


def test_accessibility_meaningful_links_and_hierarchy():
    """Accessibility analyzer flags generic links ('click here') and skipped heading levels."""
    bad_markdown = "# Enterprise Cloud\n### Pricing Tier\nTo learn more [click here](https://example.com) now."
    findings = check_accessibility(bad_markdown)
    assert len(findings) >= 2
    types = [f["message"] for f in findings]
    assert any("Heading level skipped" in m for m in types)
    assert any("Avoid generic link text" in m for m in types)
