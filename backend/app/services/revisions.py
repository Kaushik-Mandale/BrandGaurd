"""Persist immutable snapshots whenever submitted content changes."""
from sqlalchemy.orm import Session

from app.models import Submission, SubmissionRevision


def snapshot_initial_version(
    db: Session,
    submission: Submission,
    text: str,
    user_id: int | None,
    reason: str = "Submission created",
) -> None:
    if not any(revision.version == submission.version for revision in submission.revisions):
        db.add(SubmissionRevision(
            submission_id=submission.id,
            version=submission.version,
            text=text,
            reason=reason,
            created_by=user_id,
        ))


def record_content_change(
    db: Session,
    submission: Submission,
    new_text: str,
    user_id: int | None,
    reason: str,
    previous_text: str | None = None,
) -> bool:
    old_text = submission.current_text if previous_text is None else previous_text
    if old_text == new_text:
        return False

    snapshot_initial_version(db, submission, old_text, user_id, "Previous content snapshot")
    submission.version = (submission.version or 1) + 1
    submission.original_text = new_text
    submission.current_text = new_text
    submission.approved_text = None
    db.add(SubmissionRevision(
        submission_id=submission.id,
        version=submission.version,
        text=new_text,
        reason=reason[:300],
        created_by=user_id,
    ))
    return True
