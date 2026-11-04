<script lang="ts">
	import type { PageProps } from './$types';
	import { photoUrl } from '#lib/network.ts';
	import ContactButtons from '#lib/components/member/ContactButtons.svelte';

	let { data }: PageProps = $props();

	const initials = (name: string) =>
		name
			.split(/\s+/)
			.map((w) => w[0])
			.slice(0, 2)
			.join('')
			.toUpperCase();
</script>

<p class="eyebrow text-brass-600">Directory</p>
<h1 class="display mt-2 text-4xl">Members</h1>

<form method="GET" class="mt-8 flex flex-wrap gap-3">
	<input
		type="search"
		name="q"
		value={data.q}
		placeholder="Search name, business, product, city…"
		class="field-input !mt-0 min-w-0 flex-1 sm:max-w-md"
	/>
	<select
		name="industry"
		class="field-input !mt-0 w-auto"
		onchange={(e) => e.currentTarget.form?.requestSubmit()}
	>
		<option value="">All industries</option>
		{#each data.industries as i (i)}
			<option selected={data.industry === i}>{i}</option>
		{/each}
	</select>
	<button class="btn-primary">Search</button>
</form>

<p class="mt-4 text-sm text-stone-muted">
	{data.members.length} member{data.members.length === 1 ? '' : 's'}{data.q || data.industry
		? ' found'
		: ''}
</p>

{#if data.members.length}
	<ul class="mt-4 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
		{#each data.members as m (m.id)}
			{@const photo = photoUrl(m)}
			<li class="flex flex-col rounded-lg border border-ink-900/10 bg-white p-5">
				<a href="/member/directory/{m.id}" class="flex gap-4">
					{#if photo}
						<img
							src={photo}
							alt=""
							class="size-14 shrink-0 rounded-full object-cover"
							loading="lazy"
						/>
					{:else}
						<span
							class="grid size-14 shrink-0 place-items-center rounded-full bg-ink-900 font-semibold text-brass-300"
							>{initials(m.name)}</span
						>
					{/if}
					<div class="min-w-0">
						<p class="font-semibold hover:text-brass-600">{m.name}</p>
						<p class="truncate text-sm text-ink-700">{m.business}</p>
						<p class="text-xs text-stone-muted">{m.industry}{m.city ? ` · ${m.city}` : ''}</p>
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
					<div class="flex gap-2">
						<a
							href="/member/connects?view=give&to={m.id}"
							class="btn-primary flex-1 !px-3 !py-2 !text-xs">Give connect</a
						>
						<a
							href="/member/transactions?view=record&with={m.id}"
							class="btn-quiet flex-1 !px-3 !py-2 !text-xs">Record business</a
						>
					</div>
				</div>
			</li>
		{/each}
	</ul>
{:else}
	<p
		class="mt-6 rounded-lg border border-dashed border-ink-900/20 bg-white px-6 py-12 text-center text-sm text-stone-muted"
	>
		No members match. <a href="/member/directory" class="font-semibold text-brass-600"
			>Clear search</a
		>
	</p>
{/if}
