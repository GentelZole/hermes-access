#!/usr/bin/env python3
"""Phase 0 step 2: enable the Hermes API server.

Bind host: Tailscale address if this machine runs Tailscale (recommended:
remote-only, encrypted), else loopback (front it with your own TLS proxy).
Override with HERMES_API_BIND=1.2.3.4."""
from pathlib import Path
import os
import subprocess


def _bind_host() -> str:
    """Tailscale IPv4 if available, else loopback. Override via HERMES_API_BIND."""
    if os.environ.get("HERMES_API_BIND"):
        return os.environ["HERMES_API_BIND"]
    try:
        ip = subprocess.run(["tailscale", "ip", "-4"], capture_output=True, text=True, timeout=5)
        first = ip.stdout.strip().splitlines()[0].split()[0] if ip.returncode == 0 and ip.stdout.strip() else ""
        if first.count(".") == 3:
            return first
    except Exception:
        pass
    return "127.0.0.1"


env_path = Path.home() / ".hermes/.env"
lines = env_path.read_text().splitlines()
settings = {
    "API_SERVER_ENABLED": "true",
    "API_SERVER_HOST": _bind_host(),
    "API_SERVER_PORT": "8642",
}
out_lines = []
done = set()
for ln in lines:
    matched = False
    for k, v in settings.items():
        if ln.startswith(k + "="):
            out_lines.append(k + "=" + v)
            done.add(k)
            matched = True
    if not matched:
        out_lines.append(ln)
for k, v in settings.items():
    if k not in done:
        out_lines.append(k + "=" + v)
env_path.write_text("\n".join(out_lines) + "\n")
print("env configured:", ", ".join(sorted(settings)))
