<script lang="ts">
	import { ChevronDown, Check } from '@lucide/svelte';
	import { forumList } from '#lib/forums.ts';
	import { activeForum, switchHref } from '#lib/forum.svelte.ts';
	import ForumLogo from './ForumLogo.svelte';

	/** `light`: on a dark background. */
	let { tone = 'light' }: { tone?: 'light' | 'ink' } = $props();

	const forum = $derived(activeForum());
	let open = $state(false);
	let root = $state<HTMLDivElement>();

	function onWindowClick(e: MouseEvent) {
		if (open && root && !root.contains(e.target as Node)) open = false;
	}
</script>

<svelte:window onclick={onWindowClick} onkeydown={(e) => e.key === 'Escape' && (open = false)} />

<div bind:this={root} class="relative z-10 flex items-center gap-1">
	<a href="/" class="block" aria-label="{forum.brand.name} — home">
		<ForumLogo {forum} {tone} alt="" class="h-9 w-28 object-contain object-left" text="text-base" />
	</a>
	<button
		type="button"
		onclick={() => (open = !open)}
		class="grid size-8 place-items-center rounded-full transition-colors hover:bg-current/10"
		aria-haspopup="listbox"
		aria-expanded={open}
		aria-label="Switch forum (currently {forum.brand.name})"
	>
		<ChevronDown class="size-4 transition-transform duration-300 {open ? 'rotate-180' : ''}" />
	</button>

	{#if open}
		<div
			class="absolute top-full left-0 mt-3 w-[min(20rem,calc(100vw-3rem))] overflow-hidden rounded-lg bg-ink-950/95 p-2 text-ivory-100 shadow-2xl ring-1 ring-ivory-100/10 backdrop-blur-xl"
			role="listbox"
			aria-label="Forums"
		>
			<p class="eyebrow px-3 pt-2 pb-3 text-brass-300">Choose your forum</p>
			{#each forumList as f (f.id)}
				<a
					href={switchHref(f.id)}
					data-sveltekit-reload
					role="option"
					aria-selected={f.id === forum.id}
					class="flex items-center gap-3 rounded-md px-3 py-3 transition-colors hover:bg-ivory-100/5"
				>
					<img
						src={f.cover}
						alt=""
						class="h-10 w-16 shrink-0 rounded-sm object-cover"
						loading="lazy"
					/>
					<span class="min-w-0 flex-1">
						<span class="block text-sm font-semibold">{f.brand.name}</span>
						<span class="block truncate text-xs text-ivory-200/60">{f.brand.region}</span>
					</span>
					{#if f.id === forum.id}<Check class="size-4 text-brass-300" />{/if}
				</a>
			{/each}
		</div>
	{/if}
</div>
