<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';
	import { CalendarDays, IdCard } from '@lucide/svelte';
	import { rupees } from '#lib/content.ts';
	import { eventShortDate, eventTime } from '#lib/events.ts';
	import CredentialsNotice from '#lib/components/admin/CredentialsNotice.svelte';

	let { data, form }: PageProps = $props();
	let rejecting = $state<number | null>(null);
	let busy = $state<number | null>(null);

	// Disables the buttons while a decision is saving, so it can’t be sent twice.
	const act = (id: number) => () => {
		busy = id;
		return async ({ update }: { update: () => Promise<void> }) => {
			await update();
			busy = null;
			rejecting = null;
		};
	};

	type Payment = (typeof data.payments)[number];

	const statusTabs = [
		{ key: 'pending', label: 'To verify' },
		{ key: 'verified', label: 'Verified' },
		{ key: 'rejected', label: 'Rejected' }
	];
	const typeTabs = $derived([
		{ key: 'all', label: 'All', count: data.pending.events + data.pending.membership },
		{ key: 'events', label: 'Event registrations', count: data.pending.events },
		{ key: 'membership', label: 'Memberships', count: data.pending.membership }
	]);
	const kinds: Record<string, { label: string; tone: string; verify: string }> = {
		event: {
			label: 'Event',
			tone: 'bg-ink-900 text-brass-200',
			verify: 'Payment received — confirm seat'
		},
		joining: {
			label: 'Joining fee',
			tone: 'bg-brass-200 text-brass-600',
			verify: 'Payment received — approve member'
		},
		renewal: {
			label: 'Renewal',
			tone: 'bg-emerald-100 text-emerald-800',
			verify: 'Payment received — renew'
		}
	};

	const eventPayments = $derived(data.payments.filter((p) => p.purpose === 'event'));
	const membershipPayments = $derived(data.payments.filter((p) => p.purpose !== 'event'));
	const sum = (list: Payment[]) => list.reduce((s, p) => s + p.amount, 0);
	const when = (d: Date) => `${eventShortDate(d)}, ${eventTime(d)}`;

	/** Builds a link that keeps the other filters as they are. */
	function href(changes: Record<string, string | null>) {
		const params: Record<string, string | null> = {
			type: data.kind,
			show: data.show,
			q: data.q || null,
			event: data.eventFilter ? String(data.eventFilter) : null,
			...changes
		};
		const qs = Object.entries(params)
			// Leave defaults out so links stay short: type=all, show=pending.
			.filter(([k, v]) => v && !(k === 'type' && v === 'all') && !(k === 'show' && v === 'pending'))
			.map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
			.join('&');
		return `?${qs}`;
	}
</script>

{#snippet paymentList(list: Payment[])}
	<ul class="divide-y divide-ink-900/10 rounded-lg border border-ink-900/10 bg-white">
		{#each list as p (p.id)}
			{@const kind = kinds[p.purpose] ?? kinds.renewal}
			<li class="px-5 py-4">
				<div class="flex flex-wrap items-start justify-between gap-4">
					<div class="min-w-0">
						<p class="flex flex-wrap items-center gap-2">
							<span class="rounded-full px-2 py-0.5 text-[0.7rem] font-semibold {kind.tone}"
								>{kind.label}</span
							>
							<span class="font-semibold">{p.name}</span>
							{#if p.memberNumber}<span class="text-sm text-stone-muted">{p.memberNumber}</span
								>{/if}
						</p>
						<p class="mt-1 text-sm text-stone-muted">
							{#if p.purpose === 'event'}
								<strong class="font-semibold text-ink-800">{p.eventTitle}</strong> · ref
								<span class="font-mono">{p.registrationCode}</span> ·
								<a
									href="/admin/events/{p.eventId}/registrations?show=all"
									class="text-brass-600 hover:underline">answers</a
								>
							{:else if p.purpose === 'joining'}
								New member application ·
								<a href="/admin/applications" class="text-brass-600 hover:underline">details</a>
							{:else}
								Membership renewal{#if p.expiresAt && p.status === 'pending'}
									· currently ends {eventShortDate(p.expiresAt)}{/if}
							{/if}
						</p>
						<p class="mt-1 text-xs text-stone-muted">
							Paid {when(p.createdAt)}{#if p.phone}
								· <a href="tel:{p.phone}" class="hover:text-ink-900">{p.phone}</a>{/if}
						</p>
						{#if p.note}<p class="mt-1 text-sm">“{p.note}”</p>{/if}
					</div>
					<div class="text-right">
						<p class="display text-2xl">{rupees(p.amount)}</p>
						<p class="font-mono text-sm">UTR {p.utr}</p>
						{#if p.hasProof}
							<a
								href="/admin/proof/{p.id}"
								target="_blank"
								class="text-xs font-semibold text-brass-600">View screenshot ↗</a
							>
						{/if}
					</div>
				</div>
				{#if p.status === 'pending'}
					<div class="mt-4 border-t border-ink-900/10 pt-4">
						{#if rejecting === p.id}
							<form
								method="POST"
								action="?/reject"
								use:enhance={act(p.id)}
								class="flex flex-wrap gap-2"
							>
								<input type="hidden" name="id" value={p.id} />
								<input
									name="note"
									maxlength="500"
									placeholder="Reason, e.g. no payment found for this UTR"
									class="field-input !mt-0 min-w-0 flex-1"
								/>
								<button disabled={busy === p.id} class="btn-danger">Reject</button>
								<button type="button" onclick={() => (rejecting = null)} class="btn-quiet"
									>Cancel</button
								>
							</form>
						{:else}
							<div class="flex flex-wrap gap-2">
								<form method="POST" action="?/verify" use:enhance={act(p.id)}>
									<input type="hidden" name="id" value={p.id} />
									<button disabled={busy === p.id} class="btn-primary">
										{busy === p.id ? 'Saving…' : kind.verify}
									</button>
								</form>
								<button onclick={() => (rejecting = p.id)} class="btn-quiet">Reject</button>
							</div>
						{/if}
					</div>
				{/if}
			</li>
		{/each}
	</ul>
{/snippet}

{#snippet section(title: string, icon: typeof CalendarDays, list: Payment[], empty: string)}
	{@const Icon = icon}
	<section class="mt-8">
		<h2 class="flex items-center gap-2 font-semibold">
			<Icon class="size-4 text-brass-600" />
			{title}
			<span class="text-sm font-normal text-stone-muted">· {list.length} · {rupees(sum(list))}</span
			>
		</h2>
		<div class="mt-3">
			{#if list.length}
				{@render paymentList(list)}
			{:else}
				<p
					class="rounded-lg border border-dashed border-ink-900/20 bg-white px-6 py-8 text-center text-sm text-stone-muted"
				>
					{empty}
				</p>
			{/if}
		</div>
	</section>
{/snippet}

<p class="eyebrow text-brass-600">Payments</p>
<h1 class="display mt-2 text-4xl">UPI payments</h1>
<p class="mt-2 max-w-2xl text-sm text-stone-muted">
	Find each transaction ID (UTR) in your bank or UPI app, then confirm or reject it here. Event
	registrations and membership payments are kept separate.
</p>

{#if form?.credentials}<div class="mt-6"><CredentialsNotice {...form.credentials} /></div>{/if}
{#if form?.done}
	<p class="mt-6 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">
		{form.done}
	</p>
{/if}
{#if form?.error}<p class="field-error mt-6" role="alert">{form.error}</p>{/if}

<!-- What kind of payment -->
<nav class="mt-8 flex flex-wrap gap-1 border-b border-ink-900/10" aria-label="Payment type">
	{#each typeTabs as t (t.key)}
		<a
			href={href({ type: t.key, event: null })}
			aria-current={data.kind === t.key ? 'page' : undefined}
			class="-mb-px border-b-2 px-4 py-3 text-sm font-semibold transition-colors {data.kind ===
			t.key
				? 'border-brass-500 text-ink-900'
				: 'border-transparent text-stone-muted hover:text-ink-900'}"
		>
			{t.label}{#if t.count}<span
					class="ml-1.5 rounded-full bg-brass-400 px-2 py-0.5 text-[0.7rem] text-ink-950"
					>{t.count}</span
				>{/if}
		</a>
	{/each}
</nav>

<!-- Status, event and search -->
<div class="mt-5 flex flex-wrap items-center justify-between gap-4">
	<nav class="flex flex-wrap gap-2" aria-label="Status">
		{#each statusTabs as t (t.key)}
			<a
				href={href({ show: t.key })}
				aria-current={data.show === t.key ? 'page' : undefined}
				class="rounded-full px-4 py-1.5 text-sm {data.show === t.key
					? 'bg-ink-900 text-ivory-50'
					: 'bg-white text-ink-700 hover:text-ink-900'}">{t.label}</a
			>
		{/each}
	</nav>
	<form method="GET" class="flex flex-wrap gap-2">
		<input type="hidden" name="type" value={data.kind} />
		<input type="hidden" name="show" value={data.show} />
		{#if data.kind === 'events'}
			<select
				name="event"
				aria-label="Event"
				onchange={(e) => e.currentTarget.form?.requestSubmit()}
				class="field-input !mt-0 w-auto max-w-64"
			>
				<option value="">All events</option>
				{#each data.events as ev (ev.id)}
					<option value={ev.id} selected={data.eventFilter === ev.id}>{ev.title}</option>
				{/each}
			</select>
		{/if}
		<input
			type="search"
			name="q"
			value={data.q}
			placeholder="Search UTR or name"
			aria-label="Search by transaction ID or name"
			class="field-input !mt-0 w-52 font-mono"
		/>
		<button class="btn-quiet !py-2">Search</button>
	</form>
</div>

{#if data.q}
	<p class="mt-4 text-sm text-stone-muted">
		Matching “{data.q}” · <a href={href({ q: null })} class="text-brass-600">clear search</a>
	</p>
{/if}

{#if data.kind === 'all'}
	{@render section(
		'Event registrations',
		CalendarDays,
		eventPayments,
		data.show === 'pending' ? 'No event payments waiting.' : 'None.'
	)}
	{@render section(
		'Membership payments — joining fees & renewals',
		IdCard,
		membershipPayments,
		data.show === 'pending' ? 'No membership payments waiting.' : 'None.'
	)}
{:else if data.kind === 'events'}
	{@render section(
		data.eventFilter
			? (data.events.find((e) => e.id === data.eventFilter)?.title ?? 'Event registrations')
			: 'Event registrations',
		CalendarDays,
		eventPayments,
		data.show === 'pending' ? 'No event payments waiting.' : 'None.'
	)}
{:else}
	{@render section(
		'Membership payments — joining fees & renewals',
		IdCard,
		membershipPayments,
		data.show === 'pending' ? 'No membership payments waiting.' : 'None.'
	)}
{/if}
