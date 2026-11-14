<script lang="ts">
	import { untrack } from 'svelte';
	import { hubs, type MemberOption } from '#lib/network.ts';

	type Props = {
		options: MemberOption[];
		name: string;
		selected?: string;
		label?: string;
	};
	let { options, name, selected = '', label = 'Member' }: Props = $props();

	// Narrow by hub and category, then choose from a plain list of names — no spelling needed.
	let memberId = $state(untrack(() => selected));
	/** '' = every hub / every category. */
	let hub = $state('');
	let category = $state('');

	const inHub = $derived(hub ? options.filter((o) => o.hub === hub) : options);
	const categories = $derived([...new Set(inHub.map((o) => o.industry))].sort());
	const list = $derived(category ? inHub.filter((o) => o.industry === category) : inHub);
	const chosen = $derived(options.find((o) => o.id === memberId));

	// A member hidden by a narrower filter is no longer the choice.
	$effect(() => {
		if (memberId && !list.some((o) => o.id === memberId)) memberId = '';
	});
</script>

<div>
	<span class="field-label">{label} *</span>
	<div class="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-label="Hub">
		{#each ['', ...hubs] as h (h)}
			<button
				type="button"
				onclick={() => {
					hub = h;
					if (category && !inHub.some((o) => o.industry === category)) category = '';
				}}
				aria-pressed={hub === h}
				class="rounded-full px-3 py-1 text-xs font-semibold transition-colors {hub === h
					? 'bg-ink-900 text-ivory-50'
					: 'bg-ivory-100 text-ink-700 hover:bg-ivory-200'}">{h || 'All hubs'}</button
			>
		{/each}
	</div>

	<div class="mt-3 grid gap-3 sm:grid-cols-[2fr_3fr]">
		<label class="block">
			<span class="text-xs font-semibold text-stone-muted">Category</span>
			<select bind:value={category} class="field-input !mt-1">
				<option value="">All categories ({inHub.length})</option>
				{#each categories as c (c)}
					<option value={c}>{c} ({inHub.filter((o) => o.industry === c).length})</option>
				{/each}
			</select>
		</label>
		<label class="block">
			<span class="text-xs font-semibold text-stone-muted">Member</span>
			<select {name} required bind:value={memberId} class="field-input !mt-1">
				<option value="" disabled>
					{list.length
						? `Choose from ${list.length} member${list.length === 1 ? '' : 's'}`
						: 'No members here'}
				</option>
				{#each list as o (o.id)}
					<option value={o.id}>{o.name} — {o.business}</option>
				{/each}
			</select>
		</label>
	</div>
	{#if chosen}
		<p class="mt-2 text-xs text-stone-muted">
			{chosen.name} · {chosen.business} · {chosen.industry} · {chosen.hub} hub
		</p>
	{/if}
</div>
