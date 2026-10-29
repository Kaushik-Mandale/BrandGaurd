"""Vector retrieval from brand_chunks using pgvector cosine similarity."""
import logging
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models import BrandChunk, BrandDocument
from app.services.embeddings import embed

log = logging.getLogger("brandguard.retrieval")


def retrieve(db: Session, org_id: int, query: str, k: int = 5) -> list[dict]:
    """Return top-k semantically similar chunks for a given query."""
    try:
        vec = embed(query)
    except Exception:
        log.exception("Embedding failed for retrieval query")
        return []

    rows = db.execute(
        select(
            BrandChunk.id,
            BrandChunk.document_id,
            BrandChunk.page,
            BrandChunk.text,
            BrandDocument.title.label("doc_title"),
            BrandChunk.embedding.cosine_distance(vec).label("dist"),
        )
        .join(BrandDocument, BrandChunk.document_id == BrandDocument.id)
        .where(BrandChunk.org_id == org_id)
        .order_by("dist")
        .limit(k)
    ).fetchall()

    return [
        {
            "chunk_id": r.id,
            "doc_id": r.document_id,
            "doc_title": r.doc_title,
            "page": r.page,
            "text": r.text,
            "score": round(1 - r.dist, 4),
        }
        for r in rows
    ]
