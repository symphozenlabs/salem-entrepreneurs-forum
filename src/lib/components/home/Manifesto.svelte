<script lang="ts">
	import { onMount } from 'svelte';
	import { gsap, prefersReducedMotion } from '#lib/motion.ts';

	let root: HTMLElement;

	const mission =
		'To build a vibrant ecosystem where business owners connect, exchange ideas, create opportunities and grow together.';
	const highlight = new Set(['connect,', 'exchange', 'create', 'grow']);

	onMount(() => {
		if (prefersReducedMotion()) return;
		const ctx = gsap.context(() => {
			gsap.fromTo(
				'[data-mw]',
				{ opacity: 0.12 },
				{
					opacity: 1,
					stagger: 0.1,
					ease: 'none',
					scrollTrigger: { trigger: '[data-mission]', start: 'top 75%', end: 'bottom 45%', scrub: true }
				}
			);
		}, root);
		return () => ctx.revert();
	});
</script>

<section bind:this={root} data-nav="dark" class="relative overflow-hidden bg-ink-900 py-32 text-ivory-100 sm:py-48">
	<div
		class="pointer-events-none absolute -top-1/3 -left-1/4 size-[70vmax] rounded-full bg-[radial-gradient(circle,rgb(201_151_63/0.16),transparent_60%)]"
	></div>
	<div class="relative mx-auto max-w-6xl px-6 sm:px-10">
		<p class="eyebrow text-brass-300">Our mission</p>
		<p data-mission class="display mt-10 text-[clamp(2.25rem,4.8vw,4.5rem)] leading-[1.08]">
			{#each mission.split(' ') as w, i (i)}
				<span data-mw class={highlight.has(w) ? 'text-brass-300 italic' : ''}>{w}</span>{' '}
			{/each}
		</p>

		<div class="mt-24 grid gap-10 border-t border-ivory-100/10 pt-12 sm:grid-cols-[12rem_1fr]">
			<p class="eyebrow text-brass-300">Our vision</p>
			<p class="max-w-xl text-xl leading-relaxed text-ivory-200/80">
				To become one of the most active entrepreneur communities in Tamil Nadu — and the first
				call any Salem founder makes.
			</p>
		</div>
	</div>
</section>
