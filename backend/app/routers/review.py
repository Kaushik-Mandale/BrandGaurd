"""Review router: accept/reject findings, edit submissions, approve/request-changes, and audit logs."""
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models import Finding, FindingStatus, Fix, Severity, Submission, SubmissionStatus, User, AuditLog
from app.schemas import AuditEntryOut, SubmissionOut
from app.services.audit import log_action
from app.services.revisions import record_content_change
from app.routers.submissions import _enrich
from app.pipeline import run_review

router = APIRouter(tags=["review"])
audit_router = APIRouter(tags=["audit"])


class AcceptBody(BaseModel):
    suggested_text: Optional[str] = None


class RejectBody(BaseModel):
    reason: Optional[str] = None


class CommentBody(BaseModel):
    text: str


class RequestChangesBody(BaseModel):
    note: str = ""


class ApproveBody(BaseModel):
    force: bool = False
    override_reason: Optional[str] = None
    reason: Optional[str] = None


class EditBody(BaseModel):
    text: str


def _get_sub(sub_id: int, db: Session, user: User) -> Submission:
    sub = db.get(Submission, sub_id)
    if not sub or sub.org_id != user.org_id or sub.user_id != user.id:
        raise HTTPException(404, "Submission not found")
    return sub


def _get_finding(sub_id: int, fid: int, db: Session) -> Finding:
    f = db.get(Finding, fid)
    if not f or f.submission_id != sub_id:
        raise HTTPException(404, "Finding not found")
    return f


def _ensure_review_ready(sub: Submission) -> None:
    if sub.status in (SubmissionStatus.pending, SubmissionStatus.processing):
        raise HTTPException(409, "Wait for the current compliance review to finish before changing decisions.")


def _recompute_current_text(sub: Submission):
    """Reconstruct current_text from original_text applying all currently accepted findings in descending offset order."""
    text = sub.original_text
    accepted = [
        f for f in sub.findings
        if f.status == FindingStatus.accepted and f.start_offset is not None and f.end_offset is not None
    ]
    accepted.sort(key=lambda x: x.start_offset, reverse=True)
    for f in accepted:
        s, e = f.start_offset, f.end_offset
        replacement = f.fix.suggested_text if f.fix else ""
        text = text[:s] + replacement + text[e:]
    sub.current_text = text


def _schedule_recheck(
    db: Session,
    sub: Submission,
    background: BackgroundTasks,
    user: User,
    reason: str,
    previous_text: str,
) -> bool:
    previous_version = sub.version or 1
    was_approved = sub.status == SubmissionStatus.approved
    changed = record_content_change(
        db, sub, sub.current_text, user.id, reason, previous_text=previous_text
    )
    if changed:
        if was_approved:
            log_action(
                db,
                "approval_invalidated",
                sub.id,
                {"previous_version": previous_version, "new_version": sub.version},
                org_id=user.org_id,
                user_id=user.id,
            )
        sub.status = SubmissionStatus.processing
        background.add_task(run_review, sub.id)
    return changed


