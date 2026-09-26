"""
hermes-access-bridge — minimal pairing service (Phase 3).

Security model:
  - Binds loopback by default. Set BRIDGE_HOST to a Tailscale address
    or front it with a TLS reverse proxy for remote pairing.
  - One-time pairing codes: 256-bit, 10-minute TTL, single use.
  - Rate-limited redemption (5/min per IP), fail-closed on any error.
  - Codes map to the gateway API key, which is handed over exactly once,
    over the channel you front it with (TLS recommended). Revocation = rotate key.
  - No secrets in logs.

Endpoints:
  GET  /health                 -> {"status":"ok"}
  POST /api/pair/redeem        -> {code} -> {baseUrl, token, label}  (single-use)
"""
import json
import os
import secrets
import time
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

STATE_FILE = Path(os.environ.get(
    "BRIDGE_STATE", Path.home() / "projects/hermes-access/.secrets/bridge-state.json"))
API_SERVER_URL = os.environ.get("BRIDGE_GATEWAY_URL", "http://127.0.0.1:8642")
LABEL = os.environ.get("BRIDGE_LABEL", "hermes-agent")
CODE_TTL_SECONDS = 600
MAX_REDEEM_PER_MIN = 5

app = FastAPI(title="hermes-access-bridge", docs_url=None, redoc_url=None)
_attempts: dict[str, list[float]] = {}


def _load_state() -> dict:
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text())
        except Exception:
            return {}
    return {}


def _save_state(state: dict) -> None:
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(state))
    os.chmod(STATE_FILE, 0o600)


def _gateway_token() -> str:
    """Read API_SERVER_KEY from ~/.hermes/.env without exposing it elsewhere."""
    env_path = Path.home() / ".hermes/.env"
    for line in env_path.read_text().splitlines():
        if line.startswith("API_SERVER_KEY="):
            return line.split("=", 1)[1].strip()
    raise RuntimeError("no API_SERVER_KEY configured")


def _rate_limited(ip: str) -> bool:
    now = time.time()
    window = [t for t in _attempts.get(ip, []) if now - t < 60]
    window.append(now)
    _attempts[ip] = window
    return len(window) > MAX_REDEEM_PER_MIN


@app.get("/health")
async def health():
    return {"status": "ok", "service": "hermes-access-bridge"}


@app.post("/api/pair/redeem")
async def redeem(request: Request):
    # Rate-limit key: real client behind the nginx proxy (XFF set there),
    # direct tailnet clients keep their socket peer.
    xff = request.headers.get("x-forwarded-for")
    if xff:
        ip = xff.split(",")[0].strip()
    else:
        ip = request.client.host if request.client else "unknown"
    if _rate_limited(ip):
        raise HTTPException(status_code=429, detail="too many attempts")
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="bad request")

    code = str(body.get("code", "")).strip()
    if not code or len(code) > 128:
        raise HTTPException(status_code=400, detail="bad code")

    state = _load_state()
    entry = state.get("codes", {}).get(code)
    if not entry:
        raise HTTPException(status_code=404, detail="unknown code")
    if time.time() > entry.get("expires", 0):
        state["codes"].pop(code, None)
        _save_state(state)
        raise HTTPException(status_code=410, detail="code expired")
    if entry.get("used"):
        raise HTTPException(status_code=410, detail="code already used")

    # Single-use: mark before handing over anything.
    entry["used"] = True
    entry["used_at"] = time.time()
    _save_state(state)

    try:
        token = _gateway_token()
    except Exception:
        raise HTTPException(status_code=500, detail="gateway key unavailable")

    return JSONResponse({
        "baseUrl": API_SERVER_URL,
        "token": token,
        "label": LABEL,
        "pairedAt": int(time.time()),
    })


# ---------------------------------------------------------------------------
# Voice relay — STT (transcribe) + TTS (speak) for the Hermes Access app.
# Same bearer auth as the agent API; runs the Hermes command-provider scripts.
# ---------------------------------------------------------------------------
VOICE_MAX_BYTES = 20 * 1024 * 1024  # 20 MB upload cap
VOICE_MAX_TEXT = 1200               # TTS input cap
VOICE_TTL = 365 * 24 * 3600         # paired-token cache TTL

VENV_PY = Path.home() / ".hermes/hermes-agent/venv/bin/python"
STT_SCRIPT = Path.home() / ".hermes/scripts/alibaba_stt.py"
TTS_SCRIPT = Path.home() / ".hermes/scripts/alibaba_tts.py"
_TTS_MODEL = "qwen-audio-3.0-tts-plus"
_TTS_VOICE = "qwen-audio-3.0-tts-plus-longlinheyi"  # female, Tariq's pick


def _valid_token(request: Request) -> bool:
    supplied = ""
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        supplied = auth[7:].strip()
    if not supplied:
        return False
    try:
        expected = _gateway_token()
    except Exception:
        return False
    import hmac
    return hmac.compare_digest(supplied, expected)


