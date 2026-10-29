"""
Submit every post in sample_data/test_posts.json and print the findings next to what we expected.
Run inside the container:   docker compose exec backend python scripts/run_posts.py
Run a single post:          docker compose exec backend python scripts/run_posts.py 06
"""
import json
import os
import sys
import time

import httpx

BASE = os.getenv("API", "http://localhost:8000")
path = os.path.join(os.path.dirname(__file__), "..", "sample_data", "test_posts.json")
posts = json.load(open(path, encoding="utf-8"))
only = sys.argv[1:]

for p in posts:
    if only and not any(p["title"].startswith(o) for o in only):
        continue
    sid = httpx.post(f"{BASE}/submissions", json={"title": p["title"], "text": p["text"]}, timeout=30).json()["id"]

    sub = {}
    for _ in range(120):
        sub = httpx.get(f"{BASE}/submissions/{sid}", timeout=30).json()
        if sub["status"] in ("in_review", "failed"):
            break
        time.sleep(1)

    print(f"\n=== {p['title']}  (id={sid}, status={sub['status']})")
    print("TEXT:    ", p["text"])
    print("EXPECTED:", [f"{e['type']}: {e['text']}" for e in p["expected"]] or "nothing")
    print("FOUND:")
    for f in sub.get("findings", []):
        fix = f["fix"]["suggested_text"] if f.get("fix") else None
        cite = f.get("citation_title") or "-"
        print(f"  [{f['type']}/{f['severity']}{'' if f['verified'] else '/UNVERIFIED'}] {f['flagged_text']!r} -> {fix!r}  | {cite}")
        print(f"      {f['message']}")
    if not sub.get("findings"):
        print("  (none)")