#!/usr/bin/env python3
"""Rotate API_SERVER_KEY to fix the mismatch, then schedule a detached gateway
restart to reload it. Writes the new key to ~/.hermes/.env."""
import secrets
import subprocess
from pathlib import Path

env_path = Path.home() / ".hermes/.env"
lines = env_path.read_text().splitlines()
new_key = secrets.token_hex(32)
out, replaced = [], False
for ln in lines:
    if ln.startswith("API_SERVER_KEY="):
        out.append("API_SERVER_KEY=" + new_key)
        replaced = True
    else:
        out.append(ln)
if not replaced:
    out.append("API_SERVER_KEY=" + new_key)
env_path.write_text("\n".join(out) + "\n")
print("key rotated:", new_key[:8] + "..." + new_key[-4:])

# schedule detached restart in 5s via systemd transient timer
r = subprocess.run(
    ["systemd-run", "--user", "--on-active=5", "--timer-property=AccuracySec=1",
     "--unit=gw-key-reload",
     "/home/moe/.hermes/hermes-agent/venv/bin/python",
     "/home/moe/projects/hermes-access/scripts/restart_gateway.py"],
    capture_output=True, text=True, timeout=15)
print("schedule rc:", r.returncode, r.stdout.strip(), r.stderr.strip())
