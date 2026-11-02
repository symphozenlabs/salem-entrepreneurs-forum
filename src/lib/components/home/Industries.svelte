<script lang="ts">
	import { onMount } from 'svelte';
	import { industries } from '#lib/content.ts';
	import { gsap, prefersReducedMotion } from '#lib/motion.ts';

	let section: HTMLElement;
	let track: HTMLElement;

	// Tonal washes per panel; swapped for Higgsfield stills once those are generated.
	const washes = [
		'from-[#2a1a12] via-[#5c2f1c] to-[#a5492c]',
		'from-[#0c1626] via-[#1f3150] to-[#4a5a75]',
		'from-[#2b2416] via-[#6b5527] to-[#c9973f]',
		'from-[#0a1a24] via-[#123848] to-[#2d6b74]',
		'from-[#1a1424] via-[#3a2a48] to-[#7a5a8a]',
		'from-[#1c1a17] via-[#3d3a33] to-[#8e6424]'
	];

	onMount(() => {
		if (prefersReducedMotion() || window.innerWidth < 1024) return;
		const ctx = gsap.context(() => {
			const distance = () => track.scrollWidth - window.innerWidth;
			const tween = gsap.to(track, {
				x: () => -distance(),
				ease: 'none',
				scrollTrigger: {
					trigger: section,
					start: 'top top',
					end: () => `+=${distance()}`,
					pin: true,
					scrub: 0.6,
					invalidateOnRefresh: true
				}
			});
			// Each panel's numeral drifts against the track for depth.
			gsap.utils.toArray<HTMLElement>('[data-num]').forEach((n) => {
				gsap.fromTo(
					n,
					{ xPercent: 30 },
					{
						xPercent: -30,
						ease: 'none',
						scrollTrigger: {
							trigger: n.parentElement,
							containerAnimation: tween,
							start: 'left right',
							end: 'right left',
							scrub: true
						}
					}
				);
			});
		}, section);
		return () => ctx.revert();
	});
</script>

<section bind:this={section} data-nav="dark" class="relative overflow-hidden bg-ink-950 text-ivory-100">
	<div
		bind:this={track}
		class="flex flex-col gap-6 px-6 py-24 lg:h-svh lg:w-max lg:flex-row lg:items-center lg:gap-8 lg:px-10 lg:py-0"
	>
		<div class="shrink-0 lg:w-[34vw] lg:pr-10">
			<p class="eyebrow text-brass-300">Who sits at the table</p>
			<h2 class="display mt-6 text-[clamp(2.75rem,5vw,5rem)]">Six industries.<br />One forum.</h2>
			<p class="mt-6 max-w-sm text-ivory-200/70">
				Owners, managing directors, founders and factory operators from across Salem and the
				Kongu belt.
			</p>
		</div>

		{#each industries as ind, i (ind.name)}
			<article
				class="group relative h-[60svh] shrink-0 overflow-hidden rounded-[2px] bg-gradient-to-br lg:h-[72svh] lg:w-[30vw] {washes[i]}"
			>
				<span
					data-num
					class="display pointer-events-none absolute -right-6 -bottom-10 text-[22rem] leading-none text-ivory-50/[0.07]"
					>0{i + 1}</span
				>
				<div
					class="absolute inset-0 bg-gradient-to-t from-ink-950/80 via-transparent to-transparent"
				></div>
				<div class="absolute inset-x-0 bottom-0 p-8">
					<div class="hairline mb-6 w-16 origin-left transition-[width] duration-700 ease-out-expo group-hover:w-full"></div>
					<h3 class="display text-5xl">{ind.name}</h3>
					<p class="mt-3 text-sm text-ivory-200/70">{ind.note}</p>
				</div>
			</article>
		{/each}
		<div class="hidden w-[10vw] shrink-0 lg:block"></div>
	</div>
</section>
