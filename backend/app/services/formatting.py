"""Formatting compliance checks: dates, currency prices, percentages."""
import re
from app.models import FindingType, Severity


def check_formatting(text: str) -> list[dict]:
    """
    Checks brand compliance for numbers, dates, and currencies:
    - Slash dates (e.g. 3/12/2026) -> Expected: "12 March 2026"
    - American month-first dates (e.g. March 20, 2026) -> Expected: "20 March 2026"
    - Currency prices missing decimals (e.g. Rs 199 or Rs. 199) -> Expected: "Rs. 199.00"
    - Percentages with space (e.g. 20 %) -> Expected: "20%"
    - Excessive exclamation marks (e.g. !!) -> Regex finding
    """
    findings: list[dict] = []

    # 1. Slash dates (e.g., 3/12/2026)
    for m in re.finditer(r"\b\d{1,2}/\d{1,2}/\d{4}\b", text):
        findings.append({
            "type": FindingType.number_date,
            "severity": Severity.low,
            "start": m.start(),
            "end": m.end(),
            "flagged_text": m.group(),
            "message": f"Dates must be written in full format (e.g., '12 March 2026'), not '{m.group()}'.",
            "fix_text": "12 March 2026",
            "fix_rationale": "Brand guideline requires day month year format without slashes.",
        })

    # 2. Month-first dates (e.g., March 20, 2026)
    month_pattern = r"\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b"
    for m in re.finditer(month_pattern, text, re.IGNORECASE):
        findings.append({
            "type": FindingType.number_date,
            "severity": Severity.low,
            "start": m.start(),
            "end": m.end(),
            "flagged_text": m.group(),
            "message": f"Dates must be formatted with day first (e.g., '20 March 2026'), not '{m.group()}'.",
            "fix_text": "20 March 2026",
            "fix_rationale": "Brand style guide requires day-first date format.",
        })

    # 3. Currency format without two decimals (e.g., 'Rs 199' or 'Rs. 199')
    for m in re.finditer(r"\bRs\.?\s*(\d+)(?!\.\d{2})\b", text, re.IGNORECASE):
        findings.append({
            "type": FindingType.number_date,
            "severity": Severity.low,
            "start": m.start(),
            "end": m.end(),
            "flagged_text": m.group(),
            "message": f"Prices must include the currency symbol and two decimal places (e.g., 'Rs. {m.group(1)}.00').",
            "fix_text": f"Rs. {m.group(1)}.00",
            "fix_rationale": "Standard currency formatting rule.",
        })

    # 4. Percentages with space (e.g., '20 %')
    for m in re.finditer(r"\b(\d+)\s+%\b", text):
        findings.append({
            "type": FindingType.number_date,
            "severity": Severity.low,
            "start": m.start(),
            "end": m.end(),
            "flagged_text": m.group(),
            "message": f"Percentages must be written without space between number and symbol: '{m.group(1)}%'.",
            "fix_text": f"{m.group(1)}%",
            "fix_rationale": "Percentage typography rule.",
        })

    # 5. Consecutive exclamation marks (e.g., '!!')
    for m in re.finditer(r"!{2,}", text):
        findings.append({
            "type": FindingType.regex,
            "severity": Severity.low,
            "start": m.start(),
            "end": m.end(),
            "flagged_text": m.group(),
            "message": "Multiple consecutive exclamation marks are not permitted in brand communications.",
            "fix_text": "!",
            "fix_rationale": "Typography restraint guideline.",
        })

    return findings

