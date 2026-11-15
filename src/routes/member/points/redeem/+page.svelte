<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';
	import { ArrowLeft, Check, Lock } from '@lucide/svelte';
	import { pts, rewards } from '#lib/loyalty.ts';

	let { data, form }: PageProps = $props();

	const s = $derived(data.summary);
	/** The reward whose confirmation is open. */
	let choosing = $state<string | null>(null);
	let busy = $state(false);
</script>

<a
	href="/member/points"
	class="inline-flex items-center gap-1 text-sm text-stone-muted hover:text-ink-900"
	><ArrowLeft class="size-4" /> My points</a
>
<p class="eyebrow mt-6 text-brass-600">Redeem</p>
<h1 class="display mt-2 text-4xl">Redeemable rewards</h1>
<p class="mt-2 max-w-2xl text-sm text-stone-muted">
	You have <strong class="text-ink-900">{pts(s.available)} points</strong>
	available{#if s.held}<span>
			({pts(s.held)} more are on hold for requests awaiting approval)</span
		>{/if}. A request goes to the secretariat, and the points come off only once they approve it.
</p>

{#if form?.done}
	<p class="mt-6 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">
		Request sent for <strong>{form.done}</strong>. The points are on hold until the secretariat
		approves it — track it on
		<a href="/member/points" class="font-semibold underline">My points</a>.
	</p>
{/if}
{#if form?.error}<p class="field-error mt-6" role="alert">{form.error}</p>{/if}

<ul class="mt-8 grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
	{#each rewards as r (r.key)}
		{@const affordable = s.available >= r.cost}
		<li
			class="flex flex-col rounded-lg border bg-white p-5 {affordable
				? 'border-brass-400'
				: 'border-ink-900/10'}"
		>
			<div class="flex items-start justify-between gap-3">
				<p class="font-semibold">{r.label}</p>
				{#if !affordable}<Lock class="size-4 shrink-0 text-stone-muted" />{/if}
			</div>
			<p class="mt-1 text-sm text-stone-muted">{r.hint}</p>
			<p class="display mt-4 text-3xl {affordable ? 'text-brass-600' : 'text-ink-900/40'}">
				{pts(r.cost)} <span class="text-base">points</span>
			</p>

			<div class="mt-auto pt-5">
				{#if !affordable}
					<button disabled class="btn-quiet w-full cursor-not-allowed opacity-60">
						Need {pts(r.cost - s.available)} more
					</button>
				{:else if choosing === r.key}
					<form
						method="POST"
						use:enhance={() => {
							busy = true;
							return async ({ update }) => {
								await update();
								busy = false;
								choosing = null;
							};
						}}
						class="space-y-3"
					>
						<input type="hidden" name="reward" value={r.key} />
						<label class="block">
							<span class="text-xs font-semibold text-stone-muted"
								>Note for the secretariat (optional)</span
							>
							<input
								name="note"
								maxlength="500"
								placeholder="e.g. which event or dates"
								class="field-input !mt-1"
							/>
						</label>
						<div class="flex gap-2">
							<button disabled={busy} class="btn-primary flex-1">
								<Check class="size-4" />
								{busy ? 'Sending…' : `Confirm — ${pts(r.cost)} pts`}
							</button>
							<button type="button" onclick={() => (choosing = null)} class="btn-quiet"
								>Cancel</button
							>
						</div>
					</form>
				{:else}
					<button onclick={() => (choosing = r.key)} class="btn-primary w-full">Redeem</button>
				{/if}
			</div>
		</li>
	{/each}
</ul>
