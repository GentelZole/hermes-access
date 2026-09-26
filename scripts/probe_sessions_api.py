#!/usr/bin/env python3
"""Probe the live Sessions API shape: list, sources, messages."""
import json
import subprocess
from pathlib import Path

key = ""
for ln in (Path.home() / ".hermes/.env").read_text().splitlines():
    if ln.startswith("API_SERVER_KEY="):
        key = ln.split("=", 1)[1].strip()

def api(path, method="GET", body=None):
    cmd = ["curl", "-s", "-m", "20", "-X", method,
           "-H", "Authorization: Bearer " + key,
           "-H", "Content-Type: application/json",
           "http://127.0.0.1:8642" + path]
    if body:
        cmd += ["-d", json.dumps(body)]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    try:
        return json.loads(r.stdout)
    except Exception:
        return {"_raw": r.stdout[:400]}

# 1) session list shape
sessions = api("/api/sessions?limit=50")
print("=== LIST keys ===")
if isinstance(sessions, dict):
    print(list(sessions.keys()))
    items = sessions.get("sessions") or sessions.get("data") or []
else:
    items = sessions
print("count:", len(items))
if items:
    print("first item keys:", sorted(items[0].keys()))
    # source distribution
    from collections import Counter
    print("sources:", Counter(s.get("source") for s in items))
    # show a few with titles
    for s in items[:5]:
        print("-", s.get("session_id", "")[:20], "|", s.get("source"), "|", (s.get("title") or "")[:40])

# 2) messages shape for the most recent session
if items:
    sid = items[0].get("session_id") or items[0].get("id")
    msgs = api(f"/api/sessions/{sid}/messages?limit=3")
    print("\n=== MESSAGES keys ===")
    if isinstance(msgs, dict):
        print(list(msgs.keys()))
        mitems = msgs.get("messages") or msgs.get("data") or []
    else:
        mitems = msgs
    print("count:", len(mitems))
    if mitems:
        print("first msg keys:", sorted(mitems[0].keys()))
        print("sample:", json.dumps(mitems[0], ensure_ascii=False)[:400])

# 3) jobs shape
jobs = api("/api/jobs")
print("\n=== JOBS ===")
print(json.dumps(jobs, ensure_ascii=False)[:500])

# 4) skills shape
skills = api("/v1/skills")
print("\n=== SKILLS ===")
if isinstance(skills, list):
    print("count:", len(skills), "| first:", json.dumps(skills[0], ensure_ascii=False)[:200] if skills else "")
else:
    print(json.dumps(skills, ensure_ascii=False)[:300])
