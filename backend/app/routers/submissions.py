"""Submissions router: create, upload, list, get, rerun with multi-tenant isolation."""
import os

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models import BrandChunk, BrandDocument, Submission, SubmissionRevision, SubmissionStatus, User
from app.pipeline import run_review
from app.schemas import SubmissionCreate, SubmissionListItem, SubmissionOut, SubmissionRevisionOut
from app.services.revisions import snapshot_initial_version
from app.services.uploads import delete_upload, save_upload
from app.services.vision import IMAGE_EXT, extract_image_text

router = APIRouter(prefix="/submissions", tags=["submissions"])

TEXT_EXT = {".txt", ".md", ".pdf", ".docx"}
SUBMISSION_EXT = TEXT_EXT | IMAGE_EXT


def _enrich(sub: Submission, db: Session) -> dict:
    """Build SubmissionOut-compatible dict with citation_title, citation_page, version, and approved_text."""
    findings_out = []
    for f in sub.findings:
        fd = {
            "id": f.id,
            "type": f.type,
            "severity": f.severity,
            "status": f.status,
            "start_offset": f.start_offset,
            "end_offset": f.end_offset,
            "flagged_text": f.flagged_text,
            "message": f.message,
            "evidence_quote": f.evidence_quote,
            "evidence_chunk_id": f.evidence_chunk_id,
            "confidence": f.confidence,
            "verified": f.verified,
            "fix": f.fix,
            "region": f.region,
            "citation_title": None,
            "citation_page": None,
        }
        if f.evidence_chunk_id:
            chunk = db.get(BrandChunk, f.evidence_chunk_id)
            if chunk:
                doc = db.get(BrandDocument, chunk.document_id)
                fd["citation_title"] = doc.title if doc else None
                fd["citation_page"] = chunk.page
        findings_out.append(fd)

    return {
        "id": sub.id,
        "title": sub.title,
        "original_text": sub.original_text,
        "current_text": sub.current_text,
        "status": sub.status,
        "version": sub.version or 1,
        "approved_text": sub.approved_text,
        "created_at": sub.created_at,
        "has_image": bool(sub.file_path) and os.path.splitext(sub.file_path or "")[1].lower() in IMAGE_EXT,
        "findings": findings_out,
    }


@router.get("", response_model=list[SubmissionListItem])
def list_submissions(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    subs = (
        db.query(Submission)
        .filter_by(org_id=user.org_id, user_id=user.id)
        .order_by(Submission.created_at.desc())
        .all()
    )
    return subs


@router.get("/{sub_id}", response_model=SubmissionOut)
def get_submission(
    sub_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    sub = db.get(Submission, sub_id)
    if not sub or sub.org_id != user.org_id or sub.user_id != user.id:
        raise HTTPException(404, "Submission not found")
    return _enrich(sub, db)


@router.post("")
def create_submission(
    body: SubmissionCreate,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    sub = Submission(
        org_id=user.org_id,
        user_id=user.id,
        title=body.title,
        original_text=body.text,
        current_text=body.text,
        status=SubmissionStatus.pending,
        version=1,
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    snapshot_initial_version(db, sub, body.text, user.id)
    db.commit()
    background.add_task(run_review, sub.id)
    return {"id": sub.id, "status": sub.status}


@router.post("/upload")
def upload_submission(
    background: BackgroundTasks,
    file: UploadFile = File(...),
    title: str = Form(""),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    dest, original_name = save_upload(file, SUBMISSION_EXT)

    ext = dest.suffix.lower()
    try:
        if ext in IMAGE_EXT:
            import cv2
            if cv2.imread(str(dest)) is None:
                raise HTTPException(422, "Uploaded image could not be decoded")
            text = extract_image_text(str(dest))
        else:
            from app.services.extract import extract_text
            text, _ = extract_text(str(dest))
            if not text.strip():
                raise HTTPException(422, "No readable text could be extracted from this document")
    except Exception:
        delete_upload(dest)
        raise

    sub = Submission(
        org_id=user.org_id,
        user_id=user.id,
        title=(title.strip() or original_name or "Untitled")[:300],
        original_text=text,
        current_text=text,
        file_path=str(dest),
        status=SubmissionStatus.pending,
        version=1,
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    snapshot_initial_version(db, sub, text, user.id)
    db.commit()
    background.add_task(run_review, sub.id)
    return {"id": sub.id, "status": sub.status}


@router.get("/{sub_id}/image")
def get_image(
    sub_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    sub = db.get(Submission, sub_id)
    if (
        not sub
        or sub.org_id != user.org_id
        or sub.user_id != user.id
        or not sub.file_path
        or not os.path.exists(sub.file_path)
    ):
        raise HTTPException(404, "Image not found")
    return FileResponse(sub.file_path)


@router.post("/{sub_id}/rerun")
def rerun(
    sub_id: int,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    sub = db.get(Submission, sub_id)
    if not sub or sub.org_id != user.org_id or sub.user_id != user.id:
        raise HTTPException(404, "Not found")
    if sub.status in (SubmissionStatus.pending, SubmissionStatus.processing):
        raise HTTPException(409, "A compliance review is already pending for this submission.")
    sub.status = SubmissionStatus.processing
    db.commit()
    background.add_task(run_review, sub.id)
    return {"id": sub.id}


@router.get("/{sub_id}/revisions", response_model=list[SubmissionRevisionOut])
def list_revisions(
    sub_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    sub = db.get(Submission, sub_id)
    if not sub or sub.org_id != user.org_id or sub.user_id != user.id:
        raise HTTPException(404, "Submission not found")
    return db.query(SubmissionRevision).filter_by(submission_id=sub_id).order_by(
        SubmissionRevision.version.desc()
    ).all()
