<script lang="ts">
	import { page } from '$app/state';
	import { LayoutGrid, List } from '@lucide/svelte';
	import Pagination from '#lib/components/Pagination.svelte';
	import type { PageProps } from './$types';
	import { hubs, photoUrl } from '#lib/network.ts';
	import ContactButtons from '#lib/components/member/ContactButtons.svelte';

	let { data }: PageProps = $props();

	const initials = (name: string) =>
		name
			.split(/\s+/)
			.map((w) => w[0])
			.slice(0, 2)
			.join('')
			.toUpperCase();

	/** This page's address with some parameters changed (filters are kept). */
	const link = (changes: Record<string, string | number | null>) => {
		const params = new URLSearchParams(page.url.search);
		for (const [k, v] of Object.entries(changes))
			if (v === null || v === '' || (k === 'page' && v === 1)) params.delete(k);
			else params.set(k, String(v));
		const qs = params.toString();
		return qs ? `?${qs}` : page.url.pathname;
	};

	const first = $derived((data.page - 1) * data.perPage + 1);
	const last = $derived(Math.min(data.page * data.perPage, data.total));
</script>

<p class="eyebrow text-brass-600">Directory</p>
<h1 class="display mt-2 text-4xl">Members</h1>

<div class="mt-8 grid gap-4 sm:grid-cols-3">
	<div class="rounded-lg border border-ink-900/10 bg-white p-5">
		<p class="display text-3xl">{data.stats.total}</p>
		<p class="mt-2 text-sm text-stone-muted">Total members</p>
	</div>
	<div class="rounded-lg border border-ink-900/10 bg-white p-5">
		<p class="display text-3xl">{data.stats.hubs.length}</p>
		<p class="mt-2 text-sm text-stone-muted">
			Hubs{#if data.stats.hubs.length}:
				{#each data.stats.hubs as h, i (h.name)}{i ? ' · ' : ''}<a
						href="?hub={encodeURIComponent(h.name)}"
						class="hover:text-brass-600">{h.name} ({h.count})</a
					>{/each}{/if}
		</p>
	</div>
	<div class="rounded-lg border border-ink-900/10 bg-white p-5">
		<p class="display text-3xl">{data.stats.industries.length}</p>
		<p class="mt-2 text-sm text-stone-muted">Business categories</p>
	</div>
</div>

<form method="GET" class="mt-8 flex flex-wrap gap-3">
	{#if data.view === 'list'}<input type="hidden" name="view" value="list" />{/if}
	<input
		type="search"
		name="q"
		value={data.q}
		placeholder="Search name, business, product, city…"
		class="field-input !mt-0 min-w-0 flex-1 sm:max-w-md"
	/>
	<select
		name="hub"
		aria-label="Hub"
		class="field-input !mt-0 w-auto"
		onchange={(e) => e.currentTarget.form?.requestSubmit()}
	>
		<option value="">All hubs</option>
		{#each hubs as h (h)}<option selected={data.hub === h}>{h}</option>{/each}
	</select>
	<select
		name="industry"
		aria-label="Category"
		class="field-input !mt-0 w-auto"
		onchange={(e) => e.currentTarget.form?.requestSubmit()}
	>
		<option value="">All categories</option>
		{#each data.industries as i (i)}
			<option selected={data.industry === i}>{i}</option>
		{/each}
	</select>
	<button class="btn-primary">Search</button>
</form>

{#if !data.searched}
	<p class="mt-5 text-sm text-stone-muted">
		Search by name, business, product or city, or pick a hub or category.
		<a href="?all" class="font-semibold text-brass-600 hover:underline">Browse all members</a>
	</p>
{:else}
	<div class="mt-5 flex flex-wrap items-center justify-between gap-3">
		<p class="text-sm text-stone-muted">
			{#if data.total}
				Showing {first}–{last} of {data.total} member{data.total === 1 ? '' : 's'}
			{:else}
				0 members
			{/if}
		</p>
		<div
			class="flex rounded-md border border-ink-900/15 bg-white p-0.5"
			role="group"
			aria-label="View"
		>
			{#each [{ key: 'grid', label: 'Grid', Icon: LayoutGrid }, { key: 'list', label: 'List', Icon: List }] as v (v.key)}
				<a
					href={link({ view: v.key === 'grid' ? null : v.key, page: null })}
					aria-current={data.view === v.key ? 'page' : undefined}
					data-sveltekit-noscroll
					class="inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold {data.view ===
					v.key
						? 'bg-ink-900 text-ivory-50'
						: 'text-ink-700 hover:bg-ivory-100'}"><v.Icon class="size-3.5" /> {v.label}</a
				>
			{/each}
		</div>
	</div>

	{#snippet avatar(m: (typeof data.members)[number], size: string)}
		{@const photo = photoUrl(m)}
		{#if photo}
			<img src={photo} alt="" class="{size} shrink-0 rounded-full object-cover" loading="lazy" />
		{:else}
			<span
				class="{size} grid shrink-0 place-items-center rounded-full bg-ink-900 text-sm font-semibold text-brass-300"
				>{initials(m.name)}</span
			>
		{/if}
	{/snippet}

	{#if !data.members.length}
		<p
			class="mt-6 rounded-lg border border-dashed border-ink-900/20 bg-white px-6 py-12 text-center text-sm text-stone-muted"
		>
			No members match. <a href="/member/directory" class="font-semibold text-brass-600"
				>Clear search</a
			>
		</p>
	{:else if data.view === 'grid'}
		<ul class="mt-4 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
			{#each data.members as m (m.id)}
				<li class="flex flex-col rounded-lg border border-ink-900/10 bg-white p-5">
					<a href="/member/directory/{m.id}" class="flex gap-4">
						{@render avatar(m, 'size-14')}
						<div class="min-w-0">
							<p class="font-semibold hover:text-brass-600">{m.name}</p>
							<p class="truncate text-sm text-ink-700">{m.business}</p>
							<p class="text-xs text-stone-muted">
								{m.hub} hub{m.industry ? ` · ${m.industry}` : ''}{m.city ? ` · ${m.city}` : ''}
							</p>
						</div>
					</a>
					{#if m.offerings}<p class="mt-4 line-clamp-2 text-sm text-ink-800">
							<strong>Offers:</strong>
							{m.offerings}
						</p>{/if}
					{#if m.lookingFor}<p class="mt-2 line-clamp-2 text-sm text-ink-800">
							<strong>Looking for:</strong>
							{m.lookingFor}
						</p>{/if}
					<div class="mt-auto space-y-3 pt-5">
						<ContactButtons phone={m.phone} email={m.email} />
						{#if data.features.connects || data.features.transactions}
							<div class="flex gap-2">
								{#if data.features.connects}
									<a
										href="/member/connects?view=give&to={m.id}"
										class="btn-primary flex-1 !px-3 !py-2 !text-xs">Give connect</a
									>
								{/if}
								{#if data.features.transactions}
									<a
										href="/member/transactions?view=record&with={m.id}"
										class="btn-quiet flex-1 !px-3 !py-2 !text-xs">Record business</a
									>
								{/if}
							</div>
						{/if}
					</div>
				</li>
			{/each}
		</ul>
	{:else}
		<div class="mt-4 overflow-x-auto rounded-lg border border-ink-900/10 bg-white">
			<table class="w-full min-w-[52rem] text-left text-sm">
				<thead class="border-b border-ink-900/10 text-xs tracking-wide text-stone-muted uppercase">
					<tr>
						<th class="px-4 py-3 font-semibold">Member</th>
						<th class="px-4 py-3 font-semibold">Business</th>
						<th class="px-4 py-3 font-semibold">Category</th>
						<th class="px-4 py-3 font-semibold">Hub</th>
						<th class="px-4 py-3 font-semibold">Phone</th>
						<th class="px-4 py-3 font-semibold"></th>
					</tr>
				</thead>
				<tbody class="divide-y divide-ink-900/10">
					{#each data.members as m (m.id)}
						<tr class="align-middle">
							<td class="px-4 py-3">
								<a
									href="/member/directory/{m.id}"
									class="flex items-center gap-3 hover:text-brass-600"
								>
									{@render avatar(m, 'size-9')}
									<span class="font-medium">{m.name}</span>
								</a>
							</td>
							<td class="px-4 py-3">
								{m.business}{#if m.city}<span class="block text-xs text-stone-muted">{m.city}</span
									>{/if}
							</td>
							<td class="px-4 py-3">{m.industry}</td>
							<td class="px-4 py-3">{m.hub}</td>
							<td class="px-4 py-3 whitespace-nowrap">
								<a href="tel:{m.phone}" class="hover:text-brass-600">{m.phone}</a>
							</td>
							<td class="px-4 py-3">
								<div class="flex justify-end gap-2">
									{#if data.features.connects}
										<a
											href="/member/connects?view=give&to={m.id}"
											class="btn-primary !px-3 !py-1.5 !text-xs whitespace-nowrap">Give connect</a
										>
									{/if}
									<a href="/member/directory/{m.id}" class="btn-quiet !px-3 !py-1.5 !text-xs"
										>Profile</a
									>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	<Pagination
		pager={{ page: data.page, pages: data.pages, total: data.total, perPage: data.perPage }}
		summary={false}
	/>
{/if}
