<script lang="ts">
	import type { MemberOption } from '#lib/network.ts';

	type Props = {
		options: MemberOption[];
		name: string;
		selected?: string;
		label?: string;
		onchange?: (id: string) => void;
	};
	let { options, name, selected = '', label = 'Member', onchange }: Props = $props();

	// The chosen member is the picker's own state once it's mounted.
	let chosen = $state<MemberOption | undefined>(undefined);
	let query = $state('');
	let open = $state(false);
	let active = $state(0);

	$effect.pre(() => {
		if (chosen === undefined && selected) chosen = options.find((o) => o.id === selected);
	});

	const matches = $derived.by(() => {
		const q = query.trim().toLowerCase();
		const list = q
			? options.filter((o) => `${o.name} ${o.business} ${o.industry}`.toLowerCase().includes(q))
			: options;
		return list.slice(0, 8);
	});

	function pick(o: MemberOption) {
		chosen = o;
		query = '';
		open = false;
		onchange?.(o.id);
	}

	function keydown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			open = true;
			active = Math.min(active + 1, matches.length - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			active = Math.max(active - 1, 0);
		} else if (e.key === 'Enter' && open && matches[active]) {
			e.preventDefault();
			pick(matches[active]);
		} else if (e.key === 'Escape') {
			open = false;
		}
	}
</script>

<div class="relative">
	<span class="field-label">{label} *</span>
	<input type="hidden" {name} value={chosen?.id ?? ''} />
	{#if chosen}
		<div
			class="mt-1.5 flex items-center justify-between gap-3 rounded-md border border-brass-400 bg-white px-3 py-2.5 text-sm"
		>
			<span class="min-w-0 truncate">
				<strong>{chosen.name}</strong>
				<span class="text-stone-muted"> · {chosen.business} · {chosen.industry}</span>
			</span>
			<button
				type="button"
				onclick={() => {
					chosen = undefined;
					onchange?.('');
				}}
				class="shrink-0 text-xs font-semibold text-brass-600">Change</button
			>
		</div>
	{:else}
		<input
			type="search"
			role="combobox"
			aria-expanded={open}
			aria-controls="{name}-list"
			aria-autocomplete="list"
			autocomplete="off"
			placeholder="Search by name, business or industry"
			bind:value={query}
			onfocus={() => (open = true)}
			oninput={() => {
				open = true;
				active = 0;
			}}
			onblur={() => setTimeout(() => (open = false), 150)}
			onkeydown={keydown}
			class="field-input"
		/>
		{#if open}
			<ul
				id="{name}-list"
				role="listbox"
				class="absolute inset-x-0 z-20 mt-1 max-h-72 overflow-auto rounded-md border border-ink-900/10 bg-white py-1 shadow-lg"
			>
				{#each matches as o, i (o.id)}
					<li role="option" aria-selected={i === active}>
						<button
							type="button"
							onmousedown={(e) => e.preventDefault()}
							onclick={() => pick(o)}
							class="block w-full px-3 py-2 text-left text-sm {i === active
								? 'bg-ivory-100'
								: 'hover:bg-ivory-50'}"
						>
							<span class="font-medium">{o.name}</span>
							<span class="block text-xs text-stone-muted">{o.business} · {o.industry}</span>
						</button>
					</li>
				{:else}
					<li class="px-3 py-3 text-sm text-stone-muted">No member matches “{query}”.</li>
				{/each}
			</ul>
		{/if}
	{/if}
</div>
