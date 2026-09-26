# Contributing to Hermes Access

Thanks for wanting to help. This project is small and security-first, so the bar is mostly about *verifying* rather than *volume*: a PR that touches native code and was never booted on a device will be sent back.

- [Dev setup](#dev-setup)
- [Code style](#code-style)
- [Working on native code](#working-on-native-code)
- [Pull request checklist](#pull-request-checklist)
- [Commit conventions](#commit-conventions)
- [Security](#security)

---

## Dev setup

**Requirements**

| Tool | Version |
|---|---|
| Node | **20 or newer** |
| Java | 21 |
| Android SDK | build-tools 36, platform matching `app/app.json` |
| Python | 3.10+ (only if you work on `bridge/`) |

### The app

```bash
git clone <your-fork>
cd hermes-access/app
npm ci                 # not `npm install` — the lockfile is committed
npx expo run:android   # first native build + install on a connected device/emulator
```

After the first build, day-to-day work is:

```bash
npx expo start --dev-client   # JS-only iteration
```

Use a **development build**, not Expo Go. The app depends on native modules (`expo-secure-store`, `expo-audio`, `expo-file-system`) that Expo Go does not carry.

### The bridge

```bash
cd hermes-access
cp .env.example .env               # edit BRIDGE_GATEWAY_URL / BRIDGE_LABEL
python bridge/server.py gen        # prints a one-time pairing code
python bridge/server.py            # or run the service
```

The bridge reads `API_SERVER_KEY` from `~/.hermes/.env`. Never put a real key in `.env`, in a test, or in an issue.

### Environment

`.env.example` at the repo root documents every variable. `.env` itself is gitignored — keep it that way.

---

## Code style

* **TypeScript, strict.** `app/tsconfig.json` sets `"strict": true` and does not opt out. Do not add `any` or `@ts-ignore` to silence a real problem; fix the type.
* **Path aliases.** Import app code through `@/*` (→ `app/src/*`) and assets through `@/assets/*`.
* **The type gate is `tsc --noEmit`. Run it from `app/`:**

  ```bash
  cd app && npx tsc --noEmit
  ```

  This is what CI runs, and a PR that does not pass it locally will not pass there.
* **Comments explain *why*.** This codebase is dense with short comments recording non-obvious platform behaviour (why `Content-Type` must not be set on a multipart `fetch`, why the recorder's URI needs a poll loop after `stop()`, why `allowBackup`-style defaults matter). Keep that habit; do not add noise.
* **Secrets never enter the repo.** Not in code, not in tests, not in screenshots, not in docs. CI runs a secret scan over tracked files and fails the build on a hit.

---

## Working on native code

`app/android/` is a **generated** folder — it is intentionally gitignored (see `app/.gitignore`). It is created by `npx expo prebuild` and you should treat it as disposable output, not as source of truth.

### The prebuild landmine

`npx expo prebuild` **regenerates** `app/android/app/build.gradle`, which resets the release build type to the debug keystore. Consequences:

* **Never run `expo prebuild --clean` on a working checkout.** It wipes the generated native tree and any local native edits you have not reproduced elsewhere.
* **After any `prebuild`, re-apply release signing:**

  ```bash
  python scripts/apply_signing.py    # idempotent; prints "already patched" if not needed
  ```

  It reads `.secrets/signing.properties` (never committed) and re-wires the release `signingConfig`. If you skip it, your "release" APK is signed with the debug key.

### Native-module changes must be boot-tested

Adding or upgrading a native module (audio, secure storage, file system, anything with a JSI/native bridge) can compile cleanly and still kill the app during initialization — an audio native module once crashed the app at startup while `tsc` and Gradle were both perfectly happy.

So for **any** change that adds, removes, or bumps a native dependency, before you open the PR:

1. **Build for x86_64** (the emulator ABI) and install it:

   ```bash
   bash scripts/build-apk-x86.sh          # assembleRelease -PreactNativeArchitectures=x86_64
   # or: cd app/android && ./gradlew :app:assembleRelease -PreactNativeArchitectures=x86_64
   ```

2. **Boot the app on an emulator** and walk: cold start → Identity tab → Chat → Voice.
3. **Check logcat for a hard crash**, not just for warnings:

   ```bash
   adb logcat -d | grep -i "FATAL EXCEPTION"
   ```

   An empty result is the pass condition. If you see one, the PR is not ready — a native-module regression that only shows on device is exactly what this step exists to catch.

For a physical-device arm64 build, `scripts/build-apk.sh` builds `arm64-v8a`.

---

## Pull request checklist

Copy this into your PR description (the template also contains it):

- [ ] `cd app && npx tsc --noEmit` passes with no errors
- [ ] Change is scoped to what the PR title says; no drive-by refactors
- [ ] No secrets, keys, tokens, or personal hostnames/addresses added anywhere
- [ ] Docs updated if behaviour, configuration, or API shapes changed
  ([README.md](README.md), [docs/ARCHITECTURE.md](ARCHITECTURE.md), [SECURITY.md](SECURITY.md))
- [ ] **If a native module was added, removed, or bumped:** built for `x86_64`, booted on an emulator, and `adb logcat -d | grep -i "FATAL EXCEPTION"` is empty
- [ ] **If pairing, token storage, or transport changed:** say so explicitly in the description — those paths get a closer review
- [ ] Screenshots or a short screen recording for visible UI changes
- [ ] Commits follow the convention below

---

## Commit conventions

Conventional commits, as used throughout this repo's history:

```
feat(voice): interrupt playback on orb tap
fix(store): refuse cleartext base URLs outside the tailnet
docs(readme): document the bridge env vars
chore(signing): re-apply release signing after prebuild
refactor(client): extract retry policy from getJson
```

`feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci` — with an optional scope. One logical change per commit; keep the subject imperative and under ~72 characters.

---

## Security

Do **not** open a public issue for a security problem. Use the private channel in [SECURITY.md](../SECURITY.md). If your PR touches an authentication, token-storage, or transport path, say so in the description so it can be reviewed with that in mind.

---

> **صُنع بواسطة / Made by HAMAL KSA** — م. طارق منفل النور بخيت · 0568143175 · tarekmonufal@gmail.com