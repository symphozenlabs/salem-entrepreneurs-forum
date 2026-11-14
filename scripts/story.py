"""Builds a forum's scroll story from one Higgsfield video plus its keyframe stills.

    python3 -I scripts/story.py <forum> <video.mp4> <keyframes-dir> [frames=200]

e.g.  python3 -I scripts/story.py coimbatore story/coimbatore/clips/coimbatore-full.mp4 story/coimbatore/keyframes

Writes static/story/<forum>/:
  desktop/f_0001.jpg …  1280px wide, 16:9
  mobile/f_0001.jpg  …  720px wide, centre-cropped 3:4
  stills/{desktop,mobile}/k<n>.jpg  sharp keyframes each chapter rests on
  poster.jpg, manifest.json

Needs only ffmpeg and the standard library (no numpy/PIL). JPEG, because the local ffmpeg
has no WebP encoder; with `brew install webp` the frames could be converted for ~25% less. Salem's story predates this
script and lives at static/story/ (scripts/frames.sh + scripts/keyframes.py).
"""

import glob
import json
import os
import shutil
import subprocess
import sys

if len(sys.argv) < 4:
    sys.exit(__doc__)

forum, video, keyframes = sys.argv[1], sys.argv[2], sys.argv[3]
count = int(sys.argv[4]) if len(sys.argv) > 4 else 200
out = os.path.join('static', 'story', forum)
url = f'/story/{forum}'


def ff(*args):
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', *args], check=True)


def probe(path, entry):
    r = subprocess.run(
        ['ffprobe', '-v', 'error', '-select_streams', 'v', '-show_entries', entry, '-of', 'csv=p=0', path],
        check=True, capture_output=True, text=True,
    )
    return r.stdout.strip().split('\n')[0]


for d in ('desktop', 'mobile', 'stills'):
    shutil.rmtree(os.path.join(out, d), ignore_errors=True)
for d in ('desktop', 'mobile', 'stills/desktop', 'stills/mobile'):
    os.makedirs(os.path.join(out, d), exist_ok=True)

duration = float(subprocess.run(
    ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', video],
    check=True, capture_output=True, text=True).stdout)
fps = count / duration

# Frames (no audio).
ff('-i', video, '-an', '-vf', f'fps={fps:.4f},scale=1280:-2:flags=lanczos',
   '-q:v', '8', f'{out}/desktop/f_%04d.jpg')
ff('-i', video, '-an', '-vf', f'fps={fps:.4f},crop=ih*3/4:ih,scale=720:-2:flags=lanczos',
   '-q:v', '8', f'{out}/mobile/f_%04d.jpg')
shutil.copy(f'{out}/desktop/f_0001.jpg', f'{out}/poster.jpg')

desktop = sorted(glob.glob(f'{out}/desktop/f_*.jpg'))
mobile = sorted(glob.glob(f'{out}/mobile/f_*.jpg'))

# Tiny grayscale thumbnails of every frame, to find the frame each keyframe still matches.
W, H = 64, 36


def thumbs(src_args):
    raw = subprocess.run(
        ['ffmpeg', '-loglevel', 'error', *src_args, '-vf', f'scale={W}:{H},format=gray',
         '-f', 'rawvideo', '-'], check=True, capture_output=True).stdout
    n = W * H
    return [raw[i:i + n] for i in range(0, len(raw), n)]


frames = thumbs(['-i', video, '-an', '-r', f'{fps:.4f}'])[: len(desktop)]
stills = sorted(glob.glob(os.path.join(keyframes, 'K*.png')), key=lambda p: int(os.path.basename(p)[1:-4]))

rests = []
for n, path in enumerate(stills, start=1):
    k = thumbs(['-i', path])[0]
    errs = [sum((a - b) ** 2 for a, b in zip(f, k)) for f in frames]
    best = min(range(len(errs)), key=errs.__getitem__)
    # Rest points must move forward through the story.
    if rests and best <= rests[-1]:
        best = min(rests[-1] + 1, len(frames) - 1)
    rests.append(best)
    ff('-i', path, '-vf', 'scale=2560:-2:flags=lanczos', '-q:v', '3',
       f'{out}/stills/desktop/k{n}.jpg')
    ff('-i', path, '-vf', 'crop=ih*3/4:ih,scale=960:1280:flags=lanczos', '-q:v', '4',
       f'{out}/stills/mobile/k{n}.jpg')


def size(path):
    w, h = probe(path, 'stream=width,height').split(',')
    return int(w), int(h)


dw, dh = size(desktop[0])
mw, mh = size(mobile[0])
manifest = {
    'poster': f'{url}/poster.jpg',
    'sets': {
        'desktop': {'count': len(desktop), 'width': dw, 'height': dh, 'pattern': f'{url}/desktop/f_{{i}}.jpg', 'pad': 4},
        'mobile': {'count': len(mobile), 'width': mw, 'height': mh, 'pattern': f'{url}/mobile/f_{{i}}.jpg', 'pad': 4},
    },
    'stills': {'frames': rests, 'desktop': f'{url}/stills/desktop/k{{i}}.jpg', 'mobile': f'{url}/stills/mobile/k{{i}}.jpg'},
}
with open(f'{out}/manifest.json', 'w') as fh:
    json.dump(manifest, fh, indent='\t')
    fh.write('\n')

du = subprocess.run(['du', '-sh', out], capture_output=True, text=True).stdout.split()[0]
print(f'{forum}: {len(desktop)} frames, stills rest on {rests}, {du} total')
