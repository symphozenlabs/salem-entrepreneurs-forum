<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';
	import { connectKinds, connectStatuses, type ConnectKind } from '#lib/network.ts';
	import { eventShortDate } from '#lib/events.ts';
	import MemberPicker from '#lib/components/member/MemberPicker.svelte';
	import Tabs from '#lib/components/member/Tabs.svelte';
	import DateFilter from '#lib/components/member/DateFilter.svelte';

	let { data, form }: PageProps = $props();
	let busy = $state(false);
	let kind = $state<ConnectKind>('self');
	let formKey = $state(0);

	const given = $derived(form?.give && 'values' in form.give ? form.give.values : undefined);
	const tabs = $derived([
		{ key: 'give', label: 'Give a connect' },
		{ key: 'received', label: 'Received', count: data.connects.received.length },
		{ key: 'given', label: 'Given', count: data.connects.given.length }
	]);
	const rows = $derived(data.view === 'received' ? data.connects.received : data.connects.given);
	const tel = (p: string) => `tel:${p.replace(/[^\d+]/g, '')}`;
</script>

<p class="eyebrow text-brass-600">Connects</p>
<h1 class="display mt-2 text-4xl">Pass business to members</h1>
<p class="mt-2 max-w-2xl text-sm text-stone-muted">
	A connect is a lead: you need a member’s product or service yourself, or you know someone who
	does.
</p>

<Tabs {tabs} current={data.view} />

{#if data.view === 'give'}
	{#key formKey}
		<form
			method="POST"
			action="?/give"
			use:enhance={() => {
				busy = true;
				return async ({ result, update }) => {
					await update({ reset: false });
					busy = false;
					if (result.type === 'success') {
						kind = 'self';
						formKey++;
					}
				};
			}}
			class="mt-8 max-w-2xl space-y-6 rounded-lg border border-ink-900/10 bg-white p-5 sm:p-7"
		>
			<MemberPicker
				options={data.options}
				name="toId"
				selected={given?.toId ?? data.to}
				label="Give the connect to"
			/>

			<fieldset>
				<legend class="field-label">Who needs it? *</legend>
				<div class="mt-2 grid gap-3 sm:grid-cols-2">
					{#each Object.entries(connectKinds) as [key, k] (key)}
						<label
							class="flex cursor-pointer gap-3 rounded-md border p-4 text-sm transition-colors {kind ===
							key
								? 'border-brass-500 bg-brass-200/30'
								: 'border-ink-900/15 hover:border-ink-900/30'}"
						>
							<input
								type="radio"
								name="kind"
								value={key}
								bind:group={kind}
								class="mt-0.5 text-ink-900"
							/>
							<span
								><strong class="block">{k.label}</strong><span class="text-stone-muted"
									>{k.hint}</span
								></span
							>
						</label>
					{/each}
				</div>
			</fieldset>

			{#if kind === 'referral'}
				<div class="grid gap-6 sm:grid-cols-2">
					<label class="block">
						<span class="field-label">Their name *</span>
						<input
							name="contactName"
							required
							value={given?.contactName ?? ''}
							class="field-input"
						/>
					</label>
					<label class="block">
						<span class="field-label">Their phone *</span>
						<input
							name="contactPhone"
							type="tel"
							required
							value={given?.contactPhone ?? ''}
							class="field-input"
						/>
					</label>
				</div>
			{/if}

			<label class="block">
				<span class="field-label">Notes</span>
				<textarea
					name="notes"
					rows="3"
					maxlength="1000"
					class="field-input"
					placeholder="What’s needed, budget, best time to call…">{given?.notes ?? ''}</textarea
				>
			</label>

			{#if form?.give && 'error' in form.give}<p class="field-error" role="alert">
					{form.give.error}
				</p>{/if}
			{#if form?.give && 'ok' in form.give}
				<p class="text-sm text-emerald-800" role="status">
					Connect sent. It’s in their Connects now.
				</p>
			{/if}
			<button disabled={busy} class="btn-primary">{busy ? 'Sending…' : 'Give connect'}</button>
		</form>
	{/key}
{:else}
	<div class="mt-8"><DateFilter view={data.view} from={data.range.from} to={data.range.to} /></div>

	{#if rows.length}
		<div class="mt-6 overflow-x-auto rounded-lg border border-ink-900/10 bg-white">
			<table class="w-full min-w-[44rem] text-left text-sm">
				<thead class="border-b border-ink-900/10 text-xs tracking-wide text-stone-muted uppercase">
					<tr>
						<th class="px-4 py-3 font-semibold">Date</th>
						<th class="px-4 py-3 font-semibold">{data.view === 'received' ? 'From' : 'To'}</th>
						<th class="px-4 py-3 font-semibold">Connect</th>
						<th class="px-4 py-3 font-semibold">Notes</th>
						<th class="px-4 py-3 font-semibold">Status</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-ink-900/10">
					{#each rows as c (c.id)}
						<tr class="align-top">
							<td class="px-4 py-4 whitespace-nowrap text-stone-muted"
								>{eventShortDate(c.createdAt)}</td
							>
							<td class="px-4 py-4">
								<a href="/member/directory/{c.otherId}" class="font-medium hover:text-brass-600"
									>{c.otherName}</a
								>
								{#if c.otherBusiness}<span class="block text-xs text-stone-muted"
										>{c.otherBusiness}</span
									>{/if}
								{#if c.otherPhone}<a href={tel(c.otherPhone)} class="text-xs text-brass-600"
										>{c.otherPhone}</a
									>{/if}
							</td>
							<td class="px-4 py-4">
								{#if c.kind === 'referral'}
									<span class="font-medium">Referral:</span>
									{c.contactName}
									{#if c.contactPhone}<a href={tel(c.contactPhone)} class="block text-brass-600"
											>{c.contactPhone}</a
										>{/if}
								{:else}
									{data.view === 'received' ? 'They need your service' : 'For myself'}
								{/if}
							</td>
							<td class="max-w-xs px-4 py-4 whitespace-pre-line text-stone-muted"
								>{c.notes ?? '—'}</td
							>
							<td class="px-4 py-4">
								{#if data.view === 'received'}
									<form
										method="POST"
										action="?/status"
										use:enhance={() =>
											async ({ update }) =>
												update({ reset: false })}
									>
										<input type="hidden" name="id" value={c.id} />
										<select
											name="status"
											aria-label="Status"
											onchange={(e) => e.currentTarget.form?.requestSubmit()}
											class="rounded-md border-ink-900/15 py-1.5 pr-8 text-sm"
										>
											{#each Object.entries(connectStatuses) as [key, label] (key)}
												<option value={key} selected={c.status === key}>{label}</option>
											{/each}
										</select>
									</form>
								{:else}
									{connectStatuses[c.status as keyof typeof connectStatuses] ?? c.status}
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{:else}
		<p
			class="mt-6 rounded-lg border border-dashed border-ink-900/20 bg-white px-6 py-12 text-center text-sm text-stone-muted"
		>
			{data.view === 'received' ? 'No connects received' : 'No connects given'}{data.range.from ||
			data.range.to
				? ' in these dates'
				: ' yet'}.
			{#if data.view === 'given'}<a href="?view=give" class="font-semibold text-brass-600"
					>Give one →</a
				>{/if}
		</p>
	{/if}
{/if}
