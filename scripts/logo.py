"""Builds transparent logo variants from Assets/logo.jpeg.

logo-ink.png   navy + gold on transparent (for ivory backgrounds)
logo-light.png ivory + gold on transparent (for ink backgrounds)

Uses colour-to-alpha against white (as GIMP does) so anti-aliased edges composite
cleanly on any background, then recolours the low-saturation navy to ivory.
"""
import colorsys
import sys
from pathlib import Path

from PIL import Image

src, out = Path(sys.argv[1]), Path(sys.argv[2])
img = Image.open(src).convert("RGB")
w, h = img.size
ink = Image.new("RGBA", (w, h))
light = Image.new("RGBA", (w, h))
IVORY = (245, 239, 228)
NAVY = (12, 22, 38)

px, pi, pl = img.load(), ink.load(), light.load()
for y in range(h):
    for x in range(w):
        r, g, b = px[x, y]
        a = max(255 - r, 255 - g, 255 - b) / 255
        if a < 0.04:
            continue
        # Un-blend from white.
        cr, cg, cb = ((c - 255 * (1 - a)) / a for c in (r, g, b))
        cr, cg, cb = (max(0, min(255, c)) for c in (cr, cg, cb))
        _, ll, ss = colorsys.rgb_to_hls(cr / 255, cg / 255, cb / 255)
        alpha = int(a * 255)
        if ss > 0.3 and cr > cb + 20:  # gold
            gold = (int(cr), int(cg), int(cb), alpha)
            pi[x, y] = gold
            pl[x, y] = gold
        else:
            pi[x, y] = (*NAVY, alpha)
            pl[x, y] = (*IVORY, alpha)

bbox = ink.getbbox()
out.mkdir(parents=True, exist_ok=True)
for name, im in (("logo-ink.png", ink), ("logo-light.png", light)):
    im.crop(bbox).save(out / name, optimize=True)
print("cropped to", bbox)
