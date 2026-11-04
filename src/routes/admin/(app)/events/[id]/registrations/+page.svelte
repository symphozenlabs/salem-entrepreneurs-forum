<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';
	import { Download } from '@lucide/svelte';
	import { rupees } from '#lib/content.ts';
	import { eventShortDate, eventTime } from '#lib/events.ts';
	import type { Answer } from '#lib/forms.ts';

	let { data, form }: PageProps = $props();
	let rejecting = $state<number | null>(null);
	let cancelling = $state<number | null>(null);
	let busy = $state<number | null>(null);

	const ev = $derived(data.event);
	const tabs = $derived([
		{ key: 'pending', label: 'To verify', count: data.counts.pending },
		{ key: 'confirmed', label: 'Confirmed', count: data.counts.confirmed },
		{ key: 'rejected', label: 'Rejected / cancelled', count: data.counts.rejected },
		{ key: 'all', label: 'All' }
	]);
	const badge: Record<string, string> = {
		pending: 'bg-brass-200 text-brass-600',
		confirmed: 'bg-emerald-100 text-emerald-800',
		rejected: 'bg-laterite-500/10 text-laterite-500'
	};
	const statusText: Record<string, string> = {
		pending: 'Payment to verify',
		confirmed: 'Confirmed',
		rejected: 'Rejected'
	};
	const when = (d: Date) => `${eventShortDate(d)}, ${eventTime(d)}`;
	// Disables the buttons while a decision saves, so it can't be sent twice.
	const act = (id: number) => () => {
		busy = id;
		return async ({ update }: { update: () => Promise<void> }) => {
			await update();
			busy = null;
			rejecting = null;
			cancelling = null;
		};
	};
</script>

<a href="/admin/events/{ev.id}" class="text-sm text-stone-muted hover:text-ink-900">← {ev.title}</a>
<div class="mt-3 flex flex-wrap items-end justify-between gap-4">
	<div>
		<p class="eyebrow text-brass-600">Registrations</p>
		<h1 class="display mt-2 text-4xl">{ev.title}</h1>
		<p class="mt-2 text-sm text-stone-muted">{when(ev.startsAt)} · {ev.venue}</p>
	</div>
	<a href="/admin/events/{ev.id}/registrations/csv" class="btn-quiet" download>
		<Download class="size-4" /> Download spreadsheet
	</a>
</div>

<div class="mt-8 grid gap-4 sm:grid-cols-3">
	<div class="rounded-lg border border-ink-900/10 bg-white p-5">
		<p class="display text-3xl">{data.counts.confirmed}{ev.seats ? ` / ${ev.seats}` : ''}</p>
		<p class="mt-1 text-sm text-stone-muted">Confirmed seats</p>
	</div>
	<div class="rounded-lg border border-ink-900/10 bg-white p-5">
		<p class="display text-3xl">{data.counts.pending}</p>
		<p class="mt-1 text-sm text-stone-muted">Payments to verify</p>
	</div>
	<div class="rounded-lg border border-ink-900/10 bg-white p-5">
		<p class="display text-3xl">{rupees(data.collected)}</p>
		<p class="mt-1 text-sm text-stone-muted">Collected (confirmed)</p>
	</div>
</div>

