#!/bin/bash
# Detached clean gateway restart + auth-flap verification.
# Run via: systemd-run --user --on-active=N bash <this>
LOG=/tmp/gw-restart-result.txt
{
  echo "=== restart at $(date) ==="
  systemctl --user restart hermes-gateway
  sleep 12
  echo "service: $(systemctl --user is-active hermes-gateway)"
  curl -s -m 5 http://127.0.0.1:8642/health
  echo
  # auth verification: 8 calls with the real key
  KEY=*** '^API_SERVER_KEY=' ~/.hermes/.env | cut -d= -f2)
  ok=0
  for i in $(seq 1 8); do
    code=$(curl -s -o /dev/null -w "%{http_code}" -m 10 -X GET \
      -H "Authorization: *** $KEY" \
      -H "Content-Type: application/json" \
      "http://127.0.0.1:8642/api/sessions?limit=2")
    echo "auth-check $i: $code"
    [ "$code" = "200" ] && ok=$((ok+1))
    sleep 0.5
  done
  echo "AUTH PASS: $ok/8"
} > "$LOG" 2>&1
