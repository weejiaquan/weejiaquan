"""Bake the character once: encode to WebP, and pre-sample the dissolve band to glyphs.

The character never changes, so this runs once and its output is committed.
The daily generator only needs the contribution data.
"""
import base64, json, os, sys, tempfile
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "assets")
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(OUT_DIR, "character-source.png")

# placement inside the hero's 420px art zone (card is 900x500, text lives in the footer).
# The box fills the art zone to the top, right and bottom edges (it bleeds off the
# card) so there are no empty gaps. The left side dissolves into glyphs and the
# bottom fades out exactly at the footer line, so neither shows a hard edge.
ART = 420.0
DEST_X, DEST_Y, DEST_W, DEST_H = 564.0, 0.0, 336.0, ART
# horizontal dissolve band: fully glyphs at BAND_X0, fully image by BAND_X1
BAND_X0, BAND_X1 = 558.0, 700.0
FADE_LEN = 60.0        # bottom fade length
FADE_BOTTOM_Y = ART - FADE_LEN   # fully gone at the footer line
EDGE_FADE = 0.0        # right edge bleeds off the card; set > 0 to fade it instead
CW, CH = 4.8, 5.8
RAMP = "  .:-=+*#%@"

im = Image.open(SRC).convert("RGBA").crop(Image.open(SRC).convert("RGBA").getbbox())
ENC_W = 520
enc = im.resize((ENC_W, round(im.size[1] * ENC_W / im.size[0])), Image.LANCZOS)
# only the base64 is committed; the webp is an intermediate
with tempfile.TemporaryDirectory() as tmp:
    webp = os.path.join(tmp, "character.webp")
    enc.save(webp, "WEBP", quality=82, method=6)
    webp_bytes = open(webp, "rb").read()
b64 = base64.b64encode(webp_bytes).decode()

# ---- sample the dissolve band -------------------------------------------------
px = enc.load()
ew, eh = enc.size
cells = []
cols = int(DEST_W / CW) + 1
rows = int(DEST_H / CH) + 1
for r in range(rows):
    for c in range(cols):
        cx = DEST_X + c * CW
        cy = DEST_Y + r * CH
        if cy < DEST_Y - 2 or cy > FADE_BOTTOM_Y + FADE_LEN:
            continue
        # image alpha at this point: how much the mask keeps
        keep_x = 0.0 if cx <= BAND_X0 else min(1.0, (cx - BAND_X0) / (BAND_X1 - BAND_X0))
        keep_y = 1.0 if cy <= FADE_BOTTOM_Y else max(0.0, 1.0 - (cy - FADE_BOTTOM_Y) / FADE_LEN)
        keep_r = 1.0 if EDGE_FADE <= 0 else max(0.0, min(1.0, (DEST_X + DEST_W - cx) / EDGE_FADE))
        keep = keep_x * keep_y * keep_r
        if keep > 0.97:
            continue                      # solid image here, no glyphs needed
        # sample source pixel
        u = (cx - DEST_X) / DEST_W
        v = (cy - DEST_Y) / DEST_H
        if not (0.0 <= u < 1.0 and 0.0 <= v < 1.0):
            continue
        sx, sy = int(u * ew), int(v * eh)
        R, G, B, A = px[sx, sy]
        if A < 26:
            continue
        lum = (R * 0.2126 + G * 0.7152 + B * 0.0722) / 255.0
        # dark ink -> dense glyph. alpha gates presence.
        tone = (1.0 - lum) * (A / 255.0)
        tone = max(tone, (A / 255.0) * 0.22)      # keep pale areas faintly present
        weight = (1.0 - keep)                      # glyphs take over as image fades
        density = tone * weight
        if density < 0.05:
            continue
        # deterministic dither so the band breaks up instead of banding
        h = ((c * 73856093) ^ (r * 19349663)) & 0xFFFFFFFF
        h = ((h ^ (h >> 13)) & 0xFFFFFFFF) % 1000 / 1000.0
        if h > 0.26 + 0.74 * density:
            continue
        g = RAMP[max(1, min(10, round(tone * 10)))]
        cells.append([round(cx), round(cy), g, round(min(0.92, 0.16 + 0.80 * density), 2)])

out = {
    "dest": [DEST_X, DEST_Y, DEST_W, DEST_H],
    "band": [BAND_X0, BAND_X1],
    "fadeBottom": FADE_BOTTOM_Y,
    "fadeLen": FADE_LEN,
    "edgeFade": EDGE_FADE,
    "encoded": [ENC_W, enc.size[1]],
    "cells": cells,
}
json.dump(out, open(os.path.join(OUT_DIR, "character-cells.json"), "w"))
open(os.path.join(OUT_DIR, "character-b64.txt"), "w").write(b64)

print(f"encoded {enc.size[0]}x{enc.size[1]}  webp={len(webp_bytes)//1024}KB  "
      f"base64={len(b64)//1024}KB  dissolve cells={len(cells)}")
