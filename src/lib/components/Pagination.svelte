<script lang="ts">
	import { page } from '$app/state';
	import { ChevronLeft, ChevronRight } from '@lucide/svelte';
	import type { Pager } from '#lib/paging.ts';

	/** `summary`: also say "Showing 21–40 of 57". */
	let { pager, summary = true }: { pager: Pager; summary?: boolean } = $props();

	/** This page's address on another page number; filters and tabs are kept. */
	const to = (n: number) => {
		const params = new URLSearchParams(page.url.search);
		if (n === 1) params.delete('page');
		else params.set('page', String(n));
		const qs = params.toString();
		return qs ? `?${qs}` : page.url.pathname;
	};

	const first = $derived((pager.page - 1) * pager.perPage + 1);
	const last = $derived(Math.min(pager.page * pager.perPage, pager.total));
	/** 1 … 4 5 6 … 12 — 0 marks a gap. */
	const numbers = $derived.by(() => {
		const keep = new Set([1, pager.pages, pager.page - 1, pager.page, pager.page + 1]);
		const out: number[] = [];
		for (let n = 1; n <= pager.pages; n++)
			if (keep.has(n)) {
				if (out.length && n - out[out.length - 1] > 1) out.push(0);
				out.push(n);
			}
		return out;
	});
	const box =
		'inline-flex items-center gap-1 rounded-md border border-ink-900/15 bg-white px-3 py-2 text-sm hover:border-brass-500';
</script>

{#if pager.pages > 1}
	<div class="mt-6 flex flex-wrap items-center justify-between gap-3">
		{#if summary}
			<p class="text-sm text-stone-muted">Showing {first}–{last} of {pager.total}</p>
		{:else}
			<span></span>
		{/if}
		<nav class="flex flex-wrap items-center gap-1.5" aria-label="Pages">
			{#if pager.page > 1}
				<a href={to(pager.page - 1)} class={box}><ChevronLeft class="size-4" /> Previous</a>
			{/if}
			{#each numbers as n, i (i)}
				{#if n === 0}
					<span class="px-1 text-stone-muted">…</span>
				{:else}
					<a
						href={to(n)}
						aria-current={n === pager.page ? 'page' : undefined}
						class="min-w-9 rounded-md px-3 py-2 text-center text-sm {n === pager.page
							? 'bg-ink-900 font-semibold text-ivory-50'
							: 'border border-ink-900/15 bg-white hover:border-brass-500'}">{n}</a
					>
				{/if}
			{/each}
			{#if pager.page < pager.pages}
				<a href={to(pager.page + 1)} class={box}>Next <ChevronRight class="size-4" /></a>
			{/if}
		</nav>
	</div>
{/if}
