"""Adds the full-resolution keyframe stills to the scroll story.

    python -I scripts/keyframes.py [keyframes-dir=story/keyframes]

The clips are 720p, so the story looks soft wherever scrolling comes to rest. Each
chapter rests on its keyframe instead: this finds the frame in static/story/desktop
that best matches each K<n>.png, writes sharp stills next to the frames, and records
both in static/story/manifest.json. Run after scripts/frames.sh.
"""

import glob
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

keyframes = Path(sys.argv[1] if len(sys.argv) > 1 else 'story/keyframes')
out = Path('static/story')
manifest_path = out / 'manifest.json'


def thumb(path):
    return np.asarray(Image.open(path).convert('L').resize((160, 90)), dtype=np.float32)


frames = sorted(glob.glob(str(out / 'desktop' / 'f_*.webp')))
sequence = np.stack([thumb(p) for p in frames])
stills = sorted(keyframes.glob('K*.png'), key=lambda p: int(p.stem[1:]))

indices = []
for d in ('desktop', 'mobile'):
    (out / 'stills' / d).mkdir(parents=True, exist_ok=True)

for n, path in enumerate(stills, start=1):
    error = ((sequence - thumb(path)) ** 2).mean(axis=(1, 2))
    indices.append(int(error.argmin()))

    img = Image.open(path).convert('RGB')
    w, h = img.size
    img.resize((2560, round(h * 2560 / w)), Image.LANCZOS).save(
        out / 'stills' / 'desktop' / f'k{n}.webp', quality=80, method=6
    )
    # Same centre 3:4 crop as the mobile frames, so the still lines up with them.
    cw = h * 3 // 4
    img.crop(((w - cw) // 2, 0, (w + cw) // 2, h)).resize((960, 1280), Image.LANCZOS).save(
        out / 'stills' / 'mobile' / f'k{n}.webp', quality=78, method=6
    )

manifest = json.loads(manifest_path.read_text())
manifest['stills'] = {
    'frames': indices,
    'desktop': '/story/stills/desktop/k{i}.webp',
    'mobile': '/story/stills/mobile/k{i}.webp',
}
manifest_path.write_text(json.dumps(manifest, indent='\t') + '\n')
print(f'{len(stills)} stills, resting on frames {indices}')