{#if form?.done}<p
		class="mt-6 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
		role="status"
	>
		{form.done}
	</p>{/if}
{#if form?.error}<p class="field-error mt-6" role="alert">{form.error}</p>{/if}

<nav class="mt-8 flex flex-wrap gap-2" aria-label="Filter">
	{#each tabs as t (t.key)}
		<a
			href="?show={t.key}"
			aria-current={data.show === t.key ? 'page' : undefined}
			class="rounded-full px-4 py-1.5 text-sm {data.show === t.key
				? 'bg-ink-900 text-ivory-50'
				: 'bg-white text-ink-700 hover:text-ink-900'}">{t.label}{t.count ? ` (${t.count})` : ''}</a
		>
	{/each}
</nav>

{#if data.registrations.length}
	<ul class="mt-6 space-y-4">
		{#each data.registrations as r (r.id)}
			{@const answers = (r.answers as Answer[]).filter((a) => a.value)}
			<li class="rounded-lg border border-ink-900/10 bg-white p-5">
				<div class="flex flex-wrap items-start justify-between gap-4">
					<div>
						<p class="flex flex-wrap items-center gap-2 font-semibold">
							{r.name}
							{#if r.isMember}<span
									class="rounded-full bg-ink-900 px-2 py-0.5 text-[0.7rem] text-brass-200"
									>Member</span
								>{/if}
							<span class="rounded-full px-2 py-0.5 text-[0.7rem] {badge[r.status]}"
								>{statusText[r.status] ?? r.status}</span
							>
						</p>
						<p class="mt-1 text-sm">
							<a href="mailto:{r.email}" class="hover:text-brass-600">{r.email}</a> ·
							<a href="tel:{r.phone}" class="hover:text-brass-600">{r.phone}</a>
						</p>
						<p class="mt-1 text-xs text-stone-muted">
							Ref <span class="font-mono">{r.code}</span> · registered {when(r.createdAt)}
						</p>
					</div>
					<div class="text-right">
						<p class="display text-2xl">{r.amount ? rupees(r.amount) : 'Free'}</p>
						{#if r.utr}<p class="font-mono text-sm">UTR {r.utr}</p>{/if}
						{#if r.hasProof && r.paymentId}<a
								href="/admin/proof/{r.paymentId}"
								target="_blank"
								class="text-xs font-semibold text-brass-600">View screenshot ↗</a
							>{/if}
					</div>
				</div>

				{#if answers.length}
					<dl
						class="mt-4 grid gap-x-8 gap-y-2 border-t border-ink-900/10 pt-4 text-sm sm:grid-cols-2"
					>
						{#each answers as a, i (i)}
							<div>
								<dt class="text-stone-muted">{a.label}</dt>
								<dd class="whitespace-pre-line">{a.value}</dd>
							</div>
						{/each}
					</dl>
				{/if}
				{#if r.note}<p class="mt-3 text-sm text-stone-muted">“{r.note}”</p>{/if}

				{#if r.status === 'pending'}
					<div class="mt-4 border-t border-ink-900/10 pt-4">
						{#if rejecting === r.id}
							<form
								method="POST"
								action="?/reject"
								use:enhance={act(r.id)}
								class="flex flex-wrap gap-2"
							>
								<input type="hidden" name="id" value={r.id} />
								<input
									name="note"
									maxlength="500"
									placeholder="Reason, e.g. no payment found for this UTR"
									class="field-input !mt-0 min-w-0 flex-1"
								/>
								<button disabled={busy === r.id} class="btn-danger">Reject</button>
								<button type="button" onclick={() => (rejecting = null)} class="btn-quiet"
									>Cancel</button
								>
							</form>
						{:else}
							<div class="flex flex-wrap gap-2">
								<form method="POST" action="?/confirm" use:enhance={act(r.id)}>
									<input type="hidden" name="id" value={r.id} />
									<button disabled={busy === r.id} class="btn-primary"
										>{busy === r.id ? 'Confirming…' : 'Payment received — confirm seat'}</button
									>
								</form>
								<button onclick={() => (rejecting = r.id)} class="btn-quiet">Reject</button>
							</div>
						{/if}
					</div>
				{:else if r.status === 'confirmed'}
					<div class="mt-4 flex justify-end">
						{#if cancelling === r.id}
							<form
								method="POST"
								action="?/cancel"
								use:enhance={act(r.id)}
								class="flex flex-wrap items-center gap-2"
							>
								<input type="hidden" name="id" value={r.id} />
								<span class="text-sm text-stone-muted"
									>Free this seat? Any refund is handled outside the site.</span
								>
								<button disabled={busy === r.id} class="btn-danger !px-3 !py-1.5"
									>Cancel seat</button
								>
								<button
									type="button"
									onclick={() => (cancelling = null)}
									class="btn-quiet !px-3 !py-1.5">Keep</button
								>
							</form>
						{:else}
							<button
								onclick={() => (cancelling = r.id)}
								class="text-xs font-semibold text-stone-muted hover:text-laterite-500"
								>Cancel seat</button
							>
						{/if}
					</div>
				{/if}
			</li>
		{/each}
	</ul>
{:else}
	<p
		class="mt-6 rounded-lg border border-dashed border-ink-900/20 bg-white px-6 py-12 text-center text-sm text-stone-muted"
	>
		{data.show === 'pending' ? 'No payments waiting to be verified.' : 'No registrations here yet.'}
	</p>
{/if}
