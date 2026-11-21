// The "New Member" poster: drawn in the browser at Instagram's 4:5 portrait size, so names are
// real text and each poster is free to make.

export const POSTER = { width: 1080, height: 1350 };

export type PhotoStyle = 'cutout' | 'framed';

export type PosterContent = {
	/** "Salem Entrepreneurs Forum" */
	forumName: string;
	place: string;
	name: string;
	business: string;
	designation: string;
	/** "130+" */
	count: string;
	style: PhotoStyle;
	/** 100 = the normal size. */
	zoom: number;
	/** Nudges the photo, in poster pixels. */
	moveX: number;
	moveY: number;
};

export type PosterImages = {
	background: HTMLImageElement;
	logo: HTMLImageElement | null;
	icons: HTMLImageElement[];
	photo: CanvasImageSource | null;
	photoSize: { width: number; height: number } | null;
	cutout: HTMLCanvasElement | null;
};

const INK = '#0b1a33';
const NAVY = '#10294f';
const GOLD = '#e0b04f';
const GOLD_LIGHT = '#f8e2a6';
const DISPLAY = '"Fraunces Variable", "Times New Roman", serif';
const SANS = '"Manrope Variable", system-ui, sans-serif';

const circle = (x: number, y: number, r: number) =>
	`M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;

const STRIP = [
	{
		label: ['Meeting', 'Like-Minded People'],
		d: `M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3.128a4 4 0 0 1 0 7.744M22 21v-2a4 4 0 0 0-3-3.87${circle(9, 7, 4)}`
	},
	{
		label: ['Mental Wellness', 'Programs'],
		d: `M12 5a3 3 0 1 1 3 3m-3-3a3 3 0 1 0-3 3m3-3v1M9 8a3 3 0 1 0 3 3M9 8h1m5 0a3 3 0 1 1-3 3m3-3h-1m-2 3v-1${circle(12, 8, 2)}M12 10v12M12 22c4.2 0 7-1.667 7-5-4.2 0-7 1.667-7 5ZM12 22c-4.2 0-7-1.667-7-5 4.2 0 7 1.667 7 5Z`
	},
	{
		label: ['Travel'],
		d: `M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0${circle(12, 10, 3)}`
	},
	{ label: ['Business', 'Retreat'], d: 'm8 3 4 8 5-5 5 15H2L8 3z' },
	{
		label: ['Public', 'Branding'],
		d: 'M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zM6 14a12 12 0 0 0 2.4 7.2 2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14M8 6v8'
	},
	{
		label: ['Sports'],
		d: 'M10 14.66V17a1 1 0 0 1-1 1 2 2 0 0 0-2 2v2M14 14.66V17a1 1 0 0 0 1 1 2 2 0 0 1 2 2v2M17.916 10H19.5A2.5 2.5 0 0 0 22 7.5V5a1 1 0 0 0-1-1h-3M4 22h16M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1zM6.084 10H4.5A2.5 2.5 0 0 1 2 7.5V5a1 1 0 0 1 1-1h3'
	}
];

const iconUrl = (d: string) =>
	'data:image/svg+xml,' +
	encodeURIComponent(
		`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="${GOLD_LIGHT}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`
	);

export const loadImage = (src: string) =>
	new Promise<HTMLImageElement>((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error(`Couldn’t load ${src}`));
		img.src = src;
	});

/** The fonts, background, logo and icons every poster needs. */
export async function loadPosterAssets(background: string, logo: string | null) {
	await Promise.all([
		document.fonts.load(`700 60px ${DISPLAY}`),
		document.fonts.load(`italic 500 40px ${DISPLAY}`),
		document.fonts.load(`700 30px ${SANS}`)
	]);
	const [bg, logoImg, icons] = await Promise.all([
		loadImage(background),
		logo ? loadImage(logo) : null,
		Promise.all(STRIP.map((s) => loadImage(iconUrl(s.d))))
	]);
	return { background: bg, logo: logoImg, icons };
}

type Ctx = CanvasRenderingContext2D;