@router.post("/submissions/{sub_id}/findings/{fid}/accept", response_model=SubmissionOut)
def accept_finding(
    sub_id: int,
    fid: int,
    background: BackgroundTasks,
    body: AcceptBody = AcceptBody(),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    sub = _get_sub(sub_id, db, user)
    _ensure_review_ready(sub)
    f = _get_finding(sub_id, fid, db)
    if f.status == FindingStatus.accepted:
        raise HTTPException(400, "Finding already accepted")

    previous_text = sub.current_text
    if body.suggested_text is not None:
        if not f.fix:
            f.fix = Fix(
                finding_id=f.id,
                original_text=f.flagged_text,
                suggested_text=body.suggested_text,
                rationale="Reviewer custom correction",
            )
            db.add(f.fix)
            db.flush()
        else:
            f.fix.suggested_text = body.suggested_text

    f.status = FindingStatus.accepted
    _recompute_current_text(sub)
    _schedule_recheck(db, sub, background, user, "Accepted correction", previous_text)
    log_action(db, "finding_accepted", sub_id, {"finding_id": fid, "type": f.type.value}, org_id=user.org_id, user_id=user.id)
    db.commit()
    db.refresh(sub)
    return _enrich(sub, db)


@router.post("/submissions/{sub_id}/findings/{fid}/reject", response_model=SubmissionOut)
def reject_finding(
    sub_id: int,
    fid: int,
    background: BackgroundTasks,
    body: RejectBody = RejectBody(),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    sub = _get_sub(sub_id, db, user)
    _ensure_review_ready(sub)
    f = _get_finding(sub_id, fid, db)
    previous_text = sub.current_text
    f.status = FindingStatus.rejected
    _recompute_current_text(sub)
    _schedule_recheck(db, sub, background, user, "Finding correction reverted", previous_text)
    log_action(
        db,
        "finding_rejected",
        sub_id,
        {"finding_id": fid, "type": f.type.value, "reason": body.reason},
        org_id=user.org_id,
        user_id=user.id,
    )
    db.commit()
    db.refresh(sub)
    return _enrich(sub, db)


@router.post("/submissions/{sub_id}/findings/{fid}/reopen", response_model=SubmissionOut)
def reopen_finding(
    sub_id: int,
    fid: int,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    sub = _get_sub(sub_id, db, user)
    _ensure_review_ready(sub)
    f = _get_finding(sub_id, fid, db)
    previous_text = sub.current_text
    f.status = FindingStatus.open
    _recompute_current_text(sub)
    _schedule_recheck(db, sub, background, user, "Finding correction reopened", previous_text)
    log_action(db, "finding_reopened", sub_id, {"finding_id": fid, "type": f.type.value}, org_id=user.org_id, user_id=user.id)
    db.commit()
    db.refresh(sub)
    return _enrich(sub, db)


@router.post("/submissions/{sub_id}/accept-all", response_model=SubmissionOut)
def accept_all(
    sub_id: int,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    sub = _get_sub(sub_id, db, user)
    _ensure_review_ready(sub)
    previous_text = sub.current_text
    for f in sub.findings:
        if f.status == FindingStatus.open:
            f.status = FindingStatus.accepted
    _recompute_current_text(sub)
    _schedule_recheck(db, sub, background, user, "Accepted corrections", previous_text)
    log_action(db, "accept_all", sub_id, org_id=user.org_id, user_id=user.id)
    db.commit()
    db.refresh(sub)
    return _enrich(sub, db)


@router.post("/submissions/{sub_id}/edit", response_model=SubmissionOut)
def edit_submission(
    sub_id: int,
    body: EditBody,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    sub = _get_sub(sub_id, db, user)
    _ensure_review_ready(sub)
    prev_version = sub.version or 1
    changed = record_content_change(db, sub, body.text, user.id, "Manual content edit")
    if changed:
        new_version = sub.version

    if changed and sub.status == SubmissionStatus.approved:
        sub.status = SubmissionStatus.in_review
        sub.approved_text = None
        log_action(
            db,
            "approval_invalidated",
            sub_id,
            {"previous_version": prev_version, "new_version": new_version},
            org_id=user.org_id,
            user_id=user.id,
        )

    if changed:
        sub.status = SubmissionStatus.processing
        background.add_task(run_review, sub.id)
        log_action(db, "content_edited", sub_id, {"version": new_version}, org_id=user.org_id, user_id=user.id)
    db.commit()
    db.refresh(sub)
    return _enrich(sub, db)


@router.post("/submissions/{sub_id}/comments")
def add_comment(
    sub_id: int,
    body: CommentBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    sub = _get_sub(sub_id, db, user)
    log_action(db, "comment", sub_id, {"text": body.text[:500]}, org_id=user.org_id, user_id=user.id)
    db.commit()
    return {"ok": True}


@router.post("/submissions/{sub_id}/request-changes", response_model=SubmissionOut)
def request_changes(
    sub_id: int,
    body: RequestChangesBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    sub = _get_sub(sub_id, db, user)
    _ensure_review_ready(sub)
    sub.status = SubmissionStatus.changes_requested
    log_action(db, "changes_requested", sub_id, {"note": body.note}, org_id=user.org_id, user_id=user.id)
    db.commit()
    db.refresh(sub)
    return _enrich(sub, db)


@router.post("/submissions/{sub_id}/approve", response_model=SubmissionOut)
def approve(
    sub_id: int,
    body: ApproveBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    sub = _get_sub(sub_id, db, user)

    if sub.status in (SubmissionStatus.pending, SubmissionStatus.processing):
        raise HTTPException(409, "Cannot approve while compliance checks are pending.")

    # Check for high-severity findings that are not accepted
    unresolved_high = [
        f for f in sub.findings
        if f.severity == Severity.high and f.status != FindingStatus.accepted
    ]

    if unresolved_high and not body.force:
        dismissed_count = sum(1 for f in unresolved_high if f.status == FindingStatus.rejected)
        msg = f"Cannot approve submission: {len(unresolved_high)} unresolved high-severity finding(s)."
        if dismissed_count > 0:
            msg += f" ({dismissed_count} dismissed). Dismissing a high-severity finding does not resolve the violation."
        raise HTTPException(409, msg)

    if body.force and unresolved_high:
        role = (user.role or "").lower()
        if role == "creator":
            raise HTTPException(403, "Creators are not authorized to override high-severity violations.")
        if role != "manager":
            raise HTTPException(403, "Manager authorization is required to override high-severity violations.")

        reason = (body.override_reason or body.reason or "").strip()
        if not reason:
            raise HTTPException(422, "An override reason must be provided for high-severity approval.")

        log_action(
            db,
            "override_granted",
            sub_id,
            {
                "override_reason": reason,
                "authorized_by_role": "manager",
                "unresolved_findings_count": len(unresolved_high),
            },
            org_id=user.org_id,
            user_id=user.id,
        )

    sub.status = SubmissionStatus.approved
    sub.approved_text = sub.current_text
    log_action(db, "approved", sub_id, {"force": body.force}, org_id=user.org_id, user_id=user.id)
    db.commit()
    db.refresh(sub)
    return _enrich(sub, db)


@audit_router.get("/audit", response_model=list[AuditEntryOut])
def get_audit(
    submission_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if submission_id is not None:
        sub = db.get(Submission, submission_id)
        if not sub or sub.org_id != user.org_id or sub.user_id != user.id:
            raise HTTPException(404, "Submission not found")

    q = db.query(AuditLog).filter_by(org_id=user.org_id, user_id=user.id)
    if submission_id is not None:
        q = q.filter_by(submission_id=submission_id)
    return q.order_by(AuditLog.created_at.desc()).limit(200).all()
