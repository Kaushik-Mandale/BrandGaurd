"""LLM client wrapper — uses the OpenAI-compatible API (Groq, OpenAI, etc.)."""
import logging
from openai import OpenAI
from app.config import settings

log = logging.getLogger("brandguard.llm")

_client: OpenAI | None = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(
            api_key=settings.LLM_API_KEY,
            base_url=settings.LLM_BASE_URL,
        )
    return _client


def llm_available() -> bool:
    return bool(settings.LLM_API_KEY)


def chat(messages: list[dict], temperature: float = 0.2, max_tokens: int = 1024) -> str:
    """Call LLM and return the text of the first choice."""
    try:
        resp = _get_client().chat.completions.create(
            model=settings.LLM_MODEL,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return resp.choices[0].message.content or ""
    except Exception as exc:
        log.error("LLM call failed: %s", exc)
        raise
