<script lang="ts">
	import { onMount } from 'svelte';
	import { forumList } from '#lib/forums.ts';
	import { switchHref } from '#lib/forum.svelte.ts';
	import { getLenis } from '#lib/motion.ts';

	// First-visit gate: the visitor picks a forum; the server remembers it and redirects.
	let root = $state<HTMLDivElement>();

	onMount(() => {
		getLenis()?.stop();
		document.documentElement.style.overflow = 'hidden';
		root?.querySelector<HTMLElement>('a')?.focus({ preventScroll: true });
		return () => {
			document.documentElement.style.overflow = '';
			getLenis()?.start();
		};
	});
</script>

<div
	bind:this={root}
	class="fixed inset-0 z-80 overflow-y-auto bg-ink-950 text-ivory-100"
	role="dialog"
	aria-modal="true"
	aria-labelledby="forum-picker-title"
>
	<div
		class="pointer-events-none absolute inset-0 bg-[radial-gradient(70vmax_50vmax_at_50%_120%,rgb(201_151_63/0.18),transparent_70%)]"
	></div>
	<div
		class="relative mx-auto flex min-h-full max-w-7xl flex-col justify-center px-6 py-16 sm:px-10"
	>
		<div class="fp-rise max-w-2xl">
			<p class="eyebrow text-brass-300">Meet. Learn. Collaborate. Grow.</p>
			<h1 id="forum-picker-title" class="display mt-5 text-[clamp(2.5rem,6vw,5rem)]">
				Choose your forum.
			</h1>
			<p class="mt-5 max-w-lg text-ivory-200/70">
				Three forums, one network. One membership opens the doors of all three; pick the one closest
				to your business. You can switch any time from the top-left corner.
			</p>
		</div>

		<div class="mt-12 grid gap-5 md:grid-cols-3">
			{#each forumList as f, i (f.id)}
				<a
					style="animation-delay:{250 + i * 120}ms"
					href={switchHref(f.id)}
					data-sveltekit-reload
					class="fp-rise group relative block aspect-[4/5] overflow-hidden rounded-[2px] ring-1 ring-ivory-100/10 transition hover:ring-brass-400/60 focus-visible:ring-2 focus-visible:ring-brass-300 focus-visible:outline-none md:aspect-[3/4]"
				>
					<img
						src={f.cover}
						alt=""
						class="absolute inset-0 h-full w-full object-cover transition-transform duration-1000 ease-out-expo group-hover:scale-105"
					/>
					<div
						class="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-transparent"
					></div>
					<div class="absolute inset-x-0 bottom-0 p-7">
						<p class="eyebrow text-brass-300">{f.brand.short}</p>
						<h2 class="display mt-3 text-3xl leading-tight">{f.brand.name}</h2>
						<p class="mt-2 text-sm text-ivory-200/70">{f.brand.region}</p>
						<span
							class="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brass-200 transition-transform group-hover:translate-x-1"
							>Enter <span aria-hidden="true">→</span></span
						>
					</div>
				</a>
			{/each}
		</div>
	</div>
</div>

<style>
	.fp-rise {
		animation: fp-rise 1s cubic-bezier(0.16, 1, 0.3, 1) both;
	}
	@keyframes fp-rise {
		from {
			opacity: 0;
			transform: translateY(32px);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.fp-rise {
			animation: none;
		}
	}
</style>
