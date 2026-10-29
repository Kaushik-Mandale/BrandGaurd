"""Audit log helper with multi-tenant support."""
import logging
from sqlalchemy.orm import Session
from app.models import AuditLog
from app.seed import DEMO_ORG_ID

log = logging.getLogger("brandguard.audit")


def log_action(
    db: Session,
    action: str,
    submission_id: int | None = None,
    details: dict | None = None,
    org_id: int | None = None,
    user_id: int | None = None,
):
    entry = AuditLog(
        org_id=org_id or DEMO_ORG_ID,
        submission_id=submission_id,
        user_id=user_id,
        action=action,
        details=details or {},
    )
    db.add(entry)
    # Caller commits transaction
