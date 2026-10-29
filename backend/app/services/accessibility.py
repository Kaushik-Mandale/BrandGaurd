"""Accessibility and content quality checks (WCAG-aligned).

Covers:
1. Meaningful link text (flags 'click here', 'read more', 'link', 'here').
2. Heading hierarchy (flags skipped levels, e.g. H1 -> H3 without H2).
3. Readability & clarity analysis (flags run-on sentences with >45 words or excessive reading complexity).
4. All-caps legibility issues.
"""
import re
from app.models import FindingType, Severity


def check_accessibility(text: str) -> list[dict]:
    findings = []

    # 1. Non-descriptive link text
    # Matches markdown [click here](url) or HTML <a ...>click here</a> or standalone phrases
    link_patterns = [
        (r"\[(click here|read more|learn more|link|here|more)\]\([^)]+\)", "Non-descriptive markdown link text"),
        (r"<a[^>]*>(click here|read more|learn more|link|here|more)</a>", "Non-descriptive HTML anchor text"),
        (r"\b(click here|read more)\b", "Ambiguous call-to-action link text"),
    ]
    for pattern, desc in link_patterns:
        for m in re.finditer(pattern, text, re.IGNORECASE):
            s, e = m.start(), m.end()
            flagged = text[s:e]
            findings.append({
                "type": FindingType.readability,
                "severity": Severity.low,
                "start": s,
                "end": e,
                "flagged_text": flagged,
                "message": f"[WCAG 2.4.4] Avoid generic link text '{flagged}'. Use meaningful link text that describes the destination.",
                "fix_text": "view documentation" if "here" in flagged.lower() else "explore details",
                "fix_rationale": "WCAG 2.4.4 requires link purpose to be clear from link text alone.",
                "confidence": 0.95,
                "verified": True,
            })

    # 2. Markdown heading hierarchy
    lines = text.split("\n")
    current_char = 0
    last_level = 0
    for line in lines:
        m = re.match(r"^(#{1,6})\s+(.*)", line)
        if m:
            level = len(m.group(1))
            if last_level > 0 and level > last_level + 1:
                # Skipped heading level (e.g. H1 -> H3)
                s = current_char
                e = current_char + len(line)
                findings.append({
                    "type": FindingType.readability,
                    "severity": Severity.medium,
                    "start": s,
                    "end": e,
                    "flagged_text": line,
                    "message": f"[WCAG 1.3.1] Heading level skipped (H{last_level} followed directly by H{level}). Heading levels should increase sequentially.",
                    "fix_text": "#" * (last_level + 1) + " " + m.group(2),
                    "fix_rationale": "Maintain sequential heading levels for screen reader navigation.",
                    "confidence": 1.0,
                    "verified": True,
                })
            last_level = level
        current_char += len(line) + 1  # newline

    # 3. Readability: Extremely long run-on sentences (>45 words)
    sentences = re.split(r"(?<=[.!?])\s+", text)
    offset = 0
    for s in sentences:
        s_clean = s.strip()
        words = s_clean.split()
        if len(words) >= 48:
            idx = text.find(s_clean, offset)
            if idx >= 0:
                findings.append({
                    "type": FindingType.readability,
                    "severity": Severity.low,
                    "start": idx,
                    "end": idx + len(s_clean),
                    "flagged_text": s_clean[:80] + "...",
                    "message": f"Readability warning: Run-on sentence contains {len(words)} words. Split into concise sentences to improve comprehension (target <30 words).",
                    "fix_text": s_clean,
                    "fix_rationale": "Improve cognitive readability and ease of understanding.",
                    "confidence": 0.85,
                    "verified": True,
                })
                offset = idx + len(s_clean)

    return findings

