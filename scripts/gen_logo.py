#!/usr/bin/env python3
"""Generate the Hermes Access app logo via Gemini image model (OpenRouter)."""
import base64
import os
import sys

import requests

env_path = os.path.expanduser("~/.hermes/.env")
api_key = None
with open(env_path, "rb") as f:
    for line in f.read().split(b"\n"):
        if b"OPENROUTER_API_KEY" in line and not line.strip().startswith(b"#"):
            api_key = line.split(b"=", 1)[1].strip().decode("ascii")
            break

if not api_key:
    print("NO_KEY")
    sys.exit(1)

prompt = (
    "Premium mobile app icon for 'Hermes Access' — a luxurious messenger/messenger-god mark. "
    "A minimal, modern interpretation of a winged caduceus staff merged subtly with a chat-bubble silhouette. "
    "Deep obsidian black background (#0a0a0b), the mark rendered in brushed antique gold with a faint warm glow. "
    "Style: high-end fintech/private-banking brand mark, elegant serif-era luxury, extremely clean vector look, "
    "perfectly centered, generous padding, NO text, NO letters, NO watermark. Square composition, "
    "works at small sizes, crisp edges."
)

payload = {
    "model": "google/gemini-2.5-flash-image",
    "modalities": ["image", "text"],
    "messages": [{"role": "user", "content": prompt}],
    "temperature": 1,
    "max_tokens": 8192,
}

resp = requests.post(
    "https://openrouter.ai/api/v1/chat/completions",
    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
    json=payload,
    timeout=180,
)
data = resp.json()
try:
    msg = data["choices"][0]["message"]
    img = msg["images"][0]
    url = img["image_url"]["url"] if isinstance(img, dict) else img
    _, b64 = url.split(",", 1)
    out = os.path.expanduser("~/projects/hermes-access/app/assets/logo-raw.png")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "wb") as f:
        f.write(base64.b64decode(b64))
    print("SAVED", out)
except Exception as e:
    print("FAILED:", e, str(data)[:500])