@app.post("/api/voice/transcribe")
async def voice_transcribe(request: Request):
    if not _valid_token(request):
        raise HTTPException(status_code=401, detail="unauthorized")
    if _rate_limited(request.headers.get("x-forwarded-for", "").split(",")[0].strip() or "voice"):
        raise HTTPException(status_code=429, detail="too many attempts")
    try:
        form = await request.form()
        upload = form.get("audio")
        if upload is None or not hasattr(upload, "read"):
            raise HTTPException(status_code=400, detail="missing audio field")
        data = await upload.read()
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="bad multipart body")
    if len(data) > VOICE_MAX_BYTES:
        raise HTTPException(status_code=413, detail="audio too large")
    if not data:
        raise HTTPException(status_code=400, detail="empty audio")
    ctype = getattr(upload, "type", "") or ""
    ext = ".wav" if "wav" in ctype else (".ogg" if "ogg" in ctype else ".m4a")
    import asyncio
    import tempfile
    src = Path(tempfile.mkdtemp(prefix="ha-stt-"))
    in_f, out_f = src / ("a" + ext), src / "t.txt"
    in_f.write_bytes(data)
    try:
        proc = await asyncio.create_subprocess_exec(
            str(VENV_PY), str(STT_SCRIPT), str(in_f), str(out_f),
            stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.PIPE)
        _, err = await asyncio.wait_for(proc.communicate(), timeout=120)
        if proc.returncode != 0 or not out_f.exists():
            raise HTTPException(status_code=502,
                                detail="transcribe failed: " + err.decode()[-200:])
        text = out_f.read_text().strip()
        # the omni model sometimes prefixes a scene/speaker description line;
        # keep the last, longest line as transcription
        lines = [l for l in text.splitlines() if l.strip()]
        if len(lines) > 1:
            text = max(lines, key=len)
        return JSONResponse({"text": text})
    finally:
        import shutil
        shutil.rmtree(src, ignore_errors=True)


@app.post("/api/voice/speak")
async def voice_speak(request: Request):
    if not _valid_token(request):
        raise HTTPException(status_code=401, detail="unauthorized")
    if _rate_limited(request.headers.get("x-forwarded-for", "").split(",")[0].strip() or "voice"):
        raise HTTPException(status_code=429, detail="too many attempts")
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="bad request")
    text = str(body.get("text", "")).strip()
    if not text:
        raise HTTPException(status_code=400, detail="missing text")
    text = text[:VOICE_MAX_TEXT]
    # strip markdown/emoji noise for cleaner speech
    import re as _re
    text = _re.sub(r"```[\s\S]*?```", " ", text)
    text = _re.sub(r"[#*_>`~]|\[[^\]]*\]\([^)]*\)", " ", text)
    text = _re.sub(r"[\U0001F000-\U0001FAFF\u2600-\u27BF]", " ", text)
    text = _re.sub(r"\s+", " ", text).strip()
    if not text:
        text = "تمام"
    import asyncio
    import base64
    import shutil
    import tempfile
    src = Path(tempfile.mkdtemp(prefix="ha-tts-"))
    in_f, out_f = src / "t.txt", src / "a.mp3"
    in_f.write_text(text, encoding="utf-8")
    try:
        proc = await asyncio.create_subprocess_exec(
            str(VENV_PY), str(TTS_SCRIPT), str(in_f), str(out_f), _TTS_MODEL, _TTS_VOICE, "mp3",
            # NOTE: the global ALIBABA_TTS_INSTRUCTION gets SPEAK aloud by the
            # qwen-audio TTS voice (vendor quirk — it prefixes every clip).
            # App replies are already persona-styled by the agent, so no
            # instruction here.
            env={**os.environ, "ALIBABA_TTS_INSTRUCTION": "NONE"},
            stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.PIPE)
        _, err = await asyncio.wait_for(proc.communicate(), timeout=120)
        if proc.returncode != 0 or not out_f.exists() or out_f.stat().st_size == 0:
            raise HTTPException(status_code=502,
                                detail="speak failed: " + err.decode()[-200:])
        audio = base64.b64encode(out_f.read_bytes()).decode()
        return JSONResponse({"audio": audio, "format": "mp3"})
    finally:
        shutil.rmtree(src, ignore_errors=True)


def generate_code() -> str:
    """Create a fresh one-time code; returns it (CLI prints the deep link)."""
    code = secrets.token_urlsafe(32)
    state = _load_state()
    codes = state.setdefault("codes", {})
    # prune expired/used
    now = time.time()
    state["codes"] = {
        c: e for c, e in codes.items()
        if not e.get("used") and e.get("expires", 0) > now
    }
    state["codes"][code] = {"expires": now + CODE_TTL_SECONDS, "used": False}
    _save_state(state)
    return code


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "gen":
        print(generate_code())
    else:
        import uvicorn
        uvicorn.run(app, host=os.environ.get("BRIDGE_HOST", "127.0.0.1"),
                 port=int(os.environ.get("BRIDGE_PORT", "8661")), log_level="warning")
