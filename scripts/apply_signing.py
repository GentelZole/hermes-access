#!/usr/bin/env python3
"""
Re-apply release signing to app/android/app/build.gradle.

`npx expo prebuild` regenerates build.gradle and resets the release build
type to the debug keystore. Run this after every prebuild to restore the
HAMAL KSA release signing (reads .secrets/signing.properties — never
committed).

Idempotent: safe to run multiple times.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GRADLE = ROOT / "app/android/app/build.gradle"
PROPS = ROOT / ".secrets/signing.properties"

src = GRADLE.read_text()

if "signingProps" in src:
    print("already patched")
    sys.exit(0)

if not PROPS.exists():
    print(f"ERROR: {PROPS} missing", file=sys.stderr)
    sys.exit(1)

# 1) loader block after projectRoot definition
loader = '''
// Release signing credentials live OUTSIDE the repo (never committed).
// rootDir = <repo>/app/android  →  signing props at <repo>/.secrets/
def signingPropsFile = file("${rootDir}/../../.secrets/signing.properties")
def signingProps = new Properties()
if (signingPropsFile.exists()) {
    signingPropsFile.withInputStream { signingProps.load(it) }
}
'''
anchor = 'def projectRoot = rootDir.getAbsoluteFile().getParentFile().getAbsolutePath()\n'
if anchor not in src:
    print("ERROR: projectRoot anchor not found", file=sys.stderr)
    sys.exit(1)
src = src.replace(anchor, anchor + loader, 1)

# 2) release signingConfig inside signingConfigs { debug { ... } }
release_cfg = '''
        if (signingPropsFile.exists()) {
            release {
                storeFile file(signingProps['STORE_FILE'])
                storePassword signingProps['STORE_PASSWORD']
                keyAlias signingProps['KEY_ALIAS']
                keyPassword signingProps['KEY_PASSWORD']
            }
        }
'''
m = re.search(r"(signingConfigs \{\s*debug \{[^}]*\})", src)
if not m:
    print("ERROR: debug signingConfigs block not found", file=sys.stderr)
    sys.exit(1)
src = src.replace(m.group(1), m.group(1) + release_cfg, 1)

# 3) buildTypes.release uses release signing when available
src = src.replace(
    "signingConfig signingConfigs.debug\n            def enableShrinkResources",
    "signingConfig signingPropsFile.exists() ? signingConfigs.release : signingConfigs.debug\n            def enableShrinkResources",
    1,
)

GRADLE.write_text(src)
print("patched:", GRADLE)