function rounded(c: Ctx, x: number, y: number, w: number, h: number, r: number) {
	c.beginPath();
	c.roundRect(x, y, w, h, r);
}

const goldGradient = (c: Ctx, x0: number, x1: number) => {
	const g = c.createLinearGradient(x0, 0, x1, 0);
	g.addColorStop(0, '#b67f22');
	g.addColorStop(0.45, GOLD_LIGHT);
	g.addColorStop(1, '#c58f2d');
	return g;
};

function cover(
	c: Ctx,
	img: CanvasImageSource,
	iw: number,
	ih: number,
	x: number,
	y: number,
	w: number,
	h: number
) {
	const s = Math.max(w / iw, h / ih);
	const sw = w / s;
	const sh = h / s;
	c.drawImage(img, (iw - sw) / 2, Math.max(0, (ih - sh) * 0.3), sw, sh, x, y, w, h);
}

/** Breaks text into at most `max` lines that fit, shrinking the font until they do. */
function fit(
	c: Ctx,
	text: string,
	font: (size: number) => string,
	start: number,
	min: number,
	width: number,
	max: number
) {
	const words = text.trim().split(/\s+/).filter(Boolean);
	for (let size = start; ; size -= 2) {
		c.font = font(size);
		const lines: string[] = [];
		let line = '';
		for (const w of words) {
			const next = line ? `${line} ${w}` : w;
			if (line && c.measureText(next).width > width) {
				lines.push(line);
				line = w;
			} else line = next;
		}
		if (line) lines.push(line);
		const fits = lines.length <= max && lines.every((l) => c.measureText(l).width <= width);
		if (fits || size <= min) {
			if (lines.length > max) {
				const kept = lines.slice(0, max);
				kept[max - 1] = lines.slice(max - 1).join(' ');
				return { size, lines: kept };
			}
			return { size, lines };
		}
	}
}

function drawHeader(c: Ctx, p: PosterContent, logo: HTMLImageElement | null) {
	if (logo) {
		const w = 500;
		c.drawImage(logo, (POSTER.width - w) / 2, 30, w, (w * logo.height) / logo.width);
		return;
	}
	c.textAlign = 'center';
	c.fillStyle = '#fff';
	c.font = `600 46px ${SANS}`;
	c.letterSpacing = '10px';
	c.fillText(p.place.toUpperCase(), POSTER.width / 2, 78);
	c.letterSpacing = '0px';
	c.font = `700 74px ${DISPLAY}`;
	c.fillText('Entrepreneurs', POSTER.width / 2, 150);
	c.fillStyle = goldGradient(c, 400, 680);
	c.font = `700 34px ${SANS}`;
	c.letterSpacing = '14px';
	c.fillText('FORUM', POSTER.width / 2, 196);
	c.letterSpacing = '0px';
}

function drawPhoto(c: Ctx, p: PosterContent, im: PosterImages) {
	const scale = p.zoom / 100;
	if (p.style === 'cutout' && im.cutout) {
		const h = 900 * scale;
		const w = (h * im.cutout.width) / im.cutout.height;
		const x = 255 - w / 2 + p.moveX;
		const y = 1150 - h + p.moveY;
		c.save();
		c.shadowColor = 'rgb(0 0 0 / 0.55)';
		c.shadowBlur = 36;
		c.shadowOffsetX = 8;
		c.drawImage(im.cutout, x, y, w, h);
		c.restore();
		return;
	}
	// A gold arch: works for any photo, and shows initials until one is added.
	const [x, y, w, h] = [42, 280, 400, 680];
	c.save();
	c.beginPath();
	c.moveTo(x, y + h);
	c.lineTo(x, y + w / 2);
	c.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0);
	c.lineTo(x + w, y + h);
	c.closePath();
	c.save();
	c.clip();
	c.fillStyle = NAVY;
	c.fillRect(x, y, w, h);
	if (im.photo && im.photoSize) {
		const zw = w * scale;
		const zh = h * scale;
		cover(
			c,
			im.photo,
			im.photoSize.width,
			im.photoSize.height,
			x - (zw - w) / 2 + p.moveX,
			y - (zh - h) / 2 + p.moveY,
			zw,
			zh
		);
	} else {
		const initials = p.name
			.trim()
			.split(/\s+/)
			.map((n) => n[0])
			.slice(0, 2)
			.join('')
			.toUpperCase();
		c.fillStyle = GOLD_LIGHT;
		c.font = `700 150px ${DISPLAY}`;
		c.textAlign = 'center';
		c.fillText(initials, x + w / 2, y + h / 2 + 50);
	}
	c.restore();
	c.lineWidth = 9;
	c.strokeStyle = goldGradient(c, x, x + w);
	c.stroke();
	c.restore();
}

