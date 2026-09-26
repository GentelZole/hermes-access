# Security Policy — Hermes Access

Security is the primary design constraint of this project, not a feature added later. This document records the threat model, what is actually protected, what is deliberately *not* a vulnerability, and how to report a real issue.

## Reporting a vulnerability

**Do not open a public GitHub issue for a security problem.**

Report it privately:

- **Email:** tarekmonufal@gmail.com — subject prefix `[SECURITY] hermes-access`
- Include: what you found, reproduction steps, the affected version or commit, and a proof of concept if you have one.

Do not include live credentials, and do not test against infrastructure you do not own. If you need a test instance, run the bridge and a gateway yourself.

### Response timeline

| Stage | Target |
|---|---|
| Acknowledge receipt | 48 hours |
| Initial triage + severity | 5 business days |
| Fix or mitigation plan | 14 days (Critical/High), 30 days (Medium/Low) |
| Public disclosure | Coordinated with the reporter, after a fix ships |

## Scope

**In scope**

- The mobile app: `app/` — pairing, token storage, the gateway client, the cleartext guard, the voice screen's request paths.
- The pairing bridge: `bridge/server.py` — code generation, redemption, rate limiting, the voice relay.
- The pairing skill: `skill/hermes-access-pairing/SKILL.md`.
- The interaction of any of the above with a Hermes Agent API Server.

**Out of scope**

- Vulnerabilities in **Hermes Agent** itself — report those upstream to [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent).
- **Your own deployment mistakes** — publishing `API_SERVER_KEY`, exposing the bridge to the open internet without TLS, or running the app against a gateway you do not control.
- Findings that require an attacker who already has root access to your device or your gateway host.

---

## Threat model

### Who we defend against

1. **A network attacker** between the phone and the gateway — another device on the local network, a hostile Wi-Fi access point, or anyone who finds an accidentally exposed port.
2. **Someone who finds the phone** — a lost or stolen device in an unlocked state, or an attacker with brief physical access.
3. **A backup or file-system leak** — device backups, adb pulls, or anything else that scrapes app data off the device.
4. **A leaked pairing code** — a code overheard in a chat log, a screenshot, or a terminal scrollback.

### Assets being protected

| Asset | Sensitivity |
|---|---|
| `API_SERVER_KEY` (the gateway bearer token) | Highest — grants full agent access to the gateway |
| Session content, message history, transcripts | High — private conversations with the agent |
| Pairing codes | High but short lived — a live code is a one-shot key to the above |
| Connection metadata (base URL, label) | Low |

### What is **not** defended against

- A rooted or compromised device: code running as root can read Keystore-backed secrets on many devices, and this app cannot change that.
- A compromised gateway host: if the server is owned, the agent is owned.
- Key rotation hygiene failures: see the note on the shared key below.

---

## What is protected, and how

1. **Transport — encrypted by default, cleartext refused to strangers.** The reference deployment is a Tailscale mesh: WireGuard-encrypted end to end, ACL-gated, with no ports exposed to the internet. Public exposure is supported but requires you to terminate TLS yourself. The app **never** downgrades silently: `isSafeBaseUrl()` in `app/src/gateway/store.ts` accepts only `https://`, loopback, and Tailscale's CGNAT range (`100.64.0.0/10`); anything else is rejected before the key is stored — enforced at pairing, at manual connect, and again on every restart. The Android network-security-config allows cleartext because Android's config cannot express CIDR ranges and every user's gateway lives at an arbitrary tailnet address, so the guard lives in the client instead (`app/assets/configs/network_security_config.xml` documents this trade-off).

2. **Token storage — Android Keystore only.** The bearer token is written and read exclusively through `expo-secure-store` (`app/src/gateway/store.ts`). It is never written to `AsyncStorage`, never logged, never sent anywhere except the gateway you paired with. Only non-secret metadata (base URL, label) is persisted in the ordinary store. On web/dev-SSR, where SecureStore does not exist, the token is held in memory only and never persisted. If SecureStore rejects a write, the app keeps an in-session copy rather than silently writing the key somewhere weaker.

