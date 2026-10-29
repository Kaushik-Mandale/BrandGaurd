"""Sentence-transformer embedding service."""
import logging
import numpy as np
from sentence_transformers import SentenceTransformer
from app.config import settings

log = logging.getLogger("brandguard.embeddings")
_model: SentenceTransformer | None = None


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        log.info("Loading embedding model %s …", settings.EMBEDDING_MODEL)
        _model = SentenceTransformer(settings.EMBEDDING_MODEL)
    return _model


def embed(text: str) -> list[float]:
    vec = _get_model().encode(text, normalize_embeddings=True)
    return vec.tolist()


def embed_batch(texts: list[str]) -> list[list[float]]:
    vecs = _get_model().encode(texts, normalize_embeddings=True, batch_size=32)
    return vecs.tolist()


embed_texts = embed_batch

