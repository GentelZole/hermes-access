#!/usr/bin/env python3
"""E2E test of the pairing flow: redeem -> verify token -> single-use check."""
import json
import subprocess
from pathlib import Path

BRIDGE = "http://127.0.0.1:8661"

# fresh code
code = subprocess.run(
    [str(Path.home() / ".hermes/hermes-agent/venv/bin/python"),
     str(Path.home() / "projects/hermes-access/bridge/server.py"), "gen"],
    capture_output=True, text=True).stdout.strip()
print("code:", code[:12] + "…")

# redeem
r = subprocess.run(["curl", "-s", "-m", "10", "-X", "POST",
                    "-H", "Content-Type: application/json",
                    "-d", json.dumps({"code": code}),
                    BRIDGE + "/api/pair/redeem"], capture_output=True, text=True)
data = json.loads(r.stdout)
print("redeem keys:", sorted(data.keys()))
print("baseUrl:", data.get("baseUrl"), "| label:", data.get("label"))
print("token length:", len(data.get("token", "")))

# token matches the gateway key?
real_key = ""
for ln in (Path.home() / ".hermes/.env").read_text().splitlines():
    if ln.startswith("API_SERVER_KEY="):
        real_key = ln.split("=", 1)[1].strip()
print("token == API_SERVER_KEY:", data.get("token") == real_key)

# verify the redeemed token works against the gateway
chk = subprocess.run(["curl", "-s", "-m", "8", "-o", "-", "-w", "\nHTTP:%{http_code}",
                      "-H", "Authorization: Bearer " + data["token"],
                      data["baseUrl"] + "/health"], capture_output=True, text=True)
print("gateway health with redeemed token:", chk.stdout.strip()[-60:])

# single-use: second redemption must fail
r2 = subprocess.run(["curl", "-s", "-m", "10", "-X", "POST",
                     "-H", "Content-Type: application/json",
                     "-d", json.dumps({"code": code}),
                     BRIDGE + "/api/pair/redeem"], capture_output=True, text=True)
print("second redeem (must fail):", r2.stdout[:120])

# wrong code
r3 = subprocess.run(["curl", "-s", "-m", "10", "-X", "POST",
                     "-H", "Content-Type: application/json",
                     "-d", json.dumps({"code": "bogus"}),
                     BRIDGE + "/api/pair/redeem"], capture_output=True, text=True)
print("bogus code (must 404):", r3.stdout[:120])
