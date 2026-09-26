#!/usr/bin/env python3
"""Generate 5 distinct minimal white tab icons (template images) via PIL."""
import math
import os

from PIL import Image, ImageDraw

OUT = os.path.expanduser("~/projects/hermes-access/app/assets/images/tabIcons")
os.makedirs(OUT, exist_ok=True)
S = 96
W = (255, 255, 255, 255)
LW = 7  # stroke width


def canvas():
    return Image.new("RGBA", (S, S), (0, 0, 0, 0))


def chat():
    img = canvas(); d = ImageDraw.Draw(img)
    # rounded bubble
    d.rounded_rectangle([14, 18, 82, 62], radius=16, outline=W, width=LW)
    # tail
    d.polygon([(30, 60), (30, 78), (48, 62)], fill=W)
    # dots
    for x in (32, 48, 64):
        d.ellipse([x - 3, 37, x + 3, 43], fill=W)
    img.save(f"{OUT}/chat.png")


def channels():
    img = canvas(); d = ImageDraw.Draw(img)
    # 2x2 grid of rounded squares
    for (x0, y0) in [(14, 14), (52, 14), (14, 52), (52, 52)]:
        d.rounded_rectangle([x0, y0, x0 + 30, y0 + 30], radius=8, outline=W, width=LW - 1)
    img.save(f"{OUT}/channels.png")


def cron():
    img = canvas(); d = ImageDraw.Draw(img)
    d.ellipse([16, 16, 80, 80], outline=W, width=LW)
    # hands
    d.line([48, 48, 48, 28], fill=W, width=LW, joint="curve")
    d.line([48, 48, 63, 56], fill=W, width=LW, joint="curve")
    img.save(f"{OUT}/cron.png")


def identity():
    img = canvas(); d = ImageDraw.Draw(img)
    # palette circle
    d.ellipse([16, 16, 80, 80], outline=W, width=LW)
    # paint dots
    for (x, y) in [(36, 36), (58, 34), (34, 56)]:
        d.ellipse([x - 5, y - 5, x + 5, y + 5], fill=W)
    # thumb notch
    d.pieslice([52, 52, 84, 84], start=200, end=320, fill=(0, 0, 0, 0))
    img.save(f"{OUT}/identity.png")


def more():
    img = canvas(); d = ImageDraw.Draw(img)
    # gear: circle + teeth
    cx = cy = 48
    for i in range(8):
        a = math.radians(i * 45)
        x0 = cx + math.cos(a) * 26
        y0 = cy + math.sin(a) * 26
        x1 = cx + math.cos(a) * 38
        y1 = cy + math.sin(a) * 38
        d.line([x0, y0, x1, y1], fill=W, width=10)
    d.ellipse([24, 24, 72, 72], outline=W, width=LW)
    d.ellipse([40, 40, 56, 56], outline=W, width=LW - 2)
    img.save(f"{OUT}/more.png")


chat(); channels(); cron(); identity(); more()
print("tab icons written:", sorted(os.listdir(OUT)))
