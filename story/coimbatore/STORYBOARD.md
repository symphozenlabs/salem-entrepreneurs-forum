# Coimbatore Entrepreneurs Forum — scroll story

Theme: **"The Manchester of the South"**: dawn over the Ghats → spinning mill → foundry →
rooftop handshake → night city → the temples of Perur and Marudhamalai.

## Final stills (approved Nov 2026)

The generated images are square (`source/1.webp … 6.webp`, 2000×2000). They are cropped to 16:9
(2000×1125) in `keyframes/K1.png … K6.png`, which is what gets uploaded to Higgsfield. The original
squares are kept for the phone version, which shows a taller crop.

| # | Source | Crop (from top) | Scene | Light |
|---|---|---|---|---|
| K1 | 1.webp | 440 px | Dawn over the city, Ghats, road, chimneys | Sunrise |
| K2 | 2.webp | 650 px | Spinning mill, hands holding a bobbin | Golden |
| K3 | 3.webp | 420 px | Foundry pour, pump casings, motor stators | Dusk, fire |
| K4 | 6.webp | 560 px | Rooftop gathering, handshake, Ghats | Blue hour |
| K5 | 4.webp | 600 px | Flyover light trails, IT towers, Ghats | Night |
| K6 | 5.webp | 470 px | Perur-style gopuram and tank, Marudhamalai steps | Night, lamps |

The order runs from sunrise to night, so the light changes smoothly as you scroll.

## Final video (generated 14 Nov 2026)

`clips/coimbatore-full.mp4` is the final video: 1280×720, 24 fps, 15 s, 361 frames, plus an audio track that must be removed.
It was made with Kling 4.0 in Frames mode, using all six keyframes in order (K1 start … K6 end), for 33.75 credits.
Seedance 2.5 Flash needed a plan upgrade, and Seedance 2.0 Fast/Mini were shown as "not available in US".

Review: it passes through all six stills in order, and ffmpeg found no hard cuts (scene score 0.25).
The mill → foundry and foundry → rooftop changes use a spark burst. There is one fast motion-blurred
dive into the street at about 3.5 s, which is fine while scrolling.

## Motion v4 (superseded): full chain at 480p

Higgsfield prices checked on 14 Nov 2026 (Seedance 2.5 Flash, 16:9). Turning audio off doesn't change the price.

| Quality | 4 s | 5 s | 15 s |
|---|---|---|---|
| 720p | 20 | 25 | 75 |
| 480p | **8** | 10 | 30 |

Seedance 2.5 Draft (480p only) costs 12 for 4 s, so Flash at 480p is the cheapest.
The price is per second, so one long video saves nothing.

Plan: Seedance 2.5 Flash, 480p, 4 s, 16:9, audio off, 8 credits per clip. Five transitions per
forum (K1→K2 … K5→K6) is 40 credits, or 80 for both forums. Add one 8-credit test first, and
about 38 credits remain for retries. The story rests on the sharp 2K stills at each chapter, so
480p only shows while scrolling between chapters.

The Flash model has a **References** mode instead of start/end slots: both images are added as
references, and the prompt names them (`@image1` start, `@image2` end). Clip C (K5 → K6) is the 8-credit test.

## Motion v3 (superseded): 2 clips for Coimbatore

The 126 credits cover both new forums: 2 clips each (4 × 25 = 100), plus 26 in reserve for one retry.

| Clip | Start → End | Credits |
|---|---|---|
| A | K1 → K2 (dawn → mill) | 25 |
| C | K5 → K6 (night flyover → temples) | 25 |

K3 (foundry) and K4 (rooftop) get a slow push-in made locally, at no credit cost. The joins
K2→K3, K3→K4 and K4→K5 are soft crossfades. The prompts for A and C are below, under v2.

## Motion v2 (superseded): 3 paired clips

Each clip uses a **start and an end image**, so one generation covers two stills.
Three clips (75 credits) cover all six images; the joins between pairs (K2→K3, K4→K5) are local
crossfades. 51 credits stay in reserve for one retry.

| Clip | Start → End | Why the pair works |
|---|---|---|
| A | K1 → K2 | Both have a centre vanishing line (the road, the mill aisle); mist turns into cotton fibre |
| B | K3 → K4 | Dark with warm light; the sparks become the string lights |
| C | K5 → K6 | Both are at night with the Ghats behind; city lights become temple lamps |