3. **Pairing — single use, short lived, fail closed.** Codes are 256-bit (`secrets.token_urlsafe(32)`), expire after 10 minutes, and are marked used *before* the key is read, so a failure mid-redemption still burns the code. Redemption is rate-limited (5 attempts/minute/IP) and returns generic errors. The pairing link itself carries no durable secret — it is a one-shot ticket, not a credential.

4. **The bridge never persists or logs the key.** It reads `API_SERVER_KEY` from `~/.hermes/.env` at request time, hands it over exactly once, and stores nothing but the code table (mode `0600`). Voice uploads are written to a temp directory and removed in a `finally` block. Comparison of supplied tokens uses `hmac.compare_digest`.

5. **Device backup.** The app persists no secret in a backed-up location by design (the token lives in Keystore, never `AsyncStorage`), so a device backup does not carry the gateway key.

6. **Release integrity.** Release signing credentials live outside the repo, in `.secrets/signing.properties`, which is gitignored; the release build HARD-FAILS (GradleException) when it is missing — a debug-signed release can never be produced by accident. CI scans tracked files for committed secrets and fails on a hit. There is zero telemetry and no analytics, crash-reporting, or advertising SDK in the dependency set.

---

## Not a vulnerability

These are deliberate, documented properties. Reports about them will be closed as working-as-intended — though the reasoning is explained here so you can judge it yourself.

**1. The bridge hands the same `API_SERVER_KEY` to every paired device.**

There is one gateway key and every paired phone receives it. This is by design: the bridge is a *delivery* mechanism for the key, not an authorization server, and per-device tokens would require a credential store the gateway does not have. **The consequence is that revoking one device means rotating `API_SERVER_KEY` on the gateway and restarting it**, which invalidates every paired device — after which the other devices re-pair with a fresh one-time code. Treat pairing as "granting the same access this key already grants", and rotate on any device you no longer trust.

**2. `/pair` and `/agent` are reachable over public HTTPS.**

Phone-first pairing is the whole point: a phone off the tailnet must still be able to pair. Reaching `/pair` without a valid code yields nothing but `404`/`410`/`429`, and the code travels over TLS. If you do not want that surface public, do not expose it — Tailscale-only deployment is the reference configuration and needs no proxy at all.

**3. Pairing codes travel in a chat message.**

Codes are issued by *your* agent, delivered in *your* agent's channel, and are single use with a 10-minute TTL. A code that leaks after it is redeemed is already worthless. This is precisely why codes are single use, which is why the bridge returns one-time tickets rather than reusable device tokens.

**4. Cleartext is permitted at the Android network layer.**

See item 1 above: the guard is enforced in the client (`isSafeBaseUrl`) because Android's network-security-config cannot match CIDR ranges. Over Tailscale, "cleartext" at the socket layer is still WireGuard-encrypted on the wire.

**5. The app accepts a manually entered base URL and token.**

Manual connect is an advanced, deliberate escape hatch for users with unusual deployments. It runs through the exact same `isSafeBaseUrl()` guard as pairing. A user pasting a key into a nonzero-risk host is a user choice, not a defect.

---

## Hardening your own deployment

- Bind the API Server to your Tailscale interface only, never `0.0.0.0`. Verify from the gateway host that loopback is refused and a bad key returns `401`.
- Generate `API_SERVER_KEY` as a strong random value a password manager would be happy with, and keep `~/.hermes/.env` at mode `600`.
- Keep the bridge on the tailnet. If you must expose it, terminate TLS in front of it and set `X-Forwarded-For` so rate limiting sees real client IPs.
- Rotate `API_SERVER_KEY` whenever a device leaves your trust set, then re-pair the devices you keep.
- Store `.secrets/signing.properties` outside version control and outside any synced folder.

---

© 2026 HAMAL KSA