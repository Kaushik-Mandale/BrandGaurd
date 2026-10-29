"""Deterministic rule-engine checks: banned terms, preferred terms, required text, regex."""
import logging
import re
from app.models import BrandRule, RuleKind, Severity, FindingType

log = logging.getLogger("brandguard.rule_engine")


def _find_all(pattern: str, text: str, flags: int = re.IGNORECASE) -> list[tuple[int, int]]:
    return [(m.start(), m.end()) for m in re.finditer(re.escape(pattern), text, flags)]


def _find_regex(pattern: str, text: str) -> list[tuple[int, int]]:
    try:
        return [(m.start(), m.end()) for m in re.finditer(pattern, text, re.IGNORECASE)]
    except re.error:
        return []


def run_rule_checks(text: str, rules: list[BrandRule]) -> list[dict]:
    findings: list[dict] = []
    for rule in rules:
        if not rule.active:
            continue
        spans: list[tuple[int, int]] = []

        if rule.kind == RuleKind.banned_term:
            spans = _find_all(rule.pattern, text)
            for s, e in spans:
                findings.append({
                    "type": FindingType.terminology,
                    "severity": rule.severity,
                    "start": s, "end": e,
                    "flagged_text": text[s:e],
                    "message": rule.description or f'"{rule.pattern}" is a banned term.',
                    "rule_id": rule.id,
                    "fix_text": rule.replacement or "",
                    "fix_rationale": f'Remove or replace "{rule.pattern}".',
                })

        elif rule.kind == RuleKind.preferred_term:
            spans = _find_all(rule.pattern, text)
            for s, e in spans:
                findings.append({
                    "type": FindingType.terminology,
                    "severity": rule.severity,
                    "start": s, "end": e,
                    "flagged_text": text[s:e],
                    "message": rule.description or f'Use "{rule.replacement}" instead of "{rule.pattern}".',
                    "rule_id": rule.id,
                    "fix_text": rule.replacement or "",
                    "fix_rationale": f'Preferred term: "{rule.replacement}".',
                })

        elif rule.kind == RuleKind.required_text:
            if rule.pattern.lower() not in text.lower():
                findings.append({
                    "type": FindingType.terminology,
                    "severity": rule.severity,
                    "start": len(text), "end": len(text),
                    "flagged_text": "",
                    "message": rule.description or f'Required text "{rule.pattern}" is missing.',
                    "rule_id": rule.id,
                    "fix_text": rule.pattern,
                    "fix_rationale": "Append the required disclaimer or text.",
                })

        elif rule.kind == RuleKind.regex:
            spans = _find_regex(rule.pattern, text)
            for s, e in spans:
                findings.append({
                    "type": FindingType.regex,
                    "severity": rule.severity,
                    "start": s, "end": e,
                    "flagged_text": text[s:e],
                    "message": rule.description or f'Pattern /{rule.pattern}/ matched.',
                    "rule_id": rule.id,
                    "fix_text": rule.replacement or "",
                    "fix_rationale": rule.description or "",
                })

    return findings


def exempt_spans(text: str, rules: list[BrandRule]) -> list[tuple[int, int]]:
    """Return spans of required_text patterns so claim checker doesn't double-flag them."""
    spans = []
    for r in rules:
        if r.kind == RuleKind.required_text and r.active:
            for m in re.finditer(re.escape(r.pattern), text, re.IGNORECASE):
                spans.append((m.start(), m.end()))
    return spans


def inside_exempt(start: int | None, end: int | None, exempt: list[tuple[int, int]]) -> bool:
    if start is None or end is None:
        return False
    return any(es <= start and end <= ee for es, ee in exempt)


def merge_findings(rule_findings: list[dict], ai_findings: list[dict]) -> list[dict]:
    """Combine rule + AI findings, deduplicating by overlapping spans."""
    merged = list(rule_findings)
    for af in ai_findings:
        s, e = af.get("start"), af.get("end")
        if s is None or e is None or s == e:
            merged.append(af)
            continue
        overlap = any(
            rf.get("start") is not None
            and not (e <= rf["start"] or s >= rf["end"])
            for rf in rule_findings
        )
        if not overlap:
            merged.append(af)
    return merged
