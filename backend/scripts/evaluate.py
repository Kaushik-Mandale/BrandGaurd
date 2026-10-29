"""
Benchmark BrandGuard on sample_data/eval_set.json and print precision / recall.

  docker compose exec backend python scripts/evaluate.py

A finding matches an expected item when the type is equal and the expected text appears in the
finding's flagged text or message. Each finding and each expected item is matched at most once.
  TP  expected issue that was found
  FN  expected issue that was missed
  FP  finding that matches no expected issue
Results are also written to sample_data/eval_results.json for your slides.
"""
import json
import os
import time
from collections import defaultdict

import httpx

BASE = os.getenv("API", "http://localhost:8000")
HERE = os.path.dirname(__file__)
SET = os.path.join(HERE, "..", "sample_data", "eval_set.json")
OUT = os.path.join(HERE, "..", "sample_data", "eval_results.json")


def matches(finding: dict, exp: dict) -> bool:
    hay = f"{finding['flagged_text']} {finding['message']}".lower()
    return finding["type"] == exp["type"] and exp["contains"].lower() in hay


def main():
    posts = json.load(open(SET, encoding="utf-8"))
    client = httpx.Client(timeout=60)

    ids = {}
    for p in posts:
        r = client.post(f"{BASE}/submissions", json={"title": p["title"], "text": p["text"]})
        r.raise_for_status()
        ids[p["title"]] = r.json()["id"]
    print(f"Submitted {len(ids)} posts, waiting for the reviews…")

    subs: dict[str, dict] = {}
    deadline = time.time() + 900
    while len(subs) < len(ids) and time.time() < deadline:
        for title, sid in ids.items():
            if title in subs:
                continue
            s = client.get(f"{BASE}/submissions/{sid}").json()
            if s["status"] in ("in_review", "failed"):
                subs[title] = s
        time.sleep(2)

    tp = fp = fn = 0
    by_type = defaultdict(lambda: {"tp": 0, "fp": 0, "fn": 0})
    clean_total = clean_flagged = 0
    with_fix = spans = unverified = 0
    rows, details = [], []

    for p in posts:
        s = subs.get(p["title"])
        findings = s["findings"] if s and s["status"] == "in_review" else []
        failed = s is None or s["status"] != "in_review"
        expected = p["expected"]
        used: set[int] = set()
        matched_exp = []

        for e in expected:
            hit = next((i for i, f in enumerate(findings) if i not in used and matches(f, e)), None)
            if hit is None:
                fn += 1
                by_type[e["type"]]["fn"] += 1
            else:
                used.add(hit)
                tp += 1
                by_type[e["type"]]["tp"] += 1
                matched_exp.append(e)
        extra = [f for i, f in enumerate(findings) if i not in used]
        for f in extra:
            fp += 1
            by_type[f["type"]]["fp"] += 1

        if not expected:
            clean_total += 1
            clean_flagged += bool(findings)
        for f in findings:
            if f["start_offset"] is not None and f["end_offset"] > f["start_offset"]:
                spans += 1
                with_fix += bool(f["fix"])
            unverified += not f["verified"]

        n_tp = len(matched_exp)
        rows.append((p["title"][:38], len(expected), len(findings), n_tp, len(extra), len(expected) - n_tp, failed))
        details.append({
            "title": p["title"], "failed": failed,
            "missed": [e for e in expected if e not in matched_exp],
            "false_positives": [{"type": f["type"], "text": f["flagged_text"], "message": f["message"]} for f in extra],
        })

    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0

    print(f"\n{'Post':38} {'Exp':>4} {'Found':>5} {'TP':>3} {'FP':>3} {'FN':>3}")
    for t, e, fnd, a, b, c, failed in rows:
        print(f"{t:38} {e:>4} {fnd:>5} {a:>3} {b:>3} {c:>3}{'  (REVIEW FAILED)' if failed else ''}")

    print(f"\nPrecision {precision:.1%}   Recall {recall:.1%}   F1 {f1:.1%}   (TP {tp}, FP {fp}, FN {fn})")
    if clean_total:
        print(f"Clean posts wrongly flagged: {clean_flagged}/{clean_total} "
              f"(false-positive post rate {clean_flagged / clean_total:.0%})")
    if spans:
        print(f"Findings with a suggested fix: {with_fix}/{spans} ({with_fix / spans:.0%})")
    print(f"Findings still unverified: {unverified}")

    print("\nBy type:")
    for t, c in sorted(by_type.items()):
        p_ = c["tp"] / (c["tp"] + c["fp"]) if c["tp"] + c["fp"] else 0
        r_ = c["tp"] / (c["tp"] + c["fn"]) if c["tp"] + c["fn"] else 0
        print(f"  {t:12} precision {p_:.0%}  recall {r_:.0%}   (TP {c['tp']}, FP {c['fp']}, FN {c['fn']})")

    print("\nMisses and false positives:")
    for d in details:
        for e in d["missed"]:
            print(f"  MISSED  [{d['title'][:20]}] {e['type']}: {e['contains']}")
        for f in d["false_positives"]:
            print(f"  EXTRA   [{d['title'][:20]}] {f['type']}: {f['text']!r}  {f['message'][:80]}")

    json.dump({
        "precision": precision, "recall": recall, "f1": f1, "tp": tp, "fp": fp, "fn": fn,
        "clean_posts": clean_total, "clean_posts_flagged": clean_flagged,
        "fix_coverage": (with_fix / spans) if spans else None,
        "by_type": by_type, "details": details,
    }, open(OUT, "w", encoding="utf-8"), indent=2)
    print(f"\nSaved {os.path.relpath(OUT)}")


if __name__ == "__main__":
    main()