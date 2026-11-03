<script lang="ts">
	import { onMount } from 'svelte';
	import { chapters, brand } from '#lib/content.ts';
	import { gsap, ScrollTrigger, getLenis, prefersReducedMotion } from '#lib/motion.ts';

	/**
	 * /story/manifest.json is written by scripts/frames.sh from the Higgsfield clips, and
	 * scripts/keyframes.py adds `stills`: the frame each chapter rests on plus a sharp
	 * full-resolution still of it. Until it exists the section runs on an ambient light-field.
	 */
	type FrameSet = { count: number; width: number; height: number; pattern: string; pad: number };
	type Stills = { frames: number[]; desktop: string; mobile: string };
	type Manifest = {
		sets: { desktop: FrameSet; mobile?: FrameSet };
		stills?: Stills;
		poster?: string;
	};

	let section = $state<HTMLElement>();
	let canvas = $state<HTMLCanvasElement>();
	let progress = $state(0);
	let hasFrames = $state(false);
	let reduced = $state(false);

	// Chapter text fades over WINDOW either side of its rest zone.
	const WINDOW = 0.06;
	// Half-width of each chapter's rest zone: the video holds on the chapter's keyframe here.
	const HOLD = 0.03;
	// How far beyond the rest zone the sharp still dissolves back into the video.
	const STILL_FADE = 0.025;

	// Where scrolling comes to rest: the top of the story, each later chapter, and the exit.
	const snapPoints = [0, ...chapters.slice(1).map((c) => c.at), 1];

	/** Signed distance from chapter i's rest zone, in progress units (0 inside it). */
	function offset(i: number, p: number) {
		const { at } = chapters[i];
		// First chapter rests from the very top; last one stays once reached.
		if ((i === 0 && p <= at) || (i === chapters.length - 1 && p >= at)) return 0;
		const d = p - at;
		return Math.sign(d) * Math.max(0, Math.abs(d) - HOLD);
	}

	function chapterStyle(i: number, p: number) {
		const d = offset(i, p) / WINDOW;
		if (d === 0) return 'opacity:1;transform:none';
		const o = Math.max(0, 1 - d * d);
		return `opacity:${o};transform:translate3d(0,${-d * 28}px,0);filter:blur(${(1 - o) * 8}px);visibility:${o < 0.01 ? 'hidden' : 'visible'}`;
	}

	const fill = (pattern: string, i: number, pad = 0) =>
		pattern.replace('{i}', String(i).padStart(pad, '0'));

	onMount(() => {
		reduced = prefersReducedMotion();
		if (reduced) return;

		const cv = canvas!;
		const ctx = cv.getContext('2d')!;
		let images: HTMLImageElement[] = [];
		let stills: HTMLImageElement[] = [];
		let set: FrameSet | null = null;
		// Frame index each chapter rests on.
		let rests: number[] = [];
		let lastDrawn = '';

		function resize() {
			const dpr = Math.min(window.devicePixelRatio, 2);
			cv.width = cv.clientWidth * dpr;
			cv.height = cv.clientHeight * dpr;
			lastDrawn = '';
			draw(progress);
		}

		/** Video frame for progress p: held on each chapter's keyframe, scrubbed between them. */
		function frameAt(p: number) {
			const last = chapters.length - 1;
			if (p <= chapters[0].at + HOLD) return rests[0];
			for (let i = 0; i < last; i++) {
				const from = chapters[i].at + HOLD;
				const to = chapters[i + 1].at - HOLD;
				if (p < to)
					return Math.round(rests[i] + ((p - from) / (to - from)) * (rests[i + 1] - rests[i]));
				if (p <= chapters[i + 1].at + HOLD) return rests[i + 1];
			}
			return rests[last];
		}

		function paint(img: HTMLImageElement, alpha = 1) {
			const s = Math.max(cv.width / img.naturalWidth, cv.height / img.naturalHeight);
			const w = img.naturalWidth * s;
			const h = img.naturalHeight * s;
			ctx.globalAlpha = alpha;
			ctx.drawImage(img, (cv.width - w) / 2, (cv.height - h) / 2, w, h);
			ctx.globalAlpha = 1;
		}

		const ready = (img?: HTMLImageElement) => !!img?.complete && img.naturalWidth > 0;

		function draw(p: number) {
			if (!set) return;
			let i = frameAt(p);
			// Fall back to the nearest frame that has already loaded.
			let back = i;
			while (back > 0 && !ready(images[back])) back--;
			i = ready(images[i]) ? i : back;

			// The sharp still of the nearest chapter, fully in while resting on it.
			let c = 0;
			for (let k = 1; k < chapters.length; k++)
				if (Math.abs(offset(k, p)) < Math.abs(offset(c, p))) c = k;
			const still = ready(stills[c]) ? stills[c] : undefined;
			const alpha = still ? Math.max(0, 1 - Math.abs(offset(c, p)) / STILL_FADE) : 0;

			const key = `${i}|${c}|${alpha.toFixed(3)}`;
			if (key === lastDrawn || (!ready(images[i]) && alpha === 0)) return;
			lastDrawn = key;

			ctx.imageSmoothingEnabled = true;
			ctx.imageSmoothingQuality = 'high';
			if (alpha < 1 && ready(images[i])) paint(images[i]);
			if (still && alpha > 0) paint(still, alpha);
		}

		function loadImage(src: string, onDone: () => void) {
			return new Promise<HTMLImageElement>((resolve) => {
				const img = new Image();
				img.decoding = 'async';
				img.onload = img.onerror = () => {
					onDone();
					resolve(img);
				};
				img.src = src;
			});
		}

		function shown() {
			if (hasFrames) return;
			hasFrames = true;
			resize();
		}

		async function loadFrames() {
			const res = await fetch('/story/manifest.json').catch(() => null);
			if (!res?.ok) return;
			const manifest: Manifest = await res.json();
			const mobile = window.innerWidth < 768 && !!manifest.sets.mobile;
			const frameSet = mobile ? manifest.sets.mobile! : manifest.sets.desktop;
			const stillSet = manifest.stills?.frames.length === chapters.length ? manifest.stills : null;
			rests = stillSet
				? stillSet.frames
				: chapters.map((c) => Math.round(c.at * (frameSet.count - 1)));
			images = new Array(frameSet.count);
			stills = new Array(chapters.length);
			set = frameSet;

			// Stills load one after another, the opening chapter's first, alongside the frames.
			if (stillSet) {
				const pattern = mobile ? stillSet.mobile : stillSet.desktop;
				(async () => {
					for (let k = 0; k < chapters.length; k++) {
						stills[k] = await loadImage(fill(pattern, k + 1), () => {
							if (k === 0) shown();
						});
						draw(progress);
					}
				})();
			}

			// Coarse-to-fine: every 8th frame, then 4th, 2nd, then the rest.
			const order: number[] = [];
			for (const step of [8, 4, 2, 1])
				for (let i = 0; i < frameSet.count; i += step) if (!order.includes(i)) order.push(i);

			const load = async (i: number) => {
				const pending = loadImage(fill(frameSet.pattern, i + 1, frameSet.pad), () => {
					if (i === 0) shown();
				});
				images[i] = await pending;
				draw(progress);
			};

			// Six parallel lanes keeps the network busy without starving the rest of the page.
			const queue = [...order];
			await Promise.all(
				Array.from({ length: 6 }, async () => {
					while (queue.length) await load(queue.shift()!);
				})
			);
		}

		const st = ScrollTrigger.create({
			trigger: section!,
			start: 'top top',
			end: 'bottom bottom',
			scrub: true,
			onUpdate: (self) => {
				progress = self.progress;
				draw(self.progress);
			}
		});

		// When scrolling stops inside the story, glide on to the next chapter in the direction
		// of travel (or back, if still inside the one just left) so the view always settles
		// on a sharp keyframe with its text fully in place.
		function settle() {
			const p = st.progress;
			if (p <= 0 || p >= 1) return;
			const target =
				st.direction > 0
					? snapPoints.find((s) => s >= p - HOLD)!
					: snapPoints.findLast((s) => s <= p + HOLD)!;
			const y = st.start + target * (st.end - st.start);
			if (Math.abs(y - window.scrollY) < 2) return;
			const lenis = getLenis();
			if (lenis) lenis.scrollTo(y, { duration: 0.9, easing: (t) => 1 - Math.pow(1 - t, 3) });
			else window.scrollTo({ top: y, behavior: 'smooth' });
		}
		ScrollTrigger.addEventListener('scrollEnd', settle);

		const intro = gsap.from('[data-story-intro] > *', {
			y: 30,
			opacity: 0,
			duration: 1.4,
			ease: 'expo.out',
			stagger: 0.12,
			delay: 0.9
		});

		window.addEventListener('resize', resize);
		resize();
		loadFrames();

		return () => {
			st.kill();
			intro.kill();
			ScrollTrigger.removeEventListener('scrollEnd', settle);
			window.removeEventListener('resize', resize);
		};
	});
