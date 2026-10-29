"""
The review pipeline. Runs as a FastAPI BackgroundTask after submission.

  Step 1  Rule engine (deterministic text checks)
  Step 2  AI checks: RAG claim judge + tone (LLM)
  Step 3  Evidence verifier (removes false positives)
  Step 4  Fix generator (AI-suggested corrections)
  Step 5  Vision checks (images: OCR, contrast, palette, logo)
"""
import logging
import os

from sqlalchemy import select

from app.db import SessionLocal
from app.models import BrandRule, Finding, FindingRegion, Fix, Submission, SubmissionStatus
from app.services.accessibility import check_accessibility
from app.services.ai_checks import run_ai_checks
from app.services.audit import log_action
from app.services.fixer import generate_fixes
from app.services.llm import llm_available
from app.services.rule_engine import exempt_spans, inside_exempt, run_rule_checks, merge_findings
from app.services.verifier import verify_findings
from app.services.vision import IMAGE_EXT, NO_TEXT, run_vision_checks

log = logging.getLogger("brandguard.pipeline")


def _save_findings(db, submission: Submission, raw_findings: list[dict]):
    for r in raw_findings:
        finding = Finding(
            submission_id=submission.id,
            type=r["type"],
            severity=r["severity"],
            start_offset=r.get("start"),
            end_offset=r.get("end"),
            flagged_text=r.get("flagged_text", ""),
            message=r["message"],
            rule_id=r.get("rule_id"),
            evidence_chunk_id=r.get("evidence_chunk_id"),
            evidence_quote=r.get("evidence_quote"),
            confidence=r.get("confidence", 1.0),
            verified=r.get("verified", True),
        )
        if r.get("fix_text") is not None:
            finding.fix = Fix(
                original_text=r.get("flagged_text", ""),
                suggested_text=r["fix_text"],
                rationale=r.get("fix_rationale") or r["message"],
            )
        if r.get("region"):
            finding.region = FindingRegion(**r["region"])
        db.add(finding)


def run_review(submission_id: int):
    db = SessionLocal()
    try:
        sub = db.get(Submission, submission_id)
        if not sub:
            return

        # Clean slate (safe for /rerun too)
        for f in list(sub.findings):
            db.delete(f)
        sub.status = SubmissionStatus.processing
        db.commit()

        text = sub.current_text
        sub.original_text = text
        is_image = bool(sub.file_path) and os.path.splitext(sub.file_path)[1].lower() in IMAGE_EXT
        has_text = not text.startswith(NO_TEXT)

        rules = list(db.scalars(
            select(BrandRule).where(
                BrandRule.org_id == sub.org_id,
                BrandRule.active.is_(True),
            )
        ))

        raw: list[dict] = []
        n_rule = 0
        dropped: list[dict] = []

        if has_text:
            # Step 1: fast deterministic checks
            raw = run_rule_checks(text, rules)
            n_rule = len(raw)

            # Step 1b: Accessibility and content quality checks
            a11y = check_accessibility(text)
            raw = merge_findings(raw, a11y)

            if llm_available():
                # Step 2: LLM checks (claims + tone)
                ai = run_ai_checks(db, sub.org_id, text)
                exempt = exempt_spans(text, rules)
                ai = [f for f in ai if not inside_exempt(f.get("start"), f.get("end"), exempt)]
                raw = merge_findings(raw, ai)

                # Step 3: evidence verifier
                try:
                    raw, dropped = verify_findings(db, sub.org_id, raw)
                except Exception:
                    log.exception("Verifier failed; keeping unverified findings")

                # Step 4: fix generator
                try:
                    raw = generate_fixes(text, raw, rules)
                except Exception:
                    log.exception("Fix generator failed; continuing without AI fixes")
            else:
                log.warning("LLM_API_KEY not set: skipping AI steps")

        # Step 5: vision checks
        vision: list[dict] = []
        if is_image:
            try:
                vision = run_vision_checks(db, sub.org_id, sub.file_path)
            except Exception:
                log.exception("Vision checks failed")
        raw = raw + vision

        _save_findings(db, sub, raw)
        sub.status = SubmissionStatus.in_review
        log_action(db, "review_completed", sub.id, {
            "findings": len(raw),
            "rule_findings": n_rule,
            "ai_findings": len(raw) - n_rule - len(vision),
            "vision_findings": len(vision),
            "dropped_by_verifier": len(dropped),
        }, org_id=sub.org_id, user_id=sub.user_id)
        db.commit()

    except Exception:
        log.exception("Review failed for submission %s", submission_id)
        db.rollback()
        sub = db.get(Submission, submission_id)
        if sub:
            sub.status = SubmissionStatus.failed
            log_action(db, "review_failed", sub.id, org_id=sub.org_id, user_id=sub.user_id)
            db.commit()
    finally:
        db.close()
