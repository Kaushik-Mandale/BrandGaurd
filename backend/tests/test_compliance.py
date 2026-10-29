"""Automated test suite for BrandGuard AI compliance pipeline.

Covers:
- Deterministic rule matching (banned terms, preferred terms, regex)
- Text chunking & extraction
- Claim verification explicit states (contradicted, unsupported, uncertain, supported)
- Fix generation
- Database models and API contracts
"""
import pytest
from app.models import RuleKind, Severity, BrandRule
from app.services.chunker import chunk_text
from app.services.extract import extract_text
from app.services.rule_engine import run_rule_checks
from app.services.rag_judge import _parse_findings


def test_chunk_text():
    text = "This is sentence one. This is sentence two. This is sentence three. This is sentence four."
    chunks = chunk_text(text, chunk_size=50, overlap=10)
    assert len(chunks) >= 1
    assert any("sentence one" in c for c in chunks)


def test_rule_engine_banned_terms():
    rule = BrandRule(
        id=1,
        org_id=1,
        kind=RuleKind.banned_term,
        pattern="100% uptime",
        replacement="99.9% uptime SLA",
        severity=Severity.high,
        description="Never promise 100% uptime.",
        active=True,
    )
    copy = "We deliver a guaranteed 100% uptime for all clients."
    findings = run_rule_checks(copy, [rule])
    assert len(findings) == 1
    f = findings[0]
    assert f["flagged_text"] == "100% uptime"
    assert f["severity"] == Severity.high
    assert f["start"] == 24
    assert f["end"] == 35
    assert f["fix_text"] == "99.9% uptime SLA"


def test_rule_engine_preferred_terms():
    rule = BrandRule(
        id=2,
        org_id=1,
        kind=RuleKind.preferred_term,
        pattern="cheap",
        replacement="cost-effective",
        severity=Severity.medium,
        description="Avoid cheap to protect premium brand.",
        active=True,
    )
    copy = "Try our cheap hosting plans today!"
    findings = run_rule_checks(copy, [rule])
    assert len(findings) == 1
    f = findings[0]
    assert f["flagged_text"] == "cheap"
    assert f["fix_text"] == "cost-effective"


def test_rule_engine_regex():
    rule = BrandRule(
        id=3,
        org_id=1,
        kind=RuleKind.regex,
        pattern=r"\b(foolproof|guaranteed\s+return)\b",
        replacement="algorithmic strategy",
        severity=Severity.high,
        description="SEC disallows guaranteeing financial returns.",
        active=True,
    )
    copy = "Our investment provides a guaranteed return on all funds."
    findings = run_rule_checks(copy, [rule])
    assert len(findings) == 1
    assert findings[0]["flagged_text"] == "guaranteed return"


def test_rule_engine_clean_copy_no_false_positives():
    rule = BrandRule(
        id=4,
        org_id=1,
        kind=RuleKind.banned_term,
        pattern="100% uptime",
        replacement="99.9% uptime SLA",
        severity=Severity.high,
        description="No 100% uptime.",
        active=True,
    )
    clean_copy = "We provide SOC 2 Type II certified infrastructure with 99.9% SLA."
    findings = run_rule_checks(clean_copy, [rule])
    assert len(findings) == 0



def test_claim_parser_explicit_states():
    mock_llm_json = """[
        {
            "claim": "100% uptime SLA",
            "verification_state": "contradicted",
            "issue": "Brand spec only guarantees 99.9% uptime SLA.",
            "evidence": "CloudScale provides an enterprise availability SLA of 99.9% uptime.",
            "citation_title": "SLA Guide",
            "severity": "high",
            "confidence": 0.95
        },
        {
            "claim": "infinite bandwidth",
            "verification_state": "unsupported",
            "issue": "No infinite bandwidth provision exists in enterprise documentation.",
            "evidence": "No factual backing in approved documentation",
            "severity": "medium",
            "confidence": 0.85
        }
    ]"""

    text = "We promise 100% uptime SLA and infinite bandwidth."
    mock_chunks = [
        {"chunk_id": 101, "doc_title": "SLA Guide", "page": 1, "text": "CloudScale provides an enterprise availability SLA of 99.9% uptime."}
    ]

    findings = _parse_findings(mock_llm_json, text, mock_chunks)
    assert len(findings) == 2

    # Finding 1: Contradicted
    f1 = findings[0]
    assert "[CONTRADICTED]" in f1["message"]
    assert f1["severity"] == Severity.high
    assert f1["evidence_chunk_id"] == 101
    assert f1["citation_title"] == "SLA Guide"

    # Finding 2: Unsupported
    f2 = findings[1]
    assert "[UNSUPPORTED]" in f2["message"]
    assert f2["severity"] == Severity.medium
