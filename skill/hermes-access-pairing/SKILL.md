---
name: hermes-access-pairing
description: "Issue pairing codes for the Hermes Access mobile app when the user asks to connect/pair their phone."
version: 1.0.0
author: HAMAL KSA
metadata:
  hermes:
    tags: [hermes-access, mobile, pairing, hamal]
---

# Hermes Access — Pairing Skill

Issue a one-time pairing code so the user can connect the **Hermes Access**
mobile app (Android) to THIS gateway.

## When to use

The user says any of: "ربط التطبيق", "pair my phone", "connect the app",
"اعمل لي كود ربط", "lolo pair", or mentions connecting Hermes Access.

## Steps

1. Run the pairing command:
   ```bash
   bash ~/projects/hermes-access/scripts/access-link.sh
   ```
2. The script prints a one-time code (and starts the bridge if it's down).
3. Send the user the CODE in a clean message:
   - The code itself (exact string)
   - Instruction: open the app → More → ربط التطبيق → paste the code → اربط الآن
   - Remind them: the code expires in 10 minutes and works only once.

## How it works (technical)

- `access-link.sh` calls the bridge `gen` subcommand, which stores a
  256-bit single-use code (10-min TTL) in `.secrets/bridge-state.json`.
- The app POSTs the code to `http://127.0.0.1:8661/api/pair/redeem`.
- The bridge redeems it once and returns the gateway baseUrl + token.
- The app stores the token in Android Keystore, then talks to the API
  Server (port 8642) directly.
- Bridge binds ONLY to the Tailscale interface. Rate-limited (5/min/IP).

## Troubleshooting

- **"code already used"** → generate a fresh code; codes are single-use.
- **"ما قدرت أوصل للـ bridge"** → user's phone must be on Tailscale;
  check `curl http://127.0.0.1:8661/health`.
- **Bridge not running** → the script auto-starts it; or start manually:
  `~/.hermes/hermes-agent/venv/bin/python ~/projects/hermes-access/bridge/server.py`
- **Revoking a device** → rotate `API_SERVER_KEY` in ~/.hermes/.env and
  restart the gateway; old device tokens stop working.

## Security rules

- NEVER paste the API_SERVER_KEY itself into chat — only the pairing code.
- Codes are one-time and short-lived by design; do not reuse them.
