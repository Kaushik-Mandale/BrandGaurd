import re


def locate_span(text: str, quote: str) -> tuple[int | None, int | None]:
    """Find where an LLM-quoted phrase sits in the original text. LLMs often change
    whitespace or casing slightly, so we try exact, then case-insensitive, then whitespace-tolerant."""
    quote = (quote or "").strip().strip("\"'“”")
    if not quote:
        return None, None

    i = text.find(quote)
    if i >= 0:
        return i, i + len(quote)

    m = re.search(re.escape(quote), text, re.IGNORECASE)
    if m:
        return m.start(), m.end()

    parts = [re.escape(p) for p in quote.split()]
    if parts:
        m = re.search(r"\s+".join(parts), text, re.IGNORECASE)
        if m:
            return m.start(), m.end()
    return None, None


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip().lower()


def norm_contains(haystack: str, needle: str) -> bool:
    return bool(needle) and _norm(needle) in _norm(haystack)