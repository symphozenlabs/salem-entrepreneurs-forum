<script lang="ts">
	import { untrack } from 'svelte';
	import { Search, X } from '@lucide/svelte';

	type Match = { ref: string; name: string; business: string; hub: string };
	type Props = {
		/** As sent last time, so a form shown again with errors keeps the choice. */
		values?: Record<string, string>;
		error?: string;
	};
	let { values = {}, error }: Props = $props();

	// Two ways to name the referring member: type their member ID, or search by name and
	// pick them. Either way the form sends `referrerNumber`; the server checks it.
	let mode = $state<'id' | 'name'>(untrack(() => (values.referrerMode === 'name' ? 'name' : 'id')));
	let idText = $state(
		untrack(() => (values.referrerMode === 'name' ? '' : (values.referrerNumber ?? '')))
	);
	/** The member picked from the search, shown as a chip. */
	let picked = $state<Match | null>(
		untrack(() =>
			values.referrerMode === 'name' && values.referrerNumber
				? { ref: values.referrerNumber, name: values.referrerLabel ?? '', business: '', hub: '' }
				: null
		)
	);
	let query = $state('');
	let matches = $state<Match[]>([]);
	let open = $state(false);
	let searching = $state(false);
	let active = $state(-1);
	let timer: ReturnType<typeof setTimeout> | undefined;
	let latest = 0;
	let searchInput = $state<HTMLInputElement>();

	const label = (m: Match) => [m.name, m.business, m.hub].filter(Boolean).join(' · ');

	function search() {
		clearTimeout(timer);
		const q = query.trim();
		if (q.replace(/\s/g, '').length < 2) {
			matches = [];
			open = false;
			searching = false;
			return;
		}
		searching = true;
		timer = setTimeout(async () => {
			const ask = ++latest;
			try {
				const res = await fetch(`/join/referrers?q=${encodeURIComponent(q)}`);
				const found: Match[] = res.ok ? await res.json() : [];
				if (ask !== latest) return;
				matches = found;
				active = found.length ? 0 : -1;
				open = true;
			} catch {
				if (ask === latest) matches = [];
			} finally {
				if (ask === latest) searching = false;
			}
		}, 220);
	}

	function pick(m: Match) {
		picked = m;
		query = '';
		matches = [];
		open = false;
	}

	function clearPick() {
		picked = null;
		queueMicrotask(() => searchInput?.focus());
	}

	function onkeydown(e: KeyboardEvent) {
		if (!open || !matches.length) return;
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			active = (active + 1) % matches.length;
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			active = (active - 1 + matches.length) % matches.length;
		} else if (e.key === 'Enter' && active >= 0) {
			e.preventDefault();
			pick(matches[active]);
		} else if (e.key === 'Escape') {
			open = false;
		}
	}

	// Typed a name but didn't choose anyone: stop the form so the referrer isn't lost.
	$effect(() => {
		searchInput?.setCustomValidity(
			mode === 'name' && !picked && query.trim()
				? 'Choose the member from the list, or clear this box.'
				: ''
		);
	});

	const tab = (on: boolean) =>
		`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
			on ? 'bg-ink-900 text-ivory-50' : 'bg-ivory-100 text-ink-700 hover:bg-ivory-200'
		}`;
</script>

<div class="sm:col-span-2">
	<span class="field-label" id="referrer-label">Referred by a member?</span>
	<div class="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-labelledby="referrer-label">
		<button
			type="button"
			class={tab(mode === 'id')}
			aria-pressed={mode === 'id'}
			onclick={() => (mode = 'id')}>Enter member ID</button
		>
		<button
			type="button"
			class={tab(mode === 'name')}
			aria-pressed={mode === 'name'}
			onclick={() => {
				mode = 'name';
				queueMicrotask(() => searchInput?.focus());
			}}>Search by name</button
		>
	</div>
	<input type="hidden" name="referrerMode" value={mode} />

	{#if mode === 'id'}
		<input
			name="referrerNumber"
			autocomplete="off"
			aria-labelledby="referrer-label"
			placeholder="e.g. SEF-2026-0001"
			bind:value={idText}
			class="field-input sm:max-w-md"
		/>
		{#if !error}
			<p class="mt-1.5 text-xs text-stone-muted">
				Optional — the member ID of the member who referred you.
			</p>
		{/if}
	{:else}
		<input type="hidden" name="referrerNumber" value={picked?.ref ?? ''} />
		<input type="hidden" name="referrerLabel" value={picked ? label(picked) : ''} />
		{#if picked}
			<div
				class="mt-2 flex items-center justify-between gap-3 rounded-md border border-brass-500 bg-brass-200/30 px-4 py-3 text-sm sm:max-w-md"
			>
				<span class="min-w-0">
					<span class="font-semibold">{picked.name}</span>
					{#if picked.business || picked.hub}
						<span class="block truncate text-xs text-stone-muted"
							>{[picked.business, picked.hub].filter(Boolean).join(' · ')}</span
						>
					{/if}
				</span>
				<button
					type="button"
					onclick={clearPick}
					class="flex shrink-0 items-center gap-1 text-xs font-semibold text-ink-700 hover:text-ink-900"
					aria-label="Change referrer"><X class="size-3.5" /> Change</button
				>
			</div>
		{:else}
			<div class="relative sm:max-w-md">
				<Search
					class="pointer-events-none absolute top-1/2 left-3 mt-0.5 size-4 -translate-y-1/2 text-stone-muted"
				/>
				<input
					bind:this={searchInput}
					bind:value={query}
					oninput={search}
					onfocus={() => matches.length && (open = true)}
					onblur={() => setTimeout(() => (open = false), 150)}
					{onkeydown}
					autocomplete="off"
					role="combobox"
					aria-labelledby="referrer-label"
					aria-expanded={open}
					aria-controls="referrer-list"
					aria-autocomplete="list"
					aria-activedescendant={open && active >= 0 ? `referrer-${active}` : undefined}
					placeholder="Type the member’s name"
					class="field-input !pl-9"
				/>
				{#if open}
					<ul
						id="referrer-list"
						role="listbox"
						class="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-ink-900/15 bg-white shadow-lg"
					>
						{#each matches as m, i (m.ref)}
							<li id="referrer-{i}" role="option" aria-selected={i === active}>
								<button
									type="button"
									onmousedown={(e) => e.preventDefault()}
									onclick={() => pick(m)}
									onmouseenter={() => (active = i)}
									class="block w-full px-4 py-2.5 text-left text-sm {i === active
										? 'bg-ivory-100'
										: ''}"
								>
									<span class="font-medium">{m.name}</span>
									<span class="block truncate text-xs text-stone-muted">{m.business} · {m.hub}</span
									>
								</button>
							</li>
						{:else}
							<li class="px-4 py-3 text-sm text-stone-muted">
								No member found. Check the spelling, or ask them for their member ID.
							</li>
						{/each}
					</ul>
				{/if}
			</div>
			{#if !error}
				<p class="mt-1.5 text-xs text-stone-muted">
					{searching ? 'Searching…' : 'Type at least 2 letters of their name, then choose them.'}
				</p>
			{/if}
		{/if}
	{/if}
	{#if error}<p class="field-error">{error}</p>{/if}
</div>