Clip A prompt:
> The drone glides forward and down along the straight road into the misty city, sinking through the morning mist. The mist turns into floating cotton fibres glowing in golden light as the camera arrives inside a spinning mill, moving down the central aisle between long rows of white cotton bobbins towards hands holding a bobbin. One continuous smooth forward camera move at a constant speed, no cuts, photorealistic, cinematic.

Clip B prompt:
> A very slow push-in on the molten iron pour. Orange sparks rise and drift upwards, slowing and softening until they become the warm string lights above an evening rooftop gathering, with mountains at blue hour. The camera settles on a firm handshake in the foreground. One continuous smooth camera move, no cuts, photorealistic, cinematic.

Clip C prompt:
> A slow drone flight forward over the night city, past the glowing light trails on the flyover, towards the dark mountains. The city lights give way to rows of oil lamps as the camera arrives above an ancient temple tank with a glowing carved gopuram, and a hilltop temple with a lit stairway behind it. One continuous smooth forward camera move at a constant speed, no cuts, photorealistic, cinematic.

## Motion v1 (superseded): 2 start-frame-only generations

Only two clips are generated, so they go on the scenes with real motion. The other four
chapters move with a slow push-in on the still, built locally with ffmpeg at no credit cost.
Chapters are joined with a soft crossfade.

| Chapter | Motion | Source |
|---|---|---|
| K1 Dawn | Drone glides forward, mist drifts | **Higgsfield clip A** |
| K2 Mill | Slow push down the aisle | Local |
| K3 Foundry | Pour, sparks, smoke | **Higgsfield clip B** |
| K4 Rooftop | Slow push towards the handshake | Local |
| K5 Night city | Slow push towards the towers | Local |
| K6 Temples | Slow push in, finale | Local |

Settings for both clips: image-to-video, **start frame only** (no end frame), 16:9, 1080p, 5 s,
no audio, prompt enhancer **off**.

### Clip A: start frame `keyframes/K1.png`

Prompt:
> Slow, smooth drone shot gliding forward along the straight road towards the city and the mountains, gently descending. Morning mist drifts slowly across the rooftops and through the coconut palms. Soft golden sunrise light spreads across the buildings and the four chimneys. The mountains stay still and solid on the horizon. One continuous shot at a steady, constant speed, no cuts, photorealistic, cinematic.

Negative prompt:
> camera shake, fast motion, cuts, scene change, morphing, warping buildings, melting, new objects appearing, people, text, logos, watermark, flicker, distortion

### Clip B: start frame `keyframes/K3.png`

Prompt:
> Locked-off camera with a very slow push-in towards the pour. Bright molten iron flows steadily from the tilted ladle into the mould. Orange sparks burst upwards and fall in slow arcs. Heat haze and thin smoke drift upwards. The worker stands still in silhouette. The cast-iron pump casings and copper motor parts in the foreground stay completely still and sharp. One continuous shot, no cuts, photorealistic, cinematic.

Negative prompt:
> camera shake, fast motion, cuts, scene change, morphing, warping, melting objects, extra people, faces, the ladle moving away, text, logos, watermark, flicker, distortion

Save the downloads as `clips/01-dawn.mp4` and `clips/03-foundry.mp4`.

## Page copy (draft — numbers in [brackets] need your confirmation)

**Brand:** Coimbatore Entrepreneurs Forum · **CEF** · *Meet. Learn. Collaborate. Grow.*
**Description:** A private networking forum for founders, manufacturers and technology leaders across Coimbatore and the Kongu belt.

1. *Coimbatore, Tamil Nadu* — **At the foot of the Ghats.** — Every morning, the Western Ghats watch a city of makers switch on.
2. *Multiple industries* — **The Manchester of the South.** — Spindles, pumps, castings and code: [N]+ founders behind the machines India runs on.
3. *The craft* — **Forged in Kovai.** — Half of India's pumps and motors start life in this city's foundries and workshops.
4. *The gathering* — **Built on Kongu hospitality.** — Business, mental health, honest challenges, over a good filter coffee.
5. *The network* — **₹[N] Cr of trust, in motion.** — Leads, referrals and partnerships between people who vouch for each other.
6. *Your seat* — **Trust, as old as Perur.** — Meet. Learn. Collaborate. Grow. Your seat is waiting.

Industries: Textiles & spinning · Pumps & motors · Foundry & auto components · Wet grinders & appliances ·
Machine tools & engineering · IT & SaaS · Healthcare · Education · Real estate & infrastructure · Jewellery

Events reason line: "Monthly dinners, workshops and masterclasses — from Race Course to the foothills of the Ghats."
