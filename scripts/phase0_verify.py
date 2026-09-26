#!/usr/bin/env python3
"""Phase 0 verification: API server reachable on Tailscale IP only."""
import json
import subprocess
from pathlib import Path

key_line = ""
for ln in (Path.home() / ".hermes/.env").read_text().splitlines():
    if ln.startswith("API_SERVER_KEY="):
        key_line = ln.split("=", 1)[1].strip()
        break

def probe(url):
    try:
        out = subprocess.run(
            ["curl", "-s", "-m", "6", "-o", "-", "-w", "\nHTTP:%{http_code}",
             "-H", "Authorization: Bearer " + key_line, url],
            capture_output=True, text=True, timeout=15)
        return out.stdout.strip()[-400:]
    except Exception as e:
        return "ERROR: " + repr(e)

print("== /health via Tailscale IP ==")
print(probe("http://127.0.0.1:8642/health"))
print("\n== /v1/capabilities via Tailscale IP ==")
print(probe("http://127.0.0.1:8642/v1/capabilities"))
print("\n== /v1/models via Tailscale IP ==")
print(probe("http://127.0.0.1:8642/v1/models"))
print("\n== loopback (should FAIL / refuse) ==")
print(probe("http://127.0.0.1:8642/health"))
print("\n== bad key (should 401) ==")
try:
    out = subprocess.run(
        ["curl", "-s", "-m", "6", "-o", "-", "-w", "\nHTTP:%{http_code}",
         "-H", "Authorization: Bearer wrong-key", "http://127.0.0.1:8642/v1/models"],
        capture_output=True, text=True, timeout=15)
    print(out.stdout.strip()[-200:])
except Exception as e:
    print("ERROR:", repr(e))
