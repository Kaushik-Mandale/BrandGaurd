"""Embedding service — uses FastEmbed (ONNX-Runtime, CPU-only, no PyTorch/CUDA).

FastEmbed supports the same all-MiniLM-L6-v2 model as sentence-transformers and
produces identical 384-dim L2-normalised vectors, so existing pgvector indexes
remain valid.  The first call downloads the ONNX model (~23 MB) to the local
cache; subsequent calls reuse it.

Why not sentence-transformers?
  sentence-transformers pulls in PyTorch + CUDA wheels (~4–5 GB) which exceeds
  Vercel's 500 MB Lambda bundle limit.  FastEmbed's entire install is ~150 MB.
"""
import logging
import numpy as np
from fastembed import TextEmbedding
from app.config import settings

log = logging.getLogger("brandguard.embeddings")

# Map our existing config value to the fastembed model name.
# FastEmbed uses the same HuggingFace model IDs.
_FASTEMBED_MODEL = settings.EMBEDDING_MODEL  # "sentence-transformers/all-MiniLM-L6-v2"

_model: TextEmbedding | None = None


def _get_model() -> TextEmbedding:
    global _model
    if _model is None:
        log.info("Loading FastEmbed model %s …", _FASTEMBED_MODEL)
        _model = TextEmbedding(model_name=_FASTEMBED_MODEL)
    return _model


def embed(text: str) -> list[float]:
    """Embed a single string; returns a normalised 384-dim float list."""
    model = _get_model()
    # TextEmbedding.embed() is a generator — consume the single result.
    vec = next(iter(model.embed([text])))
    arr = np.array(vec, dtype=np.float32)
    norm = np.linalg.norm(arr)
    if norm > 0:
        arr = arr / norm
    return arr.tolist()


def embed_batch(texts: list[str]) -> list[list[float]]:
    """Embed a list of strings; returns normalised 384-dim float lists."""
    if not texts:
        return []
    model = _get_model()
    vecs = list(model.embed(texts))
    result = []
    for vec in vecs:
        arr = np.array(vec, dtype=np.float32)
        norm = np.linalg.norm(arr)
        if norm > 0:
            arr = arr / norm
        result.append(arr.tolist())
    return result


# Alias used by other modules
embed_texts = embed_batch
