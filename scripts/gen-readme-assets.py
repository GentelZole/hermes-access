#!/usr/bin/env python3
"""Generate branded PNG assets for Hermes Access README via Alibaba Token Plan (qwen-image-2.0)."""
import os, sys, json, requests, concurrent.futures as cf
from pathlib import Path

OUT = Path("/home/moe/gh/hermes-access/docs/assets")
OUT.mkdir(parents=True, exist_ok=True)
ENDPOINT = "https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1/chat/completions"


def get_key(name):
    with open(Path.home() / ".hermes" / ".env", "rb") as f:
        for line in f.read().split(b"\n"):
            s = line.strip()
            if s.startswith(b"#") or b"=" not in s:
                continue
            k, v = s.split(b"=", 1)
            if k.strip() == name.encode():
                return v.strip().strip(b'"').strip(b"'").decode("ascii")
    raise ValueError(f"{name} not found")


NO_TEXT = ("ABSOLUTELY NO TEXT ANYWHERE in the image: no letters, no words, no numbers, no typography, "
           "no glyphs, no captions, no labels, no signature, no watermark, no logo, no brand mark, no UI text, "
           "no calligraphy, no writing of any kind in any language. Pure abstract visual only.")

BANNER_PROMPT = (
    "Ultra-premium cinematic abstract hero banner, luxury tech aesthetic, 16:5 wide panoramic composition. "
    "Deep obsidian near-black background (#0a0a0b) with an incredibly subtle warm undertone (#0e0c09), smooth "
    "vertical gradient falling into pure darkness at the edges. A flowing luminous stream of fine molten-gold "
    "particles (#d4af37) sweeps diagonally across the frame, swirling like metallic dust carried through space, "
    "converging into the elegant silhouette of a single radiant lightning bolt made of glowing gold light and "
    "shimmering motes. Volumetric light rays, delicate bokeh orbs of soft gold drifting at varying depths of field, "
    "deep depth-of-field blur in the foreground and background, dark negative space, high dynamic range, "
    "cinematic minimalism, moody dramatic lighting, fine film grain, 8k render, octane quality. "
    "Palette strictly limited to black, charcoal, warm bronze and gold. "
    + NO_TEXT
)

VOICE_PROMPT = (
    "Ultra-premium cinematic abstract illustration of a voice conversation, luxury tech aesthetic, square composition. "
    "Deep obsidian near-black background (#0a0a0b) with subtle warm undertone (#0e0c09). Centered on a glowing orb of "
    "concentrated molten gold light (#d4af37) that pulses like a living voice core, surrounded by concentric circular "
    "sound waves and rippling rings expanding outward in luminous gold filaments and tiny shimmering particles, "
    "like visible audio waveform rings in three-dimensional space. Some rings sharp and bright, others soft and blurred "
    "with heavy bokeh, echoing into darkness. Volumetric glow, lens bloom, glowing dust motes, deep black negative space "
    "around the sphere, cinematic minimalism, dramatic moody lighting, high dynamic range, fine film grain, 8k render. "
    "Palette strictly limited to black, charcoal, warm bronze and gold. "
    + NO_TEXT
)


def gen(prompt, model, out_path):
    key = get_key("ALIBABA_TOKEN_PLAN_KEY")
    payload = {"model": model,
               "messages": [{"role": "user", "content": [{"type": "text", "text": prompt}]}],
               "max_tokens": 4096}
    r = requests.post(ENDPOINT, headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                      json=payload, timeout=180)
    if r.status_code != 200:
        raise RuntimeError(f"API {r.status_code}: {r.text[:600]}")
    res = r.json()
    content = res["output"]["choices"][0]["message"]["content"]
    urls = [it["image"] for it in content if isinstance(it, dict) and "image" in it]
    if not urls:
        raise RuntimeError(f"no image in response: {json.dumps(res)[:800]}")
    img = requests.get(urls[0], timeout=180)
    Path(out_path).write_bytes(img.content)
    return out_path, urls[0]


def main():
    model = sys.argv[1] if len(sys.argv) > 1 else "qwen-image-2.0"
    jobs = [(BANNER_PROMPT, model, OUT / "banner-raw.png"),
            (VOICE_PROMPT, model, OUT / "voice-card.png")]
    results = {}
    with cf.ThreadPoolExecutor(max_workers=2) as ex:
        futs = {ex.submit(gen, *j): j[2].name for j in jobs}
        for f in cf.as_completed(futs):
            name = futs[f]
            try:
                p, u = f.result()
                results[name] = {"ok": True, "bytes": os.path.getsize(p)}
                print(f"OK {name} {os.path.getsize(p)} bytes")
            except Exception as e:
                results[name] = {"ok": False, "err": str(e)}
                print(f"FAIL {name}: {e}")
    print(json.dumps(results))


if __name__ == "__main__":
    main()