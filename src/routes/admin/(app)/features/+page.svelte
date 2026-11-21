<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let busy = $state<string | null>(null);

	const items = $derived([
		{
			key: 'connects',
			label: 'Connects',
			about: 'Members can pass leads to each other.',
			on: data.features.connects
		},
		{
			key: 'transactions',
			label: 'Transactions',
			about: 'Members can record and confirm business done with each other.',
			on: data.features.transactions
		}
	]);
</script>

<p class="eyebrow text-brass-600">Member features</p>
<h1 class="display mt-2 text-4xl">Connects & Transactions</h1>
<p class="mt-2 max-w-2xl text-sm text-stone-muted">
	Switch each one on or off for all members. While off, it’s hidden from the member area. Existing
	records are kept and come back when it’s switched on.
</p>
{#if form?.error}<p class="field-error mt-6" role="alert">{form.error}</p>{/if}

<ul class="mt-8 max-w-2xl divide-y divide-ink-900/10 rounded-lg border border-ink-900/10 bg-white">
	{#each items as f (f.key)}
		<li class="flex flex-wrap items-center justify-between gap-4 px-5 py-5">
			<div class="min-w-0 flex-1">
				<p class="flex items-center gap-2 font-semibold">
					{f.label}
					<span
						class="rounded-full px-2 py-0.5 text-xs font-semibold {f.on
							? 'bg-emerald-100 text-emerald-800'
							: 'bg-ink-900/5 text-stone-muted'}">{f.on ? 'On' : 'Off'}</span
					>
				</p>
				<p class="mt-1 text-sm text-stone-muted">{f.about}</p>
			</div>
			<form
				method="POST"
				use:enhance={() => {
					busy = f.key;
					return async ({ update }) => {
						await update();
						busy = null;
					};
				}}
			>
				<input type="hidden" name="feature" value={f.key} />
				<input type="hidden" name="on" value={String(!f.on)} />
				<button disabled={busy === f.key} class={f.on ? 'btn-quiet' : 'btn-primary'}>
					{busy === f.key ? 'Saving…' : f.on ? `Disable ${f.label}` : `Enable ${f.label}`}
				</button>
			</form>
		</li>
	{/each}
</ul>
