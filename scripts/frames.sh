#!/usr/bin/env bash
# Turns the Higgsfield story clips into scroll-scrubbable frame sequences.
#
#   scripts/frames.sh <clips-dir> [frames=200]
#
# Clips are joined in filename order (01.mp4, 02.mp4, …) with a short crossfade,
# because image-to-video models don't land exactly on the requested end frame. Writes:
#   static/story/desktop/f_0001.webp …  1280px wide, 16:9 (the clips' native width)
#   static/story/mobile/f_0001.webp  …  720px wide, centre-cropped 3:4
#   static/story/poster.webp
#   static/story/manifest.json
# then scripts/keyframes.py adds the sharp keyframe stills each chapter rests on.
set -euo pipefail

clips=${1:?usage: frames.sh <clips-dir> [frames]}
frames=${2:-200}
xfade=0.5
out=static/story
# Kept on the project drive: the system temp dir lives on a nearly full C:.
work=.frames-tmp
rm -rf "$work" && mkdir -p "$work"
trap 'rm -rf "$work"' EXIT

mapfile -t files < <(ls "$clips"/*.mp4 | sort)
inputs=() chain="" offset=0 prev="0:v"
for i in "${!files[@]}"; do
	inputs+=(-i "${files[$i]}")
	(( i == 0 )) && continue
	d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "${files[$((i - 1))]}")
	offset=$(awk -v o="$offset" -v d="$d" -v x="$xfade" 'BEGIN { printf "%.3f", o + d - x }')
	chain+="[$prev][$i:v]xfade=transition=fade:duration=$xfade:offset=$offset[v$i];"
	prev="v$i"
done
if (( ${#files[@]} > 1 )); then
	ffmpeg -loglevel error "${inputs[@]}" -filter_complex "${chain%;}" -map "[$prev]" \
		-an -c:v libx264 -crf 14 -pix_fmt yuv420p "$work/story.mp4"
else
	ffmpeg -loglevel error -i "${files[0]}" -an -c:v libx264 -crf 14 -pix_fmt yuv420p "$work/story.mp4"
fi

duration=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$work/story.mp4")
fps=$(awk -v f="$frames" -v d="$duration" 'BEGIN { printf "%.4f", f / d }')

rm -rf "$out/desktop" "$out/mobile"
mkdir -p "$out/desktop" "$out/mobile"
ffmpeg -loglevel error -i "$work/story.mp4" -vf "fps=$fps,scale=1280:-2:flags=lanczos" \
	-c:v libwebp -quality 78 -compression_level 6 "$out/desktop/f_%04d.webp"
ffmpeg -loglevel error -i "$work/story.mp4" -vf "fps=$fps,crop=ih*3/4:ih,scale=720:-2:flags=lanczos" \
	-c:v libwebp -quality 72 -compression_level 6 "$out/mobile/f_%04d.webp"
cp "$out/desktop/f_0001.webp" "$out/poster.webp"

count_d=$(ls "$out/desktop" | wc -l)
count_m=$(ls "$out/mobile" | wc -l)
size() { ffprobe -v error -select_streams v -show_entries stream=width,height -of csv=p=0:s=, "$1"; }
IFS=, read -r dw dh < <(size "$out/desktop/f_0001.webp")
IFS=, read -r mw mh < <(size "$out/mobile/f_0001.webp")

cat > "$out/manifest.json" <<JSON
{
	"poster": "/story/poster.webp",
	"sets": {
		"desktop": { "count": $count_d, "width": $dw, "height": $dh, "pattern": "/story/desktop/f_{i}.webp", "pad": 4 },
		"mobile": { "count": $count_m, "width": $mw, "height": $mh, "pattern": "/story/mobile/f_{i}.webp", "pad": 4 }
	}
}
JSON
[[ -d story/keyframes ]] && python -I scripts/keyframes.py story/keyframes
echo "desktop: $count_d frames ($(du -sh "$out/desktop" | cut -f1)), mobile: $count_m frames ($(du -sh "$out/mobile" | cut -f1))"
