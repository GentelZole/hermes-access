#!/usr/bin/env bash
# hermes access-link — issue a one-time pairing code for the mobile app.
# Usage: bash scripts/access-link.sh
set -euo pipefail
VENV_PY="$HOME/.hermes/hermes-agent/venv/bin/python"
BRIDGE="$HOME/projects/hermes-access/bridge/server.py"
BRIDGE_URL="http://127.0.0.1:8661"

# ensure bridge is up
if ! curl -s -m 3 "$BRIDGE_URL/health" >/dev/null 2>&1; then
  echo "[access-link] starting bridge…";
  nohup "$VENV_PY" "$BRIDGE" >/tmp/hermes-access-bridge.log 2>&1 &
  sleep 2
fi

CODE="$("$VENV_PY" "$BRIDGE" gen)"
echo ""
echo "  ╔══════════════════════════════════════════════╗"
echo "  ║   Hermes Access — pairing code (one-time)    ║"
echo "  ╚══════════════════════════════════════════════╝"
echo ""
echo "  CODE: $CODE"
echo ""
echo "  الصق الكود ده في التطبيق: More → ربط التطبيق"
echo "  (صالح 10 دقايق، استخدام واحد فقط)"
echo ""
