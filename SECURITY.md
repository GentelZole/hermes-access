# Security Policy — Hermes Access

Security is the primary design constraint of this project. This document defines how vulnerabilities are reported and handled.

## Reporting a Vulnerability

**Do not open a public GitHub issue for security problems.**

Report privately:

- **Email:** security@hamalksa.com *(to be provisioned before v1.0 public release — see Phase 8 checklist)*
- Include: description, reproduction steps, affected version/commit, and any proof-of-concept if available.

## Response Timeline

| Stage | Target |
|---|---|
| Acknowledge receipt | 48 hours |
| Initial triage + severity | 5 business days |
| Fix or mitigation plan | 14 days (Critical/High), 30 days (Medium/Low) |
| Public disclosure | Coordinated with reporter, after fix ships |

## Scope

In scope: the mobile app (`app/`), the bridge service (`bridge/`, when landed), the pairing skill (`skill/`), and their interaction with a Hermes Agent API Server.

Out of scope: vulnerabilities in Hermes Agent itself (report upstream to [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent)), and self-inflicted misconfigurations (e.g., user exposing `API_SERVER_KEY` publicly).

## Security Model (summary)

1. **Transport** — Tailscale (encrypted mesh) is the reference deployment. Public exposure requires user-configured TLS; the app never downgrades silently.
2. **Pairing** — one-time tokens (256-bit, 10-min TTL, single use); the pairing link carries no durable secret.
3. **Device tokens** — per-device, revocable, stored only in Android Keystore / iOS Keychain (`expo-secure-store`). Never logged, never persisted elsewhere.
4. **Server binding** — reference deployment binds the API Server to the Tailscale interface only (verified: loopback refused, bad key → 401).
5. **Release rule** — no public release while any Critical or High finding from the audit (`docs/security/AUDIT_REPORT.md`) is open.

## Pre-release Audit

Before v1.0.0 goes public, the project completes:

- [ ] STRIDE threat model (`docs/security/THREAT_MODEL.md`)
- [ ] OWASP MASVS mobile checklist (`docs/security/MASVS.md`)
- [ ] Independent-style audit report (`docs/security/AUDIT_REPORT.md`)
- [ ] gitleaks secret scan + dependency audit in CI

© 2026 HAMAL KSA
