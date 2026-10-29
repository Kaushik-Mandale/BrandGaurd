"""Text extraction from uploaded files (PDF, DOCX, TXT, MD)."""
import io
import logging
import pathlib

log = logging.getLogger("brandguard.extract")


def extract_text(file_path: str) -> tuple[str, list[tuple[int, str]]]:
    """
    Returns (full_text, pages) where pages = [(page_num, text), ...].
    For plain text files a single page is returned.
    """
    ext = pathlib.Path(file_path).suffix.lower()
    try:
        if ext == ".pdf":
            return _from_pdf(file_path)
        elif ext == ".docx":
            return _from_docx(file_path)
        else:
            raw = pathlib.Path(file_path).read_text(errors="replace")
            return raw, [(1, raw)]
    except Exception as exc:
        log.exception("Text extraction failed for %s", file_path)
        return "", []


def _from_pdf(path: str) -> tuple[str, list[tuple[int, str]]]:
    import fitz  # PyMuPDF
    doc = fitz.open(path)
    pages = []
    for i, page in enumerate(doc, start=1):
        text = page.get_text()
        if text.strip():
            pages.append((i, text))
    full = "\n".join(t for _, t in pages)
    return full, pages


def _from_docx(path: str) -> tuple[str, list[tuple[int, str]]]:
    from docx import Document
    doc = Document(path)
    text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
    return text, [(1, text)]
