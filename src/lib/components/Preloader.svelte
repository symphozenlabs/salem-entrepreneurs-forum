<script lang="ts">
	import { onMount } from 'svelte';
	import { brand } from '#lib/content.ts';
	import { gsap, prefersReducedMotion, getLenis } from '#lib/motion.ts';

	let el = $state<HTMLDivElement>();
	let done = $state(false);

	onMount(() => {
		let seen = false;
		try {
			seen = sessionStorage.getItem('sef-intro') === '1';
			sessionStorage.setItem('sef-intro', '1');
		} catch {
			/* storage blocked — just play it */
		}
		if (seen || prefersReducedMotion()) {
			done = true;
			return;
		}

		getLenis()?.stop();
		const tl = gsap.timeline({
			onComplete: () => {
				done = true;
				getLenis()?.start();
			}
		});
		tl.from('[data-pl-logo]', { clipPath: 'inset(0 100% 0 0)', duration: 1.2, ease: 'expo.inOut' })
			.from('[data-pl-word]', { yPercent: 120, duration: 0.7, ease: 'expo.out', stagger: 0.12 }, '-=0.4')
			.to('[data-pl-bar]', { scaleX: 1, duration: 1, ease: 'power2.inOut' }, '<')
			.to(el!, { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut' }, '+=0.15');

		return () => tl.kill();
	});
</script>

{#if !done}
	<div
		bind:this={el}
		class="fixed inset-0 z-70 grid place-items-center bg-ink-950 text-ivory-100"
		style="clip-path: inset(0 0 0 0)"
		aria-hidden="true"
	>
		<div class="flex flex-col items-center">
			<img data-pl-logo src="/brand/logo-light.png" alt="" class="w-64 sm:w-96" />
			<div class="mt-10 flex gap-3 overflow-hidden">
				{#each brand.tagline as w (w)}
					<span data-pl-word class="eyebrow inline-block text-brass-300">{w}</span>
				{/each}
			</div>
			<div class="mt-8 h-px w-48 bg-ivory-100/10">
				<div data-pl-bar class="h-full origin-left scale-x-0 bg-brass-400"></div>
			</div>
		</div>
	</div>
{/if}