function drawWelcome(c: Ctx, p: PosterContent) {
	const cx = 765;
	c.textAlign = 'center';
	c.fillStyle = '#fff';
	c.shadowColor = 'rgb(0 0 0 / 0.65)';
	c.shadowBlur = 12;
	c.font = `italic 600 42px ${DISPLAY}`;
	c.fillText('We are happy to', cx, 280);
	c.font = `700 52px ${DISPLAY}`;
	c.fillText('Onboard our', cx, 340);
	c.shadowBlur = 0;

	c.fillStyle = goldGradient(c, 500, 1030);
	c.beginPath();
	c.moveTo(535, 365);
	c.lineTo(1040, 365);
	c.lineTo(1005, 455);
	c.lineTo(500, 455);
	c.closePath();
	c.fill();
	c.fillStyle = INK;
	c.font = `700 64px ${DISPLAY}`;
	c.fillText('New Member', cx + 5, 432);

	const [x, y, w, h] = [478, 480, 574, 340];
	c.save();
	c.shadowColor = 'rgb(0 0 0 / 0.4)';
	c.shadowBlur = 26;
	c.fillStyle = '#fffaf0';
	rounded(c, x, y, w, h, 28);
	c.fill();
	c.restore();
	c.lineWidth = 5;
	c.strokeStyle = goldGradient(c, x, x + w);
	rounded(c, x, y, w, h, 28);
	c.stroke();

	const inner = w - 56;
	const name = fit(c, p.name, (s) => `700 ${s}px ${SANS}`, 66, 32, inner, 2);
	const biz = p.business.trim()
		? fit(c, p.business, (s) => `600 ${s}px ${SANS}`, 40, 22, inner, 2)
		: null;
	// Name and business sit centred in the space above the designation.
	const nameHeight = name.size * 1.1 * name.lines.length;
	const bizHeight = biz ? 32 + biz.size * 1.18 * biz.lines.length : 0;
	const room = h - (p.designation.trim() ? 84 : 0);
	let ty = y + Math.max(16, (room - nameHeight - bizHeight) / 2) + name.size * 0.86;

	c.fillStyle = INK;
	c.font = `700 ${name.size}px ${SANS}`;
	name.lines.forEach((l, i) => c.fillText(l, x + w / 2, ty + i * name.size * 1.1));
	ty += (name.lines.length - 1) * name.size * 1.1;

	if (biz) {
		c.fillStyle = goldGradient(c, x + 60, x + w - 60);
		c.fillRect(x + 60, ty + 18, w - 120, 3);
		ty += 26;
		c.fillStyle = INK;
		c.font = `600 ${biz.size}px ${SANS}`;
		for (const l of biz.lines) {
			ty += biz.size * 1.18;
			c.fillText(l, x + w / 2, ty);
		}
	}
	if (p.designation.trim()) {
		const d = fit(c, p.designation, (s) => `700 ${s}px ${SANS}`, 28, 18, inner - 60, 1);
		c.font = `700 ${d.size}px ${SANS}`;
		const pw = Math.min(inner, c.measureText(d.lines[0]).width + 80);
		const py = y + h - 66;
		c.fillStyle = NAVY;
		rounded(c, x + (w - pw) / 2, py, pw, 46, 23);
		c.fill();
		c.fillStyle = '#fff';
		c.fillText(d.lines[0], x + w / 2, py + 23 + d.size * 0.36);
	}
}

