"""Knowledge base router: brand documents, embeddings, semantic search, and brand rules with tenant isolation."""
from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models import BrandChunk, BrandDocument, BrandRule, User
from app.schemas import BrandDocumentOut, RuleCreate, RuleOut, SearchHitOut
from app.services.chunker import chunk_text
from app.services.embeddings import embed_batch
from app.services.extract import extract_text
from app.services.retrieval import retrieve
from app.services.uploads import delete_upload, save_upload

router = APIRouter(prefix="/knowledge", tags=["knowledge"])


def _index_document(doc_id: int, file_path: str, org_id: int):
    """Background task: extract text, chunk, embed, store."""
    from app.db import SessionLocal
    db = SessionLocal()
    try:
        doc = db.get(BrandDocument, doc_id)
        if not doc:
            return
        full_text, pages = extract_text(file_path)
        if not full_text.strip():
            return

        # Delete old chunks
        db.query(BrandChunk).filter_by(document_id=doc_id).delete()

        # Chunk per page for better citation granularity
        all_chunks: list[tuple[int | None, str]] = []
        if pages:
            for page_num, page_text in pages:
                for chunk in chunk_text(page_text):
                    all_chunks.append((page_num, chunk))
        else:
            for chunk in chunk_text(full_text):
                all_chunks.append((None, chunk))

        texts = [c for _, c in all_chunks]
        embeddings = embed_batch(texts)

        for idx, ((page, text), emb) in enumerate(zip(all_chunks, embeddings)):
            db.add(BrandChunk(
                org_id=org_id,
                document_id=doc_id,
                page=page,
                chunk_index=idx,
                text=text,
                embedding=emb,
            ))
        db.commit()
    except Exception:
        import logging
        logging.getLogger("brandguard.knowledge").exception("Indexing failed for doc %s", doc_id)
        db.rollback()
    finally:
        db.close()


@router.get("/documents", response_model=list[BrandDocumentOut])
def list_documents(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return db.query(BrandDocument).filter_by(org_id=user.org_id).order_by(BrandDocument.created_at.desc()).all()


@router.post("/documents")
def upload_document(
    background: BackgroundTasks,
    file: UploadFile = File(...),
    title: str = Form(""),
    doc_type: str = Form("guideline"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    dest, original_name = save_upload(file, {".pdf", ".docx", ".txt", ".md"})
    text, _ = extract_text(str(dest))
    if not text.strip():
        delete_upload(dest)
        raise HTTPException(422, "No readable text could be extracted from this document")

    doc = BrandDocument(
        org_id=user.org_id,
        title=(title.strip() or original_name or "Untitled")[:300],
        doc_type=doc_type,
        file_path=str(dest),
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    background.add_task(_index_document, doc.id, dest, user.org_id)
    return {"id": doc.id, "title": doc.title, "doc_type": doc.doc_type, "chunks": "indexing…"}


@router.delete("/documents/{doc_id}")
def delete_document(
    doc_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    doc = db.get(BrandDocument, doc_id)
    if not doc or doc.org_id != user.org_id:
        raise HTTPException(404, "Not found")
    file_path = doc.file_path
    db.delete(doc)
    db.commit()
    if file_path:
        delete_upload(file_path)
    return {"deleted": doc_id}


@router.get("/search", response_model=list[SearchHitOut])
def search(
    q: str,
    k: int = 5,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return retrieve(db, user.org_id, q, k=k)


# ── Brand Rules ────────────────────────────────────────────────────────────────
@router.get("/rules", response_model=list[RuleOut])
def list_rules(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return db.query(BrandRule).filter_by(org_id=user.org_id).order_by(BrandRule.id).all()


@router.post("/rules", response_model=RuleOut)
def create_rule(
    body: RuleCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rule = BrandRule(org_id=user.org_id, **body.model_dump())
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@router.patch("/rules/{rule_id}/toggle", response_model=RuleOut)
def toggle_rule(
    rule_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rule = db.get(BrandRule, rule_id)
    if not rule or rule.org_id != user.org_id:
        raise HTTPException(404, "Not found")
    rule.active = not rule.active
    db.commit()
    db.refresh(rule)
    return rule


@router.delete("/rules/{rule_id}")
def delete_rule(
    rule_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rule = db.get(BrandRule, rule_id)
    if not rule or rule.org_id != user.org_id:
        raise HTTPException(404, "Not found")
    db.delete(rule)
    db.commit()
    return {"deleted": rule_id}
