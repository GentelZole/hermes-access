# Hermes Access — Product Requirements Document (PRD)

| | |
|---|---|
| **Product** | Hermes Access — mobile client for Hermes Agent |
| **Version** | 1.0 (v3.0, locked) |
| **Date** | 2026-08-07 |
| **Owner** | HAMAL KSA — Eng. Tarig Monaffal Alnor Bakhet |
| **Executor** | Lolo (AI engineering team) |
| **Status** | Approved for execution — Android first |
| **License** | PolyForm Noncommercial 1.0.0 — free for personal use, no commercial use |

---

## 1. Summary

Hermes Access is a secure, artistic, open-source Android (later iOS) application that gives users a native mobile gateway to their [Hermes Agent](https://github.com/NousResearch/hermes-agent) — the self-improving AI agent by Nous Research — without depending on Discord or Telegram as intermediaries. The product also serves as the public engineering flagship of **HAMAL KSA**.

**One sentence:** *Point your phone at your Hermes agent, paste one link, and you have a beautiful, secure, native assistant — chat, voice, files, cron, anywhere.*

## 2. Goals & Non-Goals

### Goals
- G1. **One-link secure pairing** — no manual key entry for the happy path.
- G2. **Security proven** — documented threat model, implemented controls, independent-style audit report published before release.
- G3. **Chat-first core** — streaming chat with in-session **topics**, markdown, code blocks, media.
- G4. **Voice conversation** — push-to-talk and hands-free.
- G5. **Any-size file transfer** — resumable chunked upload/download, no arbitrary caps.
- G6. **Light dashboard** — cron jobs, skills, memory, device management. No config overload.
- G7. **Artistic identity** — a designed product, not a template; HAMAL-brand quality.
- G8. **Fully documented** — README (En/Ar), protocol docs, API reference, SECURITY.md.
- G9. **HAMAL KSA visibility** — tasteful branding (splash footer, About screen, repo).

### Non-Goals (v1)
- Not a full Hermes Dashboard port (no config editing, no model management beyond viewing).
- Not a multi-user/multi-tenant server product.
- No iOS until Phase 9 (separate go-ahead).
- No app-store publication commitments before security audit passes.

## 3. Users & Stories

| Persona | Story |
|---|---|
| Personal power user | "I run Hermes at home; I want it in my pocket like Siri/Alexa but smarter." |
| Technical user | "I want one-link pairing, not copying API keys around." |
| Field user | "My agent runs long jobs; I want a push notification when it finishes, and my 3 GB dataset uploaded." |
| HAMAL KSA | "Every install demonstrates our engineering and security discipline." |

## 4. Functional Requirements

### FR-1 Pairing (priority: P0)
- FR-1.1 App first-run shows a copyable instruction line for the user's agent (installs the pairing skill via `hermes skills install <URL>`).
- FR-1.2 Agent issues pairing link via `hermes access-link` (CLI provided in repo) → one-time token (256-bit random, TTL 10 min, single use) → deep link `hermesaccess://pair?h=<host>&p=<port>&t=<token>` + QR rendering.
- FR-1.3 App redeems token at the bridge → receives per-device bearer token → stores it in Android Keystore / iOS Keychain only.
- FR-1.4 Device list management: name, last-seen, revoke (both from app and `hermes pairing`-style CLI).
- FR-1.5 Fallback: manual host + API key entry behind "Advanced" (works without the bridge).

### FR-2 Chat (P0)
- FR-2.1 Session list (create, rename, resume, delete) via Sessions API.
- FR-2.2 Streaming replies (SSE) with tool-progress indicators; stop button mid-run.
- FR-2.3 **Topics**: sessions organize into topics (backed by session fork/child sessions); topic switcher in chat header.
- FR-2.4 Markdown, code blocks with copy, tables, LaTeX-lite (plain rendering), image/file attachments inline.
- FR-2.5 Native **Approve / Deny** buttons for dangerous-command approvals (Runs approval endpoint), with expiry display.
- FR-2.6 Offline/network-drop: reconnect, resume event stream from Runs API; queue unsent messages.

### FR-3 Voice (P1)
- FR-3.1 Push-to-talk: record → STT → send as text (with original audio attach option).
- FR-3.2 Spoken replies via agent TTS audio; per-session toggle.
- FR-3.3 Hands-free mode: wake on tap, continuous conversation loop, lock-screen friendly.

### FR-4 Files (P0)
- FR-4.1 Upload any file type/size via chunked resumable protocol (5–10 MB chunks, parallel, progress %, resume after interruption).
- FR-4.2 Downloads of agent-produced files, same resumability; open/share with Android intents.
- FR-4.3 Disk-space pre-check with warning.
- FR-4.4 Files land in an agent-visible workspace path; chat message notifies the agent of the path.

### FR-5 Cron & Skills (P1)
- FR-5.1 Jobs list: schedule, next run, last status/output preview.
- FR-5.2 Create / edit (prompt, schedule) / pause / resume / run-now / delete.
- FR-5.3 Skills browser (read-only list + descriptions); Memory viewer (read + add note).

### FR-6 Notifications (P1)
- FR-6.1 Push on: long-run completion, approval requested, cron failure.
- FR-6.2 Implementation path: gateway hook → ntfy topic → FCM bridge; user can self-host ntfy.
- FR-6.3 In-app notification center with history.

### FR-7 Branding (P2)
- FR-7.1 Splash screen: Hermes Access logo + "by HAMAL KSA" footer.
- FR-7.2 About screen: product info, license, link to HAMAL KSA, open-source acknowledgments (Nous Research trademark notice).
- FR-7.3 No intrusive ads — branding is tasteful and static.

## 5. Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-1 | **Security**: TLS 1.2+ only; secrets in Keystore/Keychain; no secrets in logs, code, or repo; pairing endpoint rate-limited + fail-closed; gitleaks + dependency audit in CI |
| NFR-2 | **Privacy**: no telemetry without explicit opt-in (default: none) |
| NFR-3 | **Performance**: chat first-token <1s on LAN/Tailscale; 60fps lists; APK <60MB |
| NFR-4 | **Resilience**: all streams resumable; app survives process death mid-run |
| NFR-5 | **Compatibility**: Android 10+ (API 29), arm64 primary |
| NFR-6 | **Accessibility**: screen-reader labels, dynamic font size, contrast AA |
| NFR-7 | **i18n**: English + Arabic UI from day one |

## 6. Security Program (proof obligations)

| Deliverable | Where | Gate |
|---|---|---|
| STRIDE threat model | `docs/security/THREAT_MODEL.md` | before bridge code |
| Pairing protocol spec (token lifecycle, replay tests) | `docs/PROTOCOL.md` | before Phase 3 done |
| OWASP MASVS checklist executed | `docs/security/MASVS.md` | Phase 8 |
| Audit report (cyber-command methodology) | `docs/security/AUDIT_REPORT.md` | **release blocker** |
| Vulnerability disclosure policy | `SECURITY.md` | with repo public |

**Release rule: no public repo / APK release while any Critical or High finding is open.**

## 7. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| App | Expo + React Native + TypeScript | single codebase Android+iOS, EAS cloud builds (no Mac needed), owner-team familiarity |
| State/net | Zustand + `@microsoft/fetch-event-source` | SSE streaming, resume logic |
| Storage | expo-secure-store (secrets) + MMKV (data) | hardware-backed secrets |
| Design | Custom design system via claude-design / taste-skill / hallmark | artistic, anti-template requirement |
| Bridge | Python FastAPI next to Hermes gateway | same ecosystem, small surface |
| Pairing CLI | `hermes access-link` (Python, ships in repo) | agent-callable, skill-documented |
| Push | ntfy → FCM (Phase 7) | self-hostable, no vendor lock-in |
| CI | GitHub Actions: lint, unit tests, gitleaks, EAS APK build per release | documentation-grade quality bar |

## 8. Design Direction (artistic mandate)

- Identity workshop first (Phase 1): logo, wordmark, palette, typography (Arabic: Tajawal/Cairo; Latin: distinctive display face), motion language, app icon — **mockups approved by owner before any UI code**.
- Warm dark theme with gold accents (continuity with Hermes brand) + HAMAL mark; micro-interactions, illustrated onboarding, custom iconography.
- Anti-slop checks applied (hallmark/taste reviews) at Phase 1 and Phase 8.

## 9. Documentation Deliverables

- `README.md` — English + العربية: what it is, screenshots, quick start (one-link pairing), advanced manual setup, FAQ.
- `docs/ARCHITECTURE.md` — components, data flow, sequence diagrams.
- `docs/PROTOCOL.md` — pairing + file-transfer wire protocol.
- `docs/API.md` — bridge endpoints reference.
- `SECURITY.md` + `docs/security/*` — per §6.
- Inline TSDoc/docstrings in all public modules.

## 10. Licensing & IP

- **App + bridge + skill**: PolyForm Noncommercial License 1.0.0 — free for personal use; commercial use requires written license from HAMAL KSA.
- Hermes Agent itself remains Nous Research's open-source project; we only integrate via its public API. Trademark notice in README/About.
- Repo under HAMAL GitHub org (name: `hermes-access`).

## 11. Milestones & Release Plan

| Milestone | Exit criteria | Phase |
|---|---|---|
| M0 Connected | API server hardened; real Android phone chatting over Tailscale | 0 |
| M1 Identity locked | design system + approved mockups | 1 |
| M2 MVP chat | streaming chat + topics + manual connect on device | 2 |
| M3 One-link pairing | pairing E2E verified incl. replay rejection | 3 |
| M4 Files | 2 GB up/down resume test passed | 4 |
| M5 Voice | full voice round-trip | 5 |
| M6 Dashboard-lite | cron/skills/settings done | 6 |
| M7 Notifications | push on task completion | 7 |
| M8 Proven secure | audit report published, zero open Critical/High | 8 |
| **M9 v1.0.0 public** | repo public, README En/Ar, APK release, demo video | 10 |
| M10 iOS | TestFlight build (later go-ahead) | 9 |

## 12. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Hermes API changes upstream | breaks client | pin tested version + capabilities endpoint probing + CI smoke tests |
| SSE reliability on mobile networks | stuck chat | Runs API polling fallback + exponential reconnect |
| Large-file transfer on flaky networks | failed uploads | chunked resumable protocol (core requirement) |
| "Hermes" trademark friction | takedown | client naming convention + trademark acknowledgment; contact Nous if scaling |
| iOS without a Mac | blocked | Expo EAS cloud builds (deferred to Phase 9 anyway) |
| Key leakage | catastrophic | Keystore-only storage, loopback/Tailscale bind default, revocation, audit |

## 13. Success Metrics (post-release)

- Pairing success rate ≥95% first attempt; median setup time <60s.
- GitHub: stars, issues handled <48h, clean fresh-clone builds.
- Zero confirmed security incidents; audit findings closed publicly.
- HAMAL KSA visibility: About-screen impressions, inbound inquiries attributed to the app.

---

*This PRD is locked. Execution state tracked in `STATE.md`. Changes require owner approval.*
*© 2026 HAMAL KSA. Hermes Agent is a trademark/product of Nous Research; Hermes Access is an independent client.*
