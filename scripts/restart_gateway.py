#!/usr/bin/env python3
"""Detached clean gateway restart + auth verification.
Invoked by a systemd transient timer, fully outside the gateway process tree.
"""
import subprocess
import sys
import time
from pathlib import Path


def sh(cmd, timeout=60):
    return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)


def main():
    log = []
    log.append(f"=== restart at {time.strftime('%Y-%m-%d %H:%M:%S')} ===")

    r = sh(["systemctl", "--user", "restart", "hermes-gateway"])
    log.append(f"restart rc={r.returncode} {r.stderr.strip()}")
    time.sleep(12)

    a = sh(["systemctl", "--user", "is-active", "hermes-gateway"])
    log.append(f"service: {a.stdout.strip()}")

    h = sh(["curl", "-s", "-m", "5", "http://127.0.0.1:8642/health"])
    log.append(f"health: {h.stdout.strip()}")

    key = ""
    env = (Path.home() / ".hermes/.env").read_text().splitlines()
    for ln in env:
        if ln.startswith("API_SERVER_KEY="):
            key = ln.split("=", 1)[1].strip()

    ok = 0
    for i in range(1, 9):
        c = sh(["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", "-m", "10",
                "-H", "Authorization: *** " + key,
                "-H", "Content-Type: application/json",
                "http://127.0.0.1:8642/api/sessions?limit=2"])
        code = c.stdout.strip()
        log.append(f"auth-check {i}: {code}")
        if code == "200":
            ok += 1
        time.sleep(0.5)
    log.append(f"AUTH PASS: {ok}/8")

    Path("/tmp/gw-restart-result.txt").write_text("\n".join(log) + "\n")


if __name__ == "__main__":
    main()
