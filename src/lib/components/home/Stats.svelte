<script lang="ts">
	import { onMount } from 'svelte';
	import { stats, industries } from '#lib/content.ts';
	import { gsap, prefersReducedMotion, reveal } from '#lib/motion.ts';

	let root: HTMLElement;

	onMount(() => {
		if (prefersReducedMotion()) return;
		const ctx = gsap.context(() => {
			root.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
				const target = Number(el.dataset.count);
				const o = { v: 0 };
				gsap.to(o, {
					v: target,
					duration: 2.2,
					ease: 'expo.out',
					scrollTrigger: { trigger: el, start: 'top 90%' },
					onUpdate: () => (el.textContent = Math.round(o.v).toString())
				});
			});
			gsap.to('[data-marquee]', { xPercent: -50, duration: 40, ease: 'none', repeat: -1 });
		}, root);
		return () => ctx.revert();
	});
</script>

<section bind:this={root} data-nav="light" class="relative bg-ivory-100 pt-32 pb-24 sm:pt-44">
	<div class="mx-auto max-w-7xl px-6 sm:px-10">
		<p class="eyebrow text-brass-600">The forum, in numbers</p>
		<h2 use:reveal class="display mt-6 max-w-4xl text-[clamp(2.5rem,5.5vw,5rem)] text-ink-900">
			A private circle of people who make Salem work.
		</h2>

		<dl class="mt-20 grid grid-cols-2 border-t border-ink-900/10 lg:grid-cols-4">
			{#each stats as s, i (s.label)}
				<div
					class="flex flex-col-reverse justify-end border-b border-ink-900/10 py-10 pr-6 {i % 2 === 0 ? 'border-r' : ''} lg:border-b-0 {i < 3 ? 'lg:border-r' : ''} {i > 0 ? 'lg:pl-10' : ''} {i % 2 === 1 ? 'pl-6' : ''}"
				>
					<dt class="eyebrow mt-4 text-stone-muted">{s.label}</dt>
					<dd class="display text-[clamp(2.4rem,6vw,5.5rem)] whitespace-nowrap text-ink-900 tabular-nums">
						{s.prefix ?? ''}<span data-count={s.value}>{s.value}</span><span class="text-brass-500"
							>{s.suffix}</span
						>
					</dd>
				</div>
			{/each}
		</dl>
	</div>

	<!-- Industry marquee -->
	<div class="mt-24 overflow-hidden border-y border-ink-900/10 py-6" aria-hidden="true">
		<div data-marquee class="flex w-max gap-12 whitespace-nowrap">
			{#each [0, 1] as copy (copy)}
				{#each industries as ind (ind.name + copy)}
					<span class="display text-4xl text-ink-900/80 italic sm:text-5xl">{ind.name}</span>
					<span class="self-center text-brass-400">✦</span>
				{/each}
			{/each}
		</div>
	</div>
</section>
