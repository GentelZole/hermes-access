#!/usr/bin/env bash
set -euo pipefail
KEY=*** rand -hex 32)
echo "key generated, length: ${#KEY}"
mkdir -p "$HOME/projects/hermes-mobile-app/.secrets"
chmod 700 "$HOME/projects/hermes-mobile-app/.secrets"
printf 'API_SERVER_KEY=***\n' "$KEY" > "$HOME/projects/hermes-mobile-app/.secrets/api-server-key.txt"
chmod 600 "$HOME/projects/hermes-mobile-app/.secrets/api-server-key.txt"
if grep -q '^API_SERVER_KEY=*** "$HOME/.hermes/.env"; then
  sed -i "s|^API_SERVER_KEY=.*|API…KEY}|" "$HOME/.hermes/.env"
  echo "updated existing API_SERVER_KEY in ~/.hermes/.env"
else
  printf '\nAPI_SERVER_KEY=***\n' "$KEY" >> "$HOME/.hermes/.env"
  echo "appended API_SERVER_KEY to ~/.hermes/.env"
fi
echo "tailscale IPv4: $(tailscale ip -4 | head -1)"
