# Hermes Access — Mobile Client for Hermes Agent
**Project Plan v3.0 (FINAL)** — 2026-08-07 — Owner: Eng. Tarig Monaffal Alnor Bakhet / HAMAL KSA — Executor: Lolo

> **Status: PLAN LOCKED — execution authorized, starting Android.**
> Companion document: `PRD.md` (product requirements, publication-ready English).

---

## 0. v3 Final Decisions (locked by Eng. Tarig)

| Decision | Value |
|---|---|
| **App name** | **Hermes Access** (professional name, chosen by owner) |
| **Branding** | Advertisement vehicle for **HAMAL KSA** — HAMAL branding in About screen, splash footer, repo ownership |
| **Platform order** | **Android first** (Phase 1–8), iOS later (Phase 9, needs Apple Dev $99) |
| **License** | **Free for personal use, NOT for commercial use** — PolyForm Noncommercial License 1.0.0 |
| **Documentation** | Fully documented: README (En+Ar), SECURITY.md, docs/ tree, inline code docs |
| **Cybersecurity** | Proven, not claimed: threat model + security audit + OWASP MASVS checklist + published audit report BEFORE public release |

---

## 1. Vision

**Hermes Access** is a polished, artistic, security-proven mobile client for [Hermes Agent](https://github.com/NousResearch/hermes-agent) — the open-source self-improving AI agent by Nous Research. It connects to any Hermes gateway over the official API Server, with one-link secure pairing, any-size file transfer, voice conversation, and a light dashboard (chat, topics, cron, skills).

It doubles as HAMAL KSA's flagship public open-source showcase: our engineering quality, security discipline, and design taste — advertised tastefully inside the app (About screen + splash) and in the repo.

### Naming note (research)
"Hermes" is Nous Research's brand; an existing third-party app "Hermes Agent Client" is on Google Play. We ship as **"Hermes Access"** — descriptive, professional, clearly a client not the agent itself. README carries a trademark acknowledgment: *Hermes Agent is a product of Nous Research. This is an independent client.* (Same pattern the existing community clients use — keeps us legally clean.)

---

## 2. Architecture (final)

```
┌──────────────────────────────────┐
│  Hermes Access (Expo/RN + TS)     │
│  Android first • iOS in Phase 9   │
│  HAMAL-branded artistic UI        │
└──────────┬───────────────────────┘
           │ HTTPS + per-device bearer token
           │ Tailscale (ours) / LAN / Tailscale Funnel or user's own TLS (public)
┌──────────▼───────────────────────────────────────┐
│ Hermes Gateway — API Server :8642  (existing)     │
│  chat • runs • sessions • jobs • skills • caps    │
├──────────────────────────────────────────────────┤
│ hermes-access-bridge  (our new companion service) │
│  ① Pairing  — one-time link/QR device enrollment  │
│  ② Files    — chunked resumable up/download       │
│  ③ Push     — completion notifications (ntfy→FCM) │
│  Shipped in the SAME repo, MIT→PolyForm-NC, docs  │
└──────────────────────────────────────────────────┘
```

- **Why a bridge service**: verified in code — the API Server rejects file uploads (`400 unsupported_content_type`), has no pairing flow, and no push channel. The bridge is the minimum honest gap-filler; the app still works degraded (manual key + inline images) without it.
- **Skill distribution for agents**: repo ships `skill/hermes-access-pairing/SKILL.md`. App first-run screen shows a copy-paste line: *"Ask your agent: install the Hermes Access pairing skill from <raw GitHub URL>"* → agent runs `hermes skills install <URL>` → agent then knows exactly how to issue pairing links (`hermes access-link` CLI) and troubleshoot. This is the verified Hermes mechanism for teaching agents new procedures.

---

## 3. Security program ("proven", not just claimed)

| # | Deliverable |
|---|---|
| S1 | **Threat model** (STRIDE) in `docs/security/THREAT_MODEL.md` before coding the bridge |
| S2 | One-time pairing tokens (256-bit, 10-min TTL, single-use), per-device revocable tokens in SecureStore/Keychain, TLS everywhere, API bind loopback/Tailscale-only by default, rate limiting + fail-closed pairing endpoint |
| S3 | No secrets in repo; CI secret-scan (gitleaks); dependency audit in CI |
| S4 | **Pre-release audit** using `cyber-command` skill: OWASP MASVS Mobile checklist + API security review + code review of all auth paths |
| S5 | Published `SECURITY.md` with vulnerability reporting policy + the audit report itself in `docs/security/` |

---

## 4. Phases (execution order — ANDROID FIRST)

| Phase | Content | Est. |
|---|---|---|
| **0** | Enable + harden API Server on our machine; verify from a real Android phone over Tailscale | 0.5d |
| **1** | Design identity (claude-design + taste-skill + hallmark): logo, palette, motion, screen mockups → **owner approval before UI code** | 2d |
| **2** | Repo scaffold (monorepo: `app/` + `bridge/` + `skill/` + `docs/`), CI (lint/tests/APK build), Expo project, manual-connect fallback + streaming chat + markdown + topics (session forks) | 4d |
| **3** | Pairing: `hermes access-link` CLI + bridge endpoint + deep link `hermesaccess://pair?...` + QR in terminal/Discord | 2d |
| **4** | Files: chunked resumable upload/download, any size, progress + resume, in-chat attach | 2d |
| **5** | Voice: push-to-talk → STT → agent → TTS; hands-free mode | 2d |
| **6** | Dashboard-lite tabs: Cron manager, Skills/Memory viewer, Settings + device management, HAMAL About screen | 2d |
| **7** | Push notifications: gateway hook → ntfy → device (FCM wrapper) | 1d |
| **8** | **Security program S1–S5 + full documentation pass + real-device test matrix** | 3d |
| **9** | iOS: EAS builds, Apple Developer enrollment, TestFlight (later, separate go-ahead) | 1w |
| **10** | Public release: GitHub repo public, README En+Ar, demo video, APK release v1.0.0 | 1d |

**Total Android-complete: ~3.5–4 weeks part-time. Public release: end of Phase 10.**

---

## 5. Acceptance criteria (proven on real device)

1. One-link pairing from Discord/TUI in <30s; token single-use & expiring (verified by replay attempt).
2. Streaming chat with topics survives network drop (reconnect + resume).
3. 2 GB file up AND down, resumable after interruption.
4. Full voice round-trip.
5. Cron job create/pause/trigger from app.
6. Push notification on long-task completion.
7. Security audit: zero critical/high findings open at release.
8. Fresh-clone build works: `git clone → npm i → build APK` documented and tested.

---

## 6. Budget

| Item | Cost |
|---|---|
| Apple Developer (Phase 9 only) | $99/yr — later |
| Play Console (optional; APK via GitHub Releases is free) | $25 once |
| Expo EAS builds | free tier |
| Infra | $0 (machine + Tailscale exist) |

---

## 7. Repo & license layout

```
hamalco/hermes-access/            (GitHub, HAMAL org)
├── app/            Expo React Native app (TypeScript)
├── bridge/         hermes-access-bridge (FastAPI: pairing/files/push)
├── skill/          hermes-access-pairing/SKILL.md (agent knowledge)
├── docs/           architecture, pairing protocol, API reference,
│   └── security/   THREAT_MODEL.md, AUDIT_REPORT.md, MASVS checklist
├── LICENSE.md      PolyForm Noncommercial License 1.0.0
├── SECURITY.md     vuln reporting policy
└── README.md       English + العربية
```

**License text core:** free for personal, non-commercial use. Commercial use (reselling, bundling into paid products, internal business use beyond personal) requires a written license from HAMAL KSA. Personal users: fully free, including modifications for themselves.

*The plan is now final. Execution state will be tracked in `STATE.md` from Phase 0 onward.*
