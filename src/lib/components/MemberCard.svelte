<script lang="ts">
	import { gsap, prefersReducedMotion } from '#lib/motion.ts';

	type Props = { name?: string; number?: string; validTill?: string; industry?: string };
	let {
		name = 'Your Name',
		number = 'SEF · 0151',
		validTill = '12 / 27',
		industry = 'Founder · Salem'
	}: Props = $props();

	let card: HTMLDivElement;
	let sheenX = $state(30);
	let sheenY = $state(20);

	// Deterministic QR-like pattern; the real card renders an actual QR for the member profile.
	const cells = Array.from({ length: 121 }, (_, i) => ((i * 7919) % 13) % 3 !== 0);
	const finder = (i: number) => {
		const x = i % 11;
		const y = Math.floor(i / 11);
		return (x < 3 && y < 3) || (x > 7 && y < 3) || (x < 3 && y > 7);
	};

	function move(e: PointerEvent) {
		if (prefersReducedMotion()) return;
		const r = card.getBoundingClientRect();
		const px = (e.clientX - r.left) / r.width;
		const py = (e.clientY - r.top) / r.height;
		sheenX = px * 100;
		sheenY = py * 100;
		gsap.to(card, { rotateY: (px - 0.5) * 22, rotateX: (0.5 - py) * 18, duration: 0.6, ease: 'power3.out' });
	}
	function leave() {
		gsap.to(card, { rotateY: -8, rotateX: 6, duration: 1.2, ease: 'elastic.out(1, 0.5)' });
	}
</script>

<div class="mx-auto w-full max-w-md [perspective:1400px]">
	<div
		bind:this={card}
		role="img"
		aria-label="Sample Salem Entrepreneurs Forum digital member card"
		onpointermove={move}
		onpointerleave={leave}
		class="relative aspect-[1.586] w-full overflow-hidden rounded-2xl bg-gradient-to-br from-ink-800 via-ink-900 to-ink-950 p-7 text-ivory-100 shadow-[0_40px_80px_-30px_rgb(7_13_24/0.6)] ring-1 ring-brass-400/40 [transform-style:preserve-3d] [transform:rotateY(-8deg)_rotateX(6deg)]"
	>
		<!-- Foil sheen that follows the pointer -->
		<div
			class="pointer-events-none absolute inset-0 mix-blend-soft-light"
			style="background: radial-gradient(circle at {sheenX}% {sheenY}%, rgb(236 214 166 / 0.55), transparent 45%)"
		></div>
		<div
			class="pointer-events-none absolute inset-0 opacity-30"
			style="background: repeating-linear-gradient(115deg, transparent 0 14px, rgb(201 151 63 / 0.08) 14px 15px)"
		></div>

		<div class="relative flex h-full flex-col justify-between">
			<div class="flex items-start justify-between">
				<img src="/brand/logo-light.png" alt="" class="w-32" />
				<span class="eyebrow rounded-full border border-brass-400/50 px-3 py-1 text-[0.6rem] text-brass-200"
					>Member</span
				>
			</div>
			<div class="flex items-end justify-between gap-4">
				<div>
					<p class="display text-2xl sm:text-3xl">{name}</p>
					<p class="mt-1 text-xs text-ivory-200/60">{industry}</p>
					<div class="mt-4 flex gap-6 font-mono text-[0.7rem] tracking-widest text-brass-200">
						<span>{number}</span>
						<span>VALID {validTill}</span>
					</div>
				</div>
				<div class="grid size-16 shrink-0 grid-cols-11 gap-px rounded bg-ivory-50 p-1.5" aria-hidden="true">
					{#each cells as on, i (i)}
						<span class={on || finder(i) ? 'bg-ink-900' : ''}></span>
					{/each}
				</div>
			</div>
		</div>
	</div>
</div>
