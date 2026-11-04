<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';
	import { rupees } from '#lib/content.ts';
	import { eventShortDate } from '#lib/events.ts';
	import { AUTO_CONFIRM_DAYS, transactionKinds, transactionStatus } from '#lib/network.ts';
	import MemberPicker from '#lib/components/member/MemberPicker.svelte';
	import Tabs from '#lib/components/member/Tabs.svelte';
	import DateFilter from '#lib/components/member/DateFilter.svelte';

	let { data, form }: PageProps = $props();
	let busy = $state(false);
	let formKey = $state(0);
	let direction = $state('received');
	let declining = $state<number | null>(null);

	const values = $derived(form?.record && 'values' in form.record ? form.record.values : undefined);
	const awaiting = $derived(data.transactions.filter((t) => t.awaitingMe));
	const rest = $derived(data.transactions.filter((t) => !t.awaitingMe));
	const totals = $derived(
		data.transactions
			.filter((t) => t.status === 'confirmed')
			.reduce(
				(a, t) =>
					t.direction === 'received'
						? { ...a, received: a.received + t.amount }
						: { ...a, given: a.given + t.amount },
				{ received: 0, given: 0 }
			)
	);
	const autoDate = (d: Date) =>
		eventShortDate(new Date(d.getTime() + AUTO_CONFIRM_DAYS * 86_400_000));
	const badge: Record<string, string> = {
		pending: 'bg-brass-200 text-brass-600',
		confirmed: 'bg-emerald-100 text-emerald-800',
		declined: 'bg-laterite-500/10 text-laterite-500'
	};
	const tabs = $derived([
		{ key: 'list', label: 'My transactions', count: awaiting.length },
		{ key: 'record', label: 'Record business' }
	]);
</script>

<p class="eyebrow text-brass-600">Transactions</p>
<h1 class="display mt-2 text-4xl">Business between members</h1>
<p class="mt-2 max-w-2xl text-sm text-stone-muted">
	Record business you did with a member. They confirm it with one tap — if they don’t answer within
	{AUTO_CONFIRM_DAYS} days it’s confirmed automatically.
</p>

<Tabs {tabs} current={data.view} />