function drawBadge(c: Ctx, p: PosterContent) {
	const [x, y, w, h] = [520, 842, 490, 262];
	c.save();
	c.shadowColor = 'rgb(0 0 0 / 0.5)';
	c.shadowBlur = 24;
	c.fillStyle = 'rgb(9 25 52 / 0.94)';
	rounded(c, x, y, w, h, 120);
	c.fill();
	c.restore();
	c.lineWidth = 4;
	c.strokeStyle = goldGradient(c, x, x + w);
	rounded(c, x, y, w, h, 120);
	c.stroke();

	const cx = x + w / 2;
	c.textAlign = 'center';
	c.fillStyle = '#fff';
	c.font = `italic 500 32px ${DISPLAY}`;
	c.fillText('Celebrating', cx, y + 46);
	c.fillStyle = goldGradient(c, cx - 130, cx + 130);
	c.font = `800 84px ${SANS}`;
	c.fillText(p.count, cx, y + 124);
	c.fillStyle = '#fff';
	c.font = `600 26px ${SANS}`;
	c.fillText('Members at', cx, y + 164);

	const label = fit(c, p.forumName, (s) => `800 ${s}px ${SANS}`, 26, 18, w - 110, 1);
	c.font = `800 ${label.size}px ${SANS}`;
	const pw = c.measureText(label.lines[0]).width + 56;
	c.fillStyle = goldGradient(c, cx - pw / 2, cx + pw / 2);
	rounded(c, cx - pw / 2, y + 182, pw, 48, 24);
	c.fill();
	c.fillStyle = INK;
	c.fillText(label.lines[0], cx, y + 215);
}

function drawStrip(c: Ctx, icons: HTMLImageElement[]) {
	const [x, y, w, h] = [28, 1168, 1024, 158];
	c.fillStyle = 'rgb(9 25 52 / 0.96)';
	rounded(c, x, y, w, h, 26);
	c.fill();
	c.lineWidth = 3;
	c.strokeStyle = goldGradient(c, x, x + w);
	rounded(c, x, y, w, h, 26);
	c.stroke();

	const tw = 620;
	c.fillStyle = goldGradient(c, (POSTER.width - tw) / 2, (POSTER.width + tw) / 2);
	rounded(c, (POSTER.width - tw) / 2, y - 26, tw, 52, 26);
	c.fill();
	c.fillStyle = INK;
	c.textAlign = 'center';
	c.font = `italic 700 31px ${DISPLAY}`;
	c.fillText('More than Business discussions we do', POSTER.width / 2, y + 11);

	const cell = w / STRIP.length;
	STRIP.forEach((s, i) => {
		const cx = x + cell * (i + 0.5);
		c.drawImage(icons[i], cx - 25, y + 36, 50, 50);
		c.fillStyle = '#fff';
		c.font = `600 19px ${SANS}`;
		s.label.forEach((l, j) => c.fillText(l, cx, y + 110 + j * 23));
		if (i) {
			c.fillStyle = 'rgb(224 176 79 / 0.45)';
			c.fillRect(x + cell * i, y + 40, 1.5, 90);
		}
	});
}

export function drawPoster(canvas: HTMLCanvasElement, p: PosterContent, im: PosterImages) {
	canvas.width = POSTER.width;
	canvas.height = POSTER.height;
	const c = canvas.getContext('2d')!;
	c.textBaseline = 'alphabetic';
	c.drawImage(im.background, 0, 0, POSTER.width, POSTER.height);

	// Deep blue at the top and bottom keeps the text readable on any photo.
	const shade = c.createLinearGradient(0, 0, 0, POSTER.height);
	shade.addColorStop(0, 'rgb(8 24 54 / 0.9)');
	shade.addColorStop(0.2, 'rgb(12 42 88 / 0.42)');
	shade.addColorStop(0.62, 'rgb(12 42 88 / 0.3)');
	shade.addColorStop(1, 'rgb(6 18 42 / 0.97)');
	c.fillStyle = shade;
	c.fillRect(0, 0, POSTER.width, POSTER.height);

	drawHeader(c, p, im.logo);
	drawPhoto(c, p, im);
	drawWelcome(c, p);
	drawBadge(c, p);
	drawStrip(c, im.icons);
}

