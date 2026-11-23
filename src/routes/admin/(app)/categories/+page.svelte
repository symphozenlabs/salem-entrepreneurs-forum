<script lang="ts">
	import { enhance } from '$app/forms';
	import { Check } from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let busy = $state<string | null>(null);
	let confirmAll = $state(false);
	const act = (key: string) => () => {
		busy = key;
		return async ({ update }: { update: () => Promise<void> }) => {
			await update();
			busy = null;
			confirmAll = false;
		};
	};
	const who = (m: number, a: number) =>
		[m ? `${m} member${m === 1 ? '' : 's'}` : '', a ? `${a} application${a === 1 ? '' : 's'}` : '']
			.filter(Boolean)
			.join(' · ');
</script>

<p class="eyebrow text-brass-600">Categories</p>
<h1 class="display mt-2 text-4xl">Business categories</h1>
<p class="mt-2 max-w-2xl text-sm text-stone-muted">
	When someone types a category under “Other”, it waits here. Approve it to add it to the list
	everywhere, or move those people into a category that’s already listed.
</p>

{#if form?.done}<p
		class="mt-6 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
		role="status"
	>
		{form.done}
	</p>{/if}
{#if form?.error}<p class="field-error mt-6" role="alert">{form.error}</p>{/if}

<section class="mt-8 rounded-lg border border-ink-900/10 bg-white">
	<div
		class="flex flex-wrap items-center justify-between gap-3 border-b border-ink-900/10 px-5 py-4"
	>
		<h2 class="font-semibold">Waiting for approval · {data.pending.length}</h2>
		{#if data.pending.length > 1}
			{#if confirmAll}
				<form method="POST" action="?/approveAll" use:enhance={act('all')} class="flex gap-2">
					<button disabled={busy === 'all'} class="btn-primary !py-1.5"
						>Yes, approve all {data.pending.length}</button
					>
					<button type="button" onclick={() => (confirmAll = false)} class="btn-quiet !py-1.5"
						>Cancel</button
					>
				</form>
			{:else}
				<button type="button" onclick={() => (confirmAll = true)} class="btn-quiet !py-1.5"
					>Approve all</button
				>
			{/if}
		{/if}
	</div>
	{#if data.pending.length}
		<ul class="divide-y divide-ink-900/10">
			{#each data.pending as p (p.name)}
				<li class="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
					<div class="min-w-0 flex-1 basis-64">
						<p class="font-medium break-words">{p.name}</p>
						<p class="text-xs text-stone-muted">{who(p.members, p.applications)}</p>
					</div>
					<div class="flex flex-wrap items-center gap-2">
						<form method="POST" action="?/approve" use:enhance={act(p.name)}>
							<input type="hidden" name="name" value={p.name} />
							<button disabled={busy === p.name} class="btn-primary !px-3 !py-1.5">
								<Check class="size-4" /> Approve
							</button>
						</form>
						<form method="POST" action="?/move" use:enhance={act(p.name)} class="flex gap-2">
							<input type="hidden" name="name" value={p.name} />
							<select
								name="to"
								required
								aria-label="Move {p.name} to"
								class="max-w-56 rounded-md border-ink-900/15 py-1.5 pr-8 text-sm"
							>
								<option value="">Move to…</option>
								{#each data.list as c (c)}<option>{c}</option>{/each}
							</select>
							<button disabled={busy === p.name} class="btn-quiet !px-3 !py-1.5">Move</button>
						</form>
					</div>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="px-5 py-6 text-sm text-stone-muted">Nothing is waiting.</p>
	{/if}
</section>

<section class="mt-6 rounded-lg border border-ink-900/10 bg-white px-5 py-4">
	<h2 class="font-semibold">On the list · {data.list.length}</h2>
	{#if data.added.length}
		<p class="mt-1 text-sm text-stone-muted">Added by admins: {data.added.join(', ')}</p>
	{/if}
	<details class="mt-3 text-sm">
		<summary class="cursor-pointer font-semibold text-brass-600">See all categories</summary>
		<ul class="mt-3 columns-1 gap-6 sm:columns-2 lg:columns-3">
			{#each data.list as c (c)}<li class="py-0.5">{c}</li>{/each}
		</ul>
	</details>
</section>
