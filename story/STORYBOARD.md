# Scroll story — Higgsfield storyboard

The home page scroll story is one continuous camera move, scrubbed by scroll.
It is built from **6 keyframe stills** and **6 clips**; clip _n_ starts on keyframe _n_
and ends on keyframe _n+1_ (start/end-frame mode), so the cuts are invisible.

Clips go in `story/clips/01.mp4 … 06.mp4`, then:

```sh
scripts/frames.sh story/clips 200
```

## Look (applies to every prompt)

> Photorealistic cinematic still, shot on ARRI Alexa 35 with a 35mm anamorphic lens,
> natural light, Kodak Portra 400 colour grade, deep navy shadows and warm brass-gold
> highlights, subtle film grain, shallow depth of field, no text, no logos, no watermarks.

Realism rules: no close-up faces, no speaking, no readable signage; people appear as
hands, silhouettes, backs or soft-focus groups. Slow, steady camera only.

## Keyframes (16:9, 2K)

| # | Chapter | Prompt (append the Look) |
|---|---|---|
| K1 | Where the hills meet industry | Aerial dawn view over Salem, Tamil Nadu: the Shevaroy hills in blue haze on the horizon, low mist over the city, first golden sunlight catching rooftops and a few factory chimneys, palm trees and red laterite earth in the foreground |
| K2 | Looms. Steel. Sago. Code. | Interior of a South Indian textile mill at golden hour, rows of power looms with silk threads in saffron and indigo, sunlight beams through high windows and floating cotton dust, a worker's hands guiding thread in soft focus |
| K3 | Built on handshakes | Evening entrance of an elegant hotel banquet in Salem, warm tungsten light, Indian business leaders in kurtas and blazers arriving seen from behind, a firm handshake in the foreground in sharp focus, brass lamps |
| K4 | Knowledge, shared freely | A round-table masterclass in a wood-panelled room, twelve entrepreneurs around a dark table with notebooks and tea glasses, seen from a high three-quarter angle, faces turned away or soft, a brass pendant light glowing |
| K5 | ₹12 Cr of trust, in motion | Night rooftop view over Salem city lights, long exposure of traffic trails in gold, the dark silhouette of the Shevaroy hills, a deep navy sky with the last blue light |
| K6 | Your seat | Close detail of an empty leather chair at a set dinner table, a folded navy napkin and a gold-foiled member card resting on it, candlelight bokeh behind, warm and inviting |

## Clips (image-to-video, 16:9, 1080p, 5 s, no audio)

| Clip | Start → End | Motion prompt |
|---|---|---|
| 01 | K1 → K2 | Slow continuous drone descent towards the city, mist parting, transitioning through a factory skylight into the textile mill, smooth and steady |
| 02 | K2 → K3 | Slow dolly forward along the looms, threads blur into warm light, emerging into the hotel entrance at evening, smooth |
| 03 | K3 → K4 | Camera follows the handshake past guests into the conference room, gentle push in, steady |
| 04 | K4 → K5 | Slow crane up from the round table, through the ceiling light into the night sky above the city, smooth |
| 05 | K5 → K6 | Slow drift down across city lights, focus pull into candlelight bokeh, resolving on the empty chair |
| 06 | K6 → K6 | Very slow push in on the member card, candle flicker, almost still |

## Credit budget

Approve a budget before generation; exact per-run cost is read from Higgsfield before each call.