{#if data.view === 'record'}
	{#key formKey}
		<form
			method="POST"
			action="?/record"
			use:enhance={() => {
				busy = true;
				return async ({ result, update }) => {
					await update({ reset: false });
					busy = false;
					if (result.type === 'success') formKey++;
				};
			}}
			class="mt-8 max-w-2xl space-y-6 rounded-lg border border-ink-900/10 bg-white p-5 sm:p-7"
		>
			<MemberPicker options={data.options} name="otherId" selected={values?.otherId ?? data.with} />

			<fieldset>
				<legend class="field-label">What happened? *</legend>
				<div class="mt-2 grid gap-3 sm:grid-cols-2">
					{#each [['received', 'I received business from them', 'They bought from me or sent me a customer'], ['given', 'I gave business to them', 'I bought from them or sent them a customer']] as [key, label, hint] (key)}
						<label
							class="flex cursor-pointer gap-3 rounded-md border p-4 text-sm transition-colors {direction ===
							key
								? 'border-brass-500 bg-brass-200/30'
								: 'border-ink-900/15 hover:border-ink-900/30'}"
						>
							<input
								type="radio"
								name="direction"
								value={key}
								bind:group={direction}
								class="mt-0.5 text-ink-900"
							/>
							<span
								><strong class="block">{label}</strong><span class="text-stone-muted">{hint}</span
								></span
							>
						</label>
					{/each}
				</div>
			</fieldset>

			<div class="grid gap-6 sm:grid-cols-2">
				<label class="block">
					<span class="field-label">Type *</span>
					<select name="kind" class="field-input">
						{#each Object.entries(transactionKinds) as [key, label] (key)}
							<option value={key} selected={(values?.kind ?? 'direct') === key}>{label}</option>
						{/each}
					</select>
				</label>
				<label class="block">
					<span class="field-label">Business value (₹) *</span>
					<input
						name="amount"
						inputmode="numeric"
						required
						value={values?.amount ?? ''}
						placeholder="25000"
						class="field-input"
					/>
				</label>
			</div>
			<label class="block">
				<span class="field-label">What was it for?</span>
				<input
					name="description"
					maxlength="500"
					value={values?.description ?? ''}
					placeholder="Order of 500 shirts, annual audit…"
					class="field-input"
				/>
			</label>

			{#if form?.record && 'error' in form.record}<p class="field-error" role="alert">
					{form.record.error}
				</p>{/if}
			{#if form?.record && 'ok' in form.record}
				<p class="text-sm text-emerald-800" role="status">
					Recorded. The other member has been asked to confirm it.
				</p>
			{/if}
			<button disabled={busy} class="btn-primary">{busy ? 'Saving…' : 'Record business'}</button>
		</form>
	{/key}
{:else}
	{#if form?.respond?.error}<p class="field-error mt-6" role="alert">{form.respond.error}</p>{/if}

	{#if awaiting.length}
		<section class="mt-8 rounded-lg border border-brass-400 bg-white">
			<h2 class="border-b border-ink-900/10 px-5 py-4 font-semibold">Waiting for you</h2>
			<ul class="divide-y divide-ink-900/10">
				{#each awaiting as t (t.id)}
					<li class="px-5 py-4">
						<div class="flex flex-wrap items-center justify-between gap-3">
							<div>
								<p class="font-medium">
									{t.direction === 'received'
										? `${t.otherName} says they gave you ${rupees(t.amount)} of business`
										: `${t.otherName} says they got ${rupees(t.amount)} of business from you`}
								</p>
								<p class="text-sm text-stone-muted">
									{eventShortDate(t.createdAt)} · {transactionKinds[
										t.kind as keyof typeof transactionKinds
									]}{t.description ? ` · ${t.description}` : ''}
									· confirms automatically on {autoDate(t.createdAt)}
								</p>
							</div>
							{#if declining !== t.id}
								<div class="flex gap-2">
									<form method="POST" action="?/confirm" use:enhance>
										<input type="hidden" name="id" value={t.id} />
										<button class="btn-primary !px-4 !py-2">Confirm</button>
									</form>
									<button onclick={() => (declining = t.id)} class="btn-quiet !px-4 !py-2"
										>Decline</button
									>
								</div>
							{/if}
						</div>
						{#if declining === t.id}
							<form
								method="POST"
								action="?/decline"
								use:enhance={() =>
									async ({ update }) => {
										declining = null;
										await update();
									}}
								class="mt-3 flex flex-wrap gap-2"
							>
								<input type="hidden" name="id" value={t.id} />
								<input
									name="reason"
									maxlength="300"
									placeholder="Reason (optional), e.g. wrong amount"
									class="field-input !mt-0 flex-1"
								/>
								<button class="btn-danger !py-2">Decline</button>
								<button type="button" onclick={() => (declining = null)} class="btn-quiet !py-2"
									>Cancel</button
								>
							</form>
						{/if}
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<div class="mt-8 flex flex-wrap items-end justify-between gap-6">
		<DateFilter view="list" from={data.range.from} to={data.range.to} />
		<dl class="flex gap-8 text-sm">
			<div>
				<dt class="text-stone-muted">Received</dt>
				<dd class="display text-2xl">{rupees(totals.received)}</dd>
			</div>
			<div>
				<dt class="text-stone-muted">Given</dt>
				<dd class="display text-2xl">{rupees(totals.given)}</dd>
			</div>
		</dl>
	</div>

	{#if rest.length}
		<div class="mt-6 overflow-x-auto rounded-lg border border-ink-900/10 bg-white">
			<table class="w-full min-w-[42rem] text-left text-sm">
				<thead class="border-b border-ink-900/10 text-xs tracking-wide text-stone-muted uppercase">
					<tr>
						<th class="px-4 py-3 font-semibold">Date</th>
						<th class="px-4 py-3 font-semibold">Member</th>
						<th class="px-4 py-3 font-semibold">Business</th>
						<th class="px-4 py-3 text-right font-semibold">Amount</th>
						<th class="px-4 py-3 font-semibold">Status</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-ink-900/10">
					{#each rest as t (t.id)}
						<tr class="align-top">
							<td class="px-4 py-4 whitespace-nowrap text-stone-muted"
								>{eventShortDate(t.createdAt)}</td
							>
							<td class="px-4 py-4">
								<a href="/member/directory/{t.otherId}" class="font-medium hover:text-brass-600"
									>{t.otherName}</a
								>
								{#if t.otherBusiness}<span class="block text-xs text-stone-muted"
										>{t.otherBusiness}</span
									>{/if}
							</td>
							<td class="px-4 py-4">
								{t.direction === 'received' ? 'Received from them' : 'Given to them'}
								<span class="block text-xs text-stone-muted"
									>{transactionKinds[t.kind as keyof typeof transactionKinds]}{t.description
										? ` · ${t.description}`
										: ''}</span
								>
							</td>
							<td
								class="px-4 py-4 text-right font-semibold whitespace-nowrap {t.direction ===
								'received'
									? 'text-emerald-800'
									: ''}">{rupees(t.amount)}</td
							>
							<td class="px-4 py-4">
								<span class="rounded-full px-2 py-0.5 text-xs font-semibold {badge[t.status]}">
									{t.status === 'confirmed' && t.autoConfirmed
										? 'Auto-confirmed'
										: transactionStatus[t.status as keyof typeof transactionStatus]}
								</span>
								{#if t.status === 'pending'}
									<span class="mt-1 block text-xs text-stone-muted"
										>Auto-confirms {autoDate(t.createdAt)}</span
									>
									<form method="POST" action="?/withdraw" use:enhance class="mt-1">
										<input type="hidden" name="id" value={t.id} />
										<button class="text-xs font-semibold text-laterite-500 hover:underline"
											>Withdraw</button
										>
									</form>
								{:else if t.status === 'declined' && t.declineReason}
									<span class="mt-1 block text-xs text-stone-muted">“{t.declineReason}”</span>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{:else if !awaiting.length}
		<p
			class="mt-6 rounded-lg border border-dashed border-ink-900/20 bg-white px-6 py-12 text-center text-sm text-stone-muted"
		>
			No transactions{data.range.from || data.range.to ? ' in these dates' : ' yet'}.
			<a href="?view=record" class="font-semibold text-brass-600">Record business →</a>
		</p>
	{/if}
{/if}