</script>

{#if reduced}
	<section id="story" class="bg-ink-900 px-6 py-32 text-ivory-100">
		<div class="mx-auto max-w-4xl space-y-24">
			<img src="/brand/logo-light.png" alt={brand.name} class="w-72" />
			{#each chapters as c (c.title)}
				<div>
					<p class="eyebrow text-brass-300">{c.eyebrow}</p>
					<h2 class="display mt-4 text-5xl">{c.title}</h2>
					<p class="mt-4 max-w-md text-ivory-200/80">{c.body}</p>
				</div>
			{/each}
		</div>
	</section>
{:else}
	<section id="story" bind:this={section} class="relative h-[700vh] bg-ink-950">
		<div class="sticky top-0 h-svh overflow-hidden">
			<!-- Ambient light-field: shown until frames arrive, and behind them as a base -->
			<div
				class="absolute inset-0"
				style="--p:{progress}; background:
					radial-gradient(60vmax 50vmax at calc(20% + var(--p) * 60%) calc(70% - var(--p) * 40%), rgb(201 151 63 / 0.28), transparent 60%),
					radial-gradient(50vmax 40vmax at calc(85% - var(--p) * 50%) 30%, rgb(165 73 44 / 0.18), transparent 60%),
					radial-gradient(80vmax 60vmax at 50% 120%, rgb(31 49 80 / 0.9), transparent 70%),
					var(--color-ink-950);"
			></div>

			<canvas
				bind:this={canvas}
				class="absolute inset-0 h-full w-full transition-opacity duration-1000"
				class:opacity-0={!hasFrames}
				aria-hidden="true"
			></canvas>

			<!-- Legibility: a soft vignette and a darker left edge where the copy sits -->
			<div
				class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgb(7_13_24/0.75))]"
			></div>
			<div
				class="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink-950/80 via-ink-950/20 to-transparent"
			></div>

			<!-- Chapters -->
			<div class="relative mx-auto flex h-full max-w-7xl items-center px-6 sm:px-10">
				{#each chapters as c, i (c.title)}
					<div class="absolute max-w-2xl will-change-transform" style={chapterStyle(i, progress)}>
						{#if i === 0}
							<div data-story-intro>
								<img
									src="/brand/logo-light.png"
									alt={brand.name}
									class="mb-10 w-60 sm:w-80"
									fetchpriority="high"
								/>
								<p class="eyebrow text-brass-300">{c.eyebrow}</p>
								<h1 class="display mt-5 text-[clamp(3rem,8vw,7rem)] text-ivory-50">
									{c.title}
								</h1>
								<p class="mt-6 max-w-md text-lg text-ivory-200/80">{c.body}</p>
							</div>
						{:else}
							<p class="eyebrow text-brass-300">
								<span class="text-ivory-200/50">0{i + 1} —</span>
								{c.eyebrow}
							</p>
							<h2 class="display mt-5 text-[clamp(2.75rem,7vw,6.5rem)] text-ivory-50">
								{#if i === chapters.length - 1}
									<span class="text-brass-gradient">{c.title}</span>
								{:else}
									{c.title}
								{/if}
							</h2>
							<p class="mt-6 max-w-md text-lg text-ivory-200/80">{c.body}</p>
							{#if i === chapters.length - 1}
								<div class="mt-10 flex flex-wrap gap-4">
									<a
										href="/join"
										class="rounded-full bg-brass-400 px-8 py-4 text-sm font-semibold tracking-wide text-ink-950 transition hover:bg-brass-300"
										>Apply for membership</a
									>
									<a
										href="#why"
										class="rounded-full border border-ivory-100/30 px-8 py-4 text-sm font-semibold tracking-wide text-ivory-100 transition hover:border-brass-300 hover:text-brass-200"
										>Why the forum</a
									>
								</div>
							{/if}
						{/if}
					</div>
				{/each}
			</div>

			<!-- Progress rail -->
			<div
				class="absolute top-1/2 right-6 hidden h-[46vh] -translate-y-1/2 items-stretch gap-4 sm:right-10 md:flex"
			>
				<ol class="flex flex-col justify-between text-right">
					{#each chapters as c, i (c.title)}
						<li
							class="eyebrow transition-colors duration-500 {progress >= c.at - WINDOW
								? 'text-brass-300'
								: 'text-ivory-200/30'}"
						>
							0{i + 1}
						</li>
					{/each}
				</ol>
				<div class="relative w-px bg-ivory-100/15">
					<div
						class="absolute inset-x-0 top-0 bg-gradient-to-b from-brass-300 to-brass-500"
						style="height:{progress * 100}%"
					></div>
				</div>
			</div>

			<!-- Scroll cue -->
			<div
				class="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3 text-ivory-200/60 transition-opacity duration-700"
				style="opacity:{progress > 0.02 ? 0 : 1}"
			>
				<span class="eyebrow">Scroll to begin</span>
				<span class="relative h-12 w-px overflow-hidden bg-ivory-100/20">
					<span class="absolute inset-x-0 top-0 h-1/2 animate-[cue_1.8s_ease-in-out_infinite] bg-brass-300"
					></span>
				</span>
			</div>
		</div>
	</section>
{/if}

<style>
	@keyframes -global-cue {
		0% {
			transform: translateY(-100%);
		}
		100% {
			transform: translateY(200%);
		}
	}
</style>
