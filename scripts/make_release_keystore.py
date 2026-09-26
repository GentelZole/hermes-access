#!/usr/bin/env python3
"""Regenerate keystore with ONE password for both store and key (AGP-safe).
Safe: this keystore has never signed a published build."""
import secrets
import subprocess
from pathlib import Path

sec = Path.home() / "projects/hermes-access/.secrets"
keystore = sec / "hermes-access.keystore"
keystore.unlink(missing_ok=True)

password = secrets.token_urlsafe(24)
cmd = [
    "keytool", "-genkeypair", "-v",
    "-keystore", str(keystore),
    "-alias", "hermes-access",
    "-keyalg", "RSA", "-keysize", "2048", "-validity", "10000",
    "-storepass", password,
    "-keypass", password,
    "-dname", "CN=Hermes Access, OU=Engineering, O=HAMAL KSA, L=Riyadh, C=SA",
]
r = subprocess.run(cmd, capture_output=True, text=True)
if r.returncode != 0:
    print("KEYTOOL FAILED:", r.stderr[-400:])
    raise SystemExit(1)

(sec / "signing.properties").write_text(
    "STORE_FILE=../../../.secrets/hermes-access.keystore\n"
    f"STORE_PASSWORD={password}\n"
    "KEY_ALIAS=hermes-access\n"
    f"KEY_PASSWORD={password}\n"
)
(sec / "signing.properties").chmod(0o600)
print("keystore regenerated; store+key password identical")
