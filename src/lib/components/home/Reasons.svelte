<script lang="ts">
	import { onMount } from 'svelte';
	import { reasons } from '#lib/content.ts';
	import { ScrollTrigger, prefersReducedMotion, reveal } from '#lib/motion.ts';

	let list: HTMLOListElement;
	let active = $state(0);

	onMount(() => {
		if (prefersReducedMotion()) return;
		const triggers = Array.from(list.children).map((row, i) =>
			ScrollTrigger.create({
				trigger: row,
				start: 'top 55%',
				end: 'bottom 55%',
				onToggle: (self) => self.isActive && (active = i)
			})
		);
		return () => triggers.forEach((t) => t.kill());
	});
</script>

<section id="why" data-nav="light" class="bg-ivory-100 py-32 sm:py-44">
	<div class="mx-auto grid max-w-7xl gap-16 px-6 sm:px-10 lg:grid-cols-[5fr_7fr]">
		<div class="lg:sticky lg:top-32 lg:self-start">
			<p class="eyebrow text-brass-600">Why the forum</p>
			<h2 use:reveal class="display mt-6 text-[clamp(2.75rem,5vw,4.75rem)] text-ink-900">
				Eight reasons leaders choose SEF.
			</h2>
			<p class="mt-6 max-w-sm text-stone-muted">
				Networking, education, leads and partnerships — in one room, every month.
			</p>
			<div class="display mt-12 hidden text-[9rem] leading-none text-brass-400 tabular-nums lg:block">
				{String(active + 1).padStart(2, '0')}<span class="text-3xl text-ink-900/30">/08</span>
			</div>
		</div>

		<ol bind:this={list} class="border-t border-ink-900/10">
			{#each reasons as r, i (r.title)}
				<li
					class="grid grid-cols-[3rem_1fr] gap-x-4 border-b border-ink-900/10 py-10 transition-opacity duration-700 sm:grid-cols-[4rem_1fr] {active === i ? 'opacity-100' : 'lg:opacity-35'}"
				>
					<span class="eyebrow pt-3 text-brass-600">{String(i + 1).padStart(2, '0')}</span>
					<div>
						<h3 class="display text-4xl text-ink-900 sm:text-5xl">{r.title}</h3>
						<p class="mt-4 max-w-md text-stone-muted">{r.body}</p>
					</div>
				</li>
			{/each}
		</ol>
	</div>
</section>
