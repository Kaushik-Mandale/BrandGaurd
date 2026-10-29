"""Combines claim checks and tone checks into one AI analysis pass."""
import logging
from sqlalchemy.orm import Session

from app.services.rag_judge import run_claim_checks
from app.services.tone import run_tone_checks
from app.services.rule_engine import merge_findings

log = logging.getLogger("brandguard.ai_checks")


def run_ai_checks(db: Session, org_id: int, text: str) -> list[dict]:
    """Run all AI-based checks and return combined findings."""
    claim_findings = run_claim_checks(db, org_id, text)
    tone_findings = run_tone_checks(text)
    return merge_findings(claim_findings, tone_findings)
