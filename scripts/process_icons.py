#!/usr/bin/env python3
"""Convert logo-raw.png into all app icon slots (rounded squircle, adaptive fg/bg)."""
from PIL import Image, ImageDraw, ImageOps
import os

base = os.path.expanduser("~/projects/hermes-access/app")
raw = Image.open(os.path.join(base, "assets/logo-raw.png")).convert("RGBA")

def squircle(size, img):
    img = img.copy().resize((size, size), Image.LANCZOS)
    # rounded mask radius ~22% of size (Android/iOS squircle approximation)
    mask = Image.new("L", (size, size), 0)
    r = int(size * 0.22)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out

def solid_bg(size, color=(10, 10, 11, 255)):
    return Image.new("RGBA", (size, size), color)

# 1) Main app icon (1024, squircle)
icon = squircle(1024, raw)
icon.save(os.path.join(base, "assets/icon.png"))

# 2) Adaptive background (1024 flat black)
solid_bg(1024).save(os.path.join(base, "assets/android-icon-background.png"))

# 3) Adaptive foreground (symbol only, ~66% scale, transparent, 1024 canvas)
fg = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
sym = raw.resize((680, 680), Image.LANCZOS)
fg.paste(sym, ((1024 - 680) // 2, (1024 - 680) // 2), sym)
fg.save(os.path.join(base, "assets/android-icon-foreground.png"))

# 4) Monochrome (white silhouette-ish for themed icons) — grayscale the symbol
mono = ImageOps.grayscale(raw).convert("RGBA")
mono.save(os.path.join(base, "assets/android-icon-monochrome.png"))

# 5) Favicon
squircle(64, raw).save(os.path.join(base, "assets/favicon.png"))

print("icons written:", [
    "icon.png", "android-icon-background.png", "android-icon-foreground.png",
    "android-icon-monochrome.png", "favicon.png"])
for f in ["icon.png", "android-icon-foreground.png"]:
    p = os.path.join(base, "assets", f)
    print(f, os.path.getsize(p), "bytes")
