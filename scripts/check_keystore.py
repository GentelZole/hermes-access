#!/usr/bin/env python3
"""Diagnose + repair keystore signing credentials."""
import configparser
import subprocess
from pathlib import Path

sec = Path.home() / "projects/hermes-access/.secrets"
props = {}
for line in (sec / "signing.properties").read_text().splitlines():
    if "=" in line:
        k, v = line.split("=", 1)
        props[k.strip()] = v.strip()

print("store_password len:", len(props.get("STORE_PASSWORD", "")))
print("key_password  len:", len(props.get("KEY_PASSWORD", "")))
print("passwords identical:", props.get("STORE_PASSWORD") == props.get("KEY_PASSWORD"))

# Test store access
r = subprocess.run(
    ["keytool", "-list", "-keystore", str(sec / "hermes-access.keystore"),
     "-storepass", props["STORE_PASSWORD"]],
    capture_output=True, text=True)
print("store list rc:", r.returncode)
print(r.stdout[-400:] if r.returncode == 0 else r.stderr[-300:])

# If key password differs, test reading the specific key entry via jarsigner-style check
if r.returncode == 0 and props["STORE_PASSWORD"] != props["KEY_PASSWORD"]:
    print("\n-> Keypair password differs from store password; regenerating keystore with SAME password for both (safest for AGP)")