// ---- Cutting the person out of their photo ---------------------------------------

type Segmenter = {
	setOptions(o: { modelSelection: number }): void;
	onResults(cb: (r: { segmentationMask: CanvasImageSource }) => void): void;
	send(i: { image: HTMLCanvasElement }): Promise<void>;
};

let segmenter: Promise<Segmenter> | null = null;

/** Runs on this device, so photos aren't sent anywhere. Loaded only when a poster needs it. */
function getSegmenter() {
	segmenter ??= new Promise<Segmenter>((resolve, reject) => {
		const script = document.createElement('script');
		script.src = '/mediapipe/selfie_segmentation.js';
		script.onerror = () => reject(new Error('Couldn’t load the cut-out tool.'));
		script.onload = () => {
			const Ctor = (
				window as unknown as {
					SelfieSegmentation: new (o: { locateFile: (f: string) => string }) => Segmenter;
				}
			).SelfieSegmentation;
			const s = new Ctor({ locateFile: (f) => `/mediapipe/${f}` });
			s.setOptions({ modelSelection: 0 });
			resolve(s);
		};
		document.head.append(script);
	});
	return segmenter;
}

/**
 * The person on a transparent background, trimmed to them. Null when the result doesn't look
 * like one clear person, so the poster falls back to the framed photo.
 */
export async function cutOutPerson(photo: CanvasImageSource, width: number, height: number) {
	const scale = Math.min(1, 1400 / Math.max(width, height));
	const w = Math.round(width * scale);
	const h = Math.round(height * scale);
	const source = document.createElement('canvas');
	source.width = w;
	source.height = h;
	source.getContext('2d')!.drawImage(photo, 0, 0, w, h);

	const s = await getSegmenter();
	const mask = document.createElement('canvas');
	mask.width = w;
	mask.height = h;
	const mc = mask.getContext('2d', { willReadFrequently: true })!;
	await new Promise<void>((resolve, reject) => {
		s.onResults((r) => {
			mc.filter = `blur(${Math.max(3, Math.round(w / 90))}px)`;
			mc.drawImage(r.segmentationMask, 0, 0, w, h);
			mc.filter = 'none';
			resolve();
		});
		s.send({ image: source }).catch(reject);
	});

	// Firm up the soft edge, and find how much of the photo is the person.
	const m = mc.getImageData(0, 0, w, h);
	let [minX, minY, maxX, maxY, solid] = [w, h, 0, 0, 0];
	for (let y = 0; y < h; y++)
		for (let x = 0; x < w; x++) {
			const i = (x + y * w) * 4;
			const v = Math.max(m.data[i], m.data[i + 3] && m.data[i]);
			const a = Math.max(0, Math.min(255, ((v - 200) / 40) * 255));
			m.data[i] = m.data[i + 1] = m.data[i + 2] = 255;
			m.data[i + 3] = a;
			if (a > 128) {
				solid++;
				minX = Math.min(minX, x);
				maxX = Math.max(maxX, x);
				minY = Math.min(minY, y);
				maxY = Math.max(maxY, y);
			}
		}
	const share = solid / (w * h);
	if (share < 0.06 || share > 0.9 || maxX <= minX || maxY <= minY) return null;
	mc.putImageData(m, 0, 0);

	const out = document.createElement('canvas');
	out.width = maxX - minX + 1;
	out.height = maxY - minY + 1;
	const oc = out.getContext('2d')!;
	oc.drawImage(source, -minX, -minY);
	oc.globalCompositeOperation = 'destination-in';
	oc.drawImage(mask, -minX, -minY);
	return out;
}
