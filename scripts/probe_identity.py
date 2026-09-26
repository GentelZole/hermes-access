#!/usr/bin/env python3
"""Probe what agent identity info the API exposes (name, platform, version)."""
import json
import subprocess
from pathlib import Path

key = ""
for ln in (Path.home() / ".hermes/.env").read_text().splitlines():
    if ln.startswith("API_SERVER_KEY="):
        key = ln.split("=", 1)[1].strip()

for path in ["/health", "/v1/capabilities"]:
    r = subprocess.run(
        ["curl", "-s", "-m", "10", "-H", "Authorization: Bearer " + key,
         "http://127.0.0.1:8642" + path],
        capture_output=True, text=True)
    print(f"=== {path} ===")
    try:
        d = json.loads(r.stdout)
        print(json.dumps(d, ensure_ascii=False, indent=1)[:700])
    except Exception:
        print(r.stdout[:300])
    print()
