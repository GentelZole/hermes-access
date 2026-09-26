#!/usr/bin/env python3
"""Phase 0: generate a strong API server bearer token, store it in
~/.hermes/.env and a permission-locked backup in the project secrets dir."""
import os
import secrets
from pathlib import Path

home = Path.home()
token_value = secrets.token_hex(32)
print("token generated, length:", len(token_value))

sec_dir = home / "projects/hermes-mobile-app/.secrets"
sec_dir.mkdir(parents=True, exist_ok=True)
os.chmod(sec_dir, 0o700)
(sec_dir / "api-server-key.txt").write_text("API_SERVER_KEY=" + token_value + "\n")
os.chmod(sec_dir / "api-server-key.txt", 0o600)

env_path = home / ".hermes/.env"
lines = env_path.read_text().splitlines() if env_path.exists() else []
out_lines = []
replaced = False
prefix = "API_SERVER_KEY="
for ln in lines:
    if ln.startswith(prefix):
        out_lines.append(prefix + token_value)
        replaced = True
    else:
        out_lines.append(ln)
if not replaced:
    out_lines.append(prefix + token_value)
env_path.write_text("\n".join(out_lines) + "\n")
print("updated ~/.hermes/.env" if replaced else "appended to ~/.hermes/.env")
