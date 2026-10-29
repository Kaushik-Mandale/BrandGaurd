"""Text chunking for brand documents."""
import re


def chunk_text(text: str, chunk_size: int = 400, overlap: int = 80) -> list[str]:
    """Split text into overlapping chunks, respecting sentence boundaries."""
    # Normalize whitespace
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return []

    sentences = re.split(r"(?<=[.!?])\s+", text)
    chunks: list[str] = []
    current = ""

    for sent in sentences:
        if len(current) + len(sent) + 1 <= chunk_size:
            current = (current + " " + sent).strip()
        else:
            if current:
                chunks.append(current)
            # Start new chunk with overlap from end of previous
            if len(current) > overlap and overlap > 0:
                words = current.split()
                overlap_text = " ".join(words[-(overlap // 6):])
                current = (overlap_text + " " + sent).strip()
            else:
                current = sent

    if current:
        chunks.append(current)

    return chunks or [text[:chunk_size]]
