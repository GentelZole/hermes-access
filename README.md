# Hermes Access

**The mobile gateway to your Hermes Agent — chat, voice, files, cron. In your pocket.**

> Made by **HAMAL KSA** · Free for personal use · [PolyForm Noncommercial 1.0.0](LICENSE.md)

**بوّابتك المحمولة إلى وكيل Hermes — شات، صوت، ملفات، cron. في جيبك.**

> صُنع بواسطة **HAMAL KSA** · مجاني للاستخدام الشخصي · ترخيص PolyForm Noncommercial 1.0.0

---

## What is this? · ما هذا؟

**Hermes Access** is a secure, artistic Android client (iOS planned) for [Hermes Agent](https://github.com/NousResearch/hermes-agent) — the open-source self-improving AI agent by Nous Research. Point it at any Hermes gateway's API Server and get a native assistant: streaming chat with topics, voice conversation, any-size file transfer, and cron management — without depending on Discord or Telegram.

**هيرمس أكسس** هو تطبيق أندرويد آمن وفني (وiOS لاحقاً) لوكيل [Hermes Agent](https://github.com/NousResearch/hermes-agent) — الوكيل الذاتي التحسين مفتوح المصدر من Nous Research. وجّهه نحو أي Hermes gateway واحصل على مساعد أصلي: شات متدفق مع مواضيع، محادثة صوتية، نقل ملفات بأي حجم، وإدارة cron — بدون الاعتماد على Discord أو Telegram.

*Hermes Agent is a product of Nous Research. Hermes Access is an independent client.*

## Three identities, one app · ثلاث هويات في تطبيق واحد

Switch between three complete design directions anytime — each restyles the whole app instantly:

| | | |
|---|---|---|
| 🌙 **Aurum Noir** · الذهبي الأسود | ☀️ **Riyadh Daylight** · نهار الرياض | ⚡ **Night Courier** · ساعي الليل |
| Warm obsidian & molten gold | Warm paper & burnt clay | Ops-deck & neon gold |

## Features (v0.x — active development) · المزايا

- ✅ Streaming chat against the official Hermes API Server (SSE)
- ✅ Three switchable identity themes (persisted)
- ✅ Topics per session, stop-mid-run, approvals UI (wiring in progress)
- 🔜 One-link secure pairing (Phase 3)
- 🔜 Any-size resumable file transfer (Phase 4)
- 🔜 Voice conversation (Phase 5)
- 🔜 Cron / skills / memory dashboard (Phase 6)
- 🔜 Push notifications (Phase 7)

Security posture and the pre-release audit: see [SECURITY.md](SECURITY.md).

## Quick start (development) · البدء السريع

Requirements: Node 20+, Android SDK (build-tools 36), Java 21.

```bash
cd app
npm install
npx expo prebuild --platform android --no-install
cd android && ./gradlew assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

Typecheck: `npx tsc --noEmit` (run from `app/`).

### Connecting to your gateway

The app talks to the Hermes **API Server** (enable it on your gateway machine):

```bash
# ~/.hermes/.env on the machine running `hermes gateway`
API_SERVER_ENABLED=true
API_SERVER_KEY=<strong random key>
API_SERVER_HOST=<your reachable interface>   # e.g. your Tailscale IP
API_SERVER_PORT=8642
```

**Recommended:** reach the gateway over [Tailscale](https://tailscale.com) — encrypted by default, no ports opened to the internet.

## Repository layout · بنية المستودع

```
app/        Hermes Access mobile app (Expo / React Native / TypeScript)
bridge/     hermes-access-bridge — pairing, files, push (Phase 3+)
skill/      hermes-access-pairing SKILL.md — teaches agents the pairing flow
docs/       PLAN.md, PRD.md, design artifacts, security docs
```

## License · الترخيص

**PolyForm Noncommercial License 1.0.0** — free for personal, non-commercial use (personal projects, study, hobby, research). Commercial use requires a written license from HAMAL KSA. See [LICENSE.md](LICENSE.md).

Dependencies remain under their own licenses. Hermes Agent itself is Nous Research's open-source project.

## HAMAL KSA

This application is the public open-source flagship of **HAMAL KSA** — engineering quality, security discipline, and design taste, in one artifact.

هذا التطبيق هو الواجهة المفتوحة المصدر لشركة **HAMAL KSA** — جودة هندسية، انضباط أمني، وذوق تصميمي، في منتج واحد.

© 2026 HAMAL KSA
