<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';
	import { Award, Check, Search, X } from '@lucide/svelte';
	import { eventShortDate } from '#lib/events.ts';
	import {
		activities,
		entryKinds,
		levelFor,
		levelRange,
		levels,
		levelTone,
		pts,
		redemptionStatus,
		type Activity
	} from '#lib/loyalty.ts';
	import { hubs } from '#lib/network.ts';
	import Pagination from '#lib/components/Pagination.svelte';

	let { data, form }: PageProps = $props();

	let rejecting = $state<number | null>(null);
	let busy = $state<number | null>(null);
	const act = (id: number) => () => {
		busy = id;
		return async ({ update }: { update: () => Promise<void> }) => {
			await update();
			busy = null;
			rejecting = null;
		};
	};

	const views = $derived([
		{ key: 'requests', label: 'Redemption requests', count: data.counts.pending ?? 0 },
		{ key: 'members', label: 'Members' },
		{ key: 'log', label: 'Points log' },
		{ key: 'award', label: 'Award points' }
	]);
	const statusTabs = [
		{ key: 'pending', label: 'To review' },
		{ key: 'approved', label: 'Approved' },
		{ key: 'rejected', label: 'Declined' },
		{ key: 'cancelled', label: 'Withdrawn' }
	];
	const signed = (n: number) => `${n > 0 ? '+' : '−'}${pts(Math.abs(n))}`;

	// ---- Award form ----
	let kind = $state<Activity | 'adjustment'>('meeting');
	let points = $state<number>(activities.meeting.points);
	const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
	let picked = $state<string[]>([]);
	let find = $state('');
	let hub = $state('');
	let eventId = $state('');

	const choices = $derived(data.view === 'award' ? data.members : []);
	const shown = $derived.by(() => {
		const q = find.trim().toLowerCase();
		return choices.filter(
			(m) =>
				(!hub || m.hub === hub) &&
				(!q ||
					m.name.toLowerCase().includes(q) ||
					m.business.toLowerCase().includes(q) ||
					m.memberNumber.toLowerCase().includes(q))
		);
	});
	const allShownPicked = $derived(shown.length > 0 && shown.every((m) => picked.includes(m.id)));

	function chooseKind(k: Activity | 'adjustment') {
		kind = k;
		if (k !== 'adjustment' && activities[k].points) points = activities[k].points;
	}
	function toggleShown() {
		const ids = shown.map((m) => m.id);
		picked = allShownPicked
			? picked.filter((id) => !ids.includes(id))
			: [...new Set([...picked, ...ids])];
	}
	function fromEvent(id: string) {
		eventId = id;
		const ev = data.view === 'award' ? data.events.find((e) => String(e.id) === id) : undefined;
		if (ev) picked = [...new Set([...picked, ...ev.members])];
	}
</script>

<p class="eyebrow text-brass-600">Loyalty points</p>
<h1 class="display mt-2 text-4xl">Loyalty points</h1>
<p class="mt-2 max-w-2xl text-sm text-stone-muted">
	Approve members’ redemptions, see every point given, and award points. Only admins award points —
	nothing is added automatically.
</p>
<details class="mt-4 max-w-3xl rounded-lg border border-ink-900/10 bg-white text-sm">
	<summary class="cursor-pointer px-5 py-3 font-semibold">Points rules and member levels</summary>
	<div class="grid gap-6 border-t border-ink-900/10 px-5 py-4 sm:grid-cols-2">
		<div>
			<p class="text-xs font-semibold tracking-wide text-stone-muted uppercase">Earning</p>
			<ul class="mt-2 space-y-1">
				{#each Object.values(activities).filter((a) => a.points) as a (a.label)}
					<li class="flex justify-between gap-3">
						<span>{a.label}{'once' in a ? ' (once)' : ''}</span>
						<span class="text-stone-muted tabular-nums">+{pts(a.points)}</span>
					</li>
				{/each}
			</ul>
		</div>
		<div>
			<p class="text-xs font-semibold tracking-wide text-stone-muted uppercase">Levels</p>
			<ul class="mt-2 space-y-1">
				{#each levels as l (l.key)}
					<li class="flex justify-between gap-3">
						<span class="rounded-full px-2 py-0.5 text-xs font-semibold {levelTone[l.key]}"
							>{l.label}</span
						>
						<span class="text-stone-muted tabular-nums">{levelRange(l)}</span>
					</li>
				{/each}
			</ul>
			<p class="mt-2 text-xs text-stone-muted">
				Levels follow the points a member has earned in all — redeeming doesn’t lower them. You can
				set a member’s level by hand under Members.
			</p>
		</div>
	</div>
</details>

{#if form?.done}
	<p class="mt-6 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">
		{form.done}
	</p>
{/if}
{#if form?.error}<p class="field-error mt-6" role="alert">{form.error}</p>{/if}

<nav class="mt-8 flex flex-wrap gap-1 border-b border-ink-900/10" aria-label="Sections">
	{#each views as v (v.key)}
		<a
			href="?view={v.key}"
			aria-current={data.view === v.key ? 'page' : undefined}
			class="-mb-px border-b-2 px-4 py-3 text-sm font-semibold transition-colors {data.view ===
			v.key
				? 'border-brass-500 text-ink-900'
				: 'border-transparent text-stone-muted hover:text-ink-900'}"
		>
			{v.label}{#if v.count}<span
					class="ml-1.5 rounded-full bg-brass-400 px-2 py-0.5 text-[0.7rem] text-ink-950"
					>{v.count}</span
				>{/if}
		</a>
	{/each}
</nav>

{#if data.view === 'requests'}
	<nav class="mt-5 flex flex-wrap gap-2" aria-label="Status">
		{#each statusTabs as t (t.key)}
			<a
				href="?view=requests&show={t.key}"
				aria-current={data.show === t.key ? 'page' : undefined}
				class="rounded-full px-4 py-1.5 text-sm {data.show === t.key
					? 'bg-ink-900 text-ivory-50'
					: 'bg-white text-ink-700 hover:text-ink-900'}"
				>{t.label}{#if data.counts[t.key]}<span class="ml-1 opacity-60">{data.counts[t.key]}</span
					>{/if}</a
			>
		{/each}
	</nav>

	{#if data.requests.length}
		<ul class="mt-6 divide-y divide-ink-900/10 rounded-lg border border-ink-900/10 bg-white">
			{#each data.requests as r (r.id)}
				{@const enough = r.balance >= r.cost}
				<li class="px-5 py-4">
					<div class="flex flex-wrap items-start justify-between gap-4">
						<div class="min-w-0">
							<p class="flex flex-wrap items-center gap-2">
								<span class="font-semibold">{r.name}</span>
								{#if r.memberNumber}<span class="text-sm text-stone-muted">{r.memberNumber}</span
									>{/if}
							</p>
							<p class="mt-1 text-sm">
								<strong class="font-semibold">{r.rewardLabel}</strong>
							</p>
							<p class="mt-1 text-xs text-stone-muted">
								Asked {eventShortDate(r.createdAt)}{#if r.phone}
									· <a href="tel:{r.phone}" class="hover:text-ink-900">{r.phone}</a>{/if}
								·
								<a href="?view=log&member={r.userId}" class="text-brass-600 hover:underline"
									>points history</a
								>
							</p>
							{#if r.note}<p class="mt-1 text-sm">“{r.note}”</p>{/if}
							{#if r.status !== 'pending'}
								<p class="mt-1 text-xs text-stone-muted">
									{redemptionStatus[r.status as keyof typeof redemptionStatus]}{#if r.reviewer}
										by {r.reviewer}{/if}{#if r.reviewedAt}
										on {eventShortDate(r.reviewedAt)}{/if}{#if r.adminNote}
										— “{r.adminNote}”{/if}
								</p>
							{/if}
						</div>
						<div class="text-right">
							<p class="display text-2xl">{pts(r.cost)} pts</p>
							<p
								class="text-xs {enough || r.status !== 'pending'
									? 'text-stone-muted'
									: 'text-laterite-500'}"
							>
								Balance now {pts(r.balance)}{#if r.status === 'pending' && !enough}<span>
										— not enough</span
									>{/if}
							</p>
						</div>
					</div>
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
										placeholder="Reason, shown to the member"
										class="field-input !mt-0 min-w-0 flex-1"
									/>
									<button disabled={busy === r.id} class="btn-danger">Decline</button>
									<button type="button" onclick={() => (rejecting = null)} class="btn-quiet"
										>Cancel</button
									>
								</form>
							{:else}
								<div class="flex flex-wrap gap-2">
									<form method="POST" action="?/approve" use:enhance={act(r.id)}>
										<input type="hidden" name="id" value={r.id} />
										<button disabled={busy === r.id || !enough} class="btn-primary">
											<Check class="size-4" />
											{busy === r.id ? 'Saving…' : `Approve — take off ${pts(r.cost)} pts`}
										</button>
									</form>
									<button onclick={() => (rejecting = r.id)} class="btn-quiet">Decline</button>
								</div>
							{/if}
						</div>
					{/if}
				</li>
			{/each}
		</ul>
		<Pagination pager={data.pager} />
	{:else}
		<p
			class="mt-6 rounded-lg border border-dashed border-ink-900/20 bg-white px-6 py-8 text-center text-sm text-stone-muted"
		>
			{data.show === 'pending' ? 'No redemption requests waiting.' : 'None.'}
		</p>
	{/if}
{:else if data.view === 'members'}
	<div class="mt-6 grid gap-4 sm:grid-cols-3">
		<div class="rounded-lg border border-ink-900/10 bg-white p-5">
			<p class="display text-3xl">{pts(data.totals.balance)}</p>
			<p class="mt-1 text-sm text-stone-muted">Points held by members</p>
		</div>
		<div class="rounded-lg border border-ink-900/10 bg-white p-5">
			<p class="display text-3xl">{pts(data.totals.earned)}</p>
			<p class="mt-1 text-sm text-stone-muted">Points earned in all</p>
		</div>
		<div class="rounded-lg border border-ink-900/10 bg-white p-5">
			<p class="display text-3xl">{pts(data.totals.redeemed)}</p>
			<p class="mt-1 text-sm text-stone-muted">Points redeemed</p>
		</div>
	</div>

	<form method="GET" class="mt-6 flex gap-2">
		<input type="hidden" name="view" value="members" />
		<input
			type="search"
			name="q"
			value={data.q}
			placeholder="Search name, business or member no."
			aria-label="Search members"
			class="field-input !mt-0 w-72"
		/>
		<button class="btn-quiet !py-2"><Search class="size-4" /> Search</button>
	</form>

	<div class="mt-4 overflow-x-auto rounded-lg border border-ink-900/10 bg-white">
		<table class="w-full min-w-[52rem] text-sm">
			<thead class="text-left text-xs tracking-wide text-stone-muted uppercase">
				<tr class="border-b border-ink-900/10">
					<th class="px-5 py-3 font-semibold">Member</th>
					<th class="px-5 py-3 font-semibold">Level</th>
					<th class="px-5 py-3 text-right font-semibold">Balance</th>
					<th class="px-5 py-3 text-right font-semibold">Earned</th>
					<th class="px-5 py-3 text-right font-semibold">Redeemed</th>
					<th class="px-5 py-3 text-right font-semibold">On hold</th>
					<th class="px-5 py-3 font-semibold">Last activity</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-ink-900/10">
				{#each data.balances as m (m.id)}
					{@const lv = levelFor(m.levelPoints, m.levelOverride)}
					<tr>
						<td class="px-5 py-3">
							<a href="?view=log&member={m.id}" class="font-medium hover:text-brass-600">{m.name}</a
							>
							<p class="text-xs text-stone-muted">{m.memberNumber} · {m.business} · {m.hub}</p>
						</td>
						<td class="px-5 py-3">
							<form
								method="POST"
								action="?/level"
								use:enhance={act(-2)}
								class="flex items-center gap-2"
							>
								<input type="hidden" name="member" value={m.id} />
								<span
									class="rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap {levelTone[
										lv.level.key
									]}">{lv.level.label}</span
								>
								<select
									name="level"
									aria-label="Level for {m.name}"
									onchange={(e) => e.currentTarget.form?.requestSubmit()}
									class="rounded border border-ink-900/15 bg-white px-1.5 py-1 text-xs"
								>
									<option value="" selected={!lv.manual}>By points</option>
									{#each levels as l (l.key)}
										<option value={l.key} selected={lv.manual && lv.level.key === l.key}
											>Set: {l.label}</option
										>
									{/each}
								</select>
							</form>
						</td>
						<td class="px-5 py-3 text-right font-semibold tabular-nums">{pts(m.balance)}</td>
						<td class="px-5 py-3 text-right tabular-nums">{pts(m.earned)}</td>
						<td class="px-5 py-3 text-right tabular-nums">{pts(m.redeemed)}</td>
						<td class="px-5 py-3 text-right tabular-nums">{m.held ? pts(m.held) : '—'}</td>
						<td class="px-5 py-3 text-stone-muted">{m.lastAt ? eventShortDate(m.lastAt) : '—'}</td>
					</tr>
				{:else}
					<tr
						><td colspan="7" class="px-5 py-6 text-center text-stone-muted">No members found.</td
						></tr
					>
				{/each}
			</tbody>
		</table>
	</div>
	<Pagination pager={data.pager} />
{:else if data.view === 'log'}
	<form method="GET" class="mt-6 flex flex-wrap gap-2">
		<input type="hidden" name="view" value="log" />
		<select
			name="member"
			aria-label="Member"
			onchange={(e) => e.currentTarget.form?.requestSubmit()}
			class="field-input !mt-0 w-auto max-w-80"
		>
			<option value="">All members</option>
			{#each data.members as m (m.id)}
				<option value={m.id} selected={data.member === m.id}>{m.name} · {m.memberNumber}</option>
			{/each}
		</select>
		{#if data.member}<a href="?view=log" class="btn-quiet !py-2"><X class="size-4" /> Clear</a>{/if}
	</form>

	<div class="mt-4 overflow-x-auto rounded-lg border border-ink-900/10 bg-white">
		<table class="w-full min-w-[44rem] text-sm">
			<thead class="text-left text-xs tracking-wide text-stone-muted uppercase">
				<tr class="border-b border-ink-900/10">
					<th class="px-5 py-3 font-semibold">Date</th>
					<th class="px-5 py-3 font-semibold">Member</th>
					<th class="px-5 py-3 font-semibold">Activity</th>
					<th class="px-5 py-3 text-right font-semibold">Points</th>
					<th class="px-5 py-3 font-semibold">Added by</th>
					<th class="px-5 py-3"></th>
				</tr>
			</thead>
			<tbody class="divide-y divide-ink-900/10">
				{#each data.entries as e (e.id)}
					<tr class={e.voidedAt ? 'text-stone-muted' : ''}>
						<td class="px-5 py-3 whitespace-nowrap">{eventShortDate(e.occurredAt)}</td>
						<td class="px-5 py-3">
							<a href="?view=log&member={e.userId}" class="hover:text-brass-600">{e.name}</a>
						</td>
						<td class="px-5 py-3">
							<p class={e.voidedAt ? 'line-through' : 'font-medium'}>
								{entryKinds[e.kind] ?? e.kind}
							</p>
							{#if e.note}<p class="text-xs text-stone-muted">{e.note}</p>{/if}
						</td>
						<td
							class="px-5 py-3 text-right font-semibold tabular-nums {e.voidedAt
								? 'line-through'
								: e.points > 0
									? 'text-emerald-700'
									: 'text-laterite-500'}">{signed(e.points)}</td
						>
						<td class="px-5 py-3 text-stone-muted">
							{e.auto ? 'Automatic' : (e.awardedBy ?? '—')}
							{#if e.voidedAt}<p class="text-xs">Cancelled {eventShortDate(e.voidedAt)}</p>{/if}
						</td>
						<td class="px-5 py-3 text-right">
							{#if e.kind !== 'redemption'}
								<form
									method="POST"
									action={e.voidedAt ? '?/restore' : '?/void'}
									use:enhance={act(e.id)}
								>
									<input type="hidden" name="id" value={e.id} />
									<button
										disabled={busy === e.id}
										class="text-xs font-semibold {e.voidedAt
											? 'text-brass-600'
											: 'text-laterite-500'} hover:underline"
										>{e.voidedAt ? 'Restore' : 'Cancel'}</button
									>
								</form>
							{/if}
						</td>
					</tr>
				{:else}
					<tr><td colspan="6" class="px-5 py-6 text-center text-stone-muted">No points yet.</td></tr
					>
				{/each}
			</tbody>
		</table>
	</div>
	<Pagination pager={data.pager} />
{:else if data.view === 'award'}
	<form
		method="POST"
		action="?/award"
		use:enhance={() => {
			busy = -1;
			return async ({ result, update }) => {
				await update({ reset: false });
				busy = null;
				if (result.type === 'success') picked = [];
			};
		}}
		class="mt-6 grid gap-8 xl:grid-cols-[22rem_1fr]"
	>
		<div class="space-y-5 rounded-lg border border-ink-900/10 bg-white p-5">
			<fieldset>
				<legend class="field-label">Activity *</legend>
				<div class="mt-2 grid gap-1.5">
					{#each Object.entries(activities) as [k, a] (k)}
						<label
							class="flex cursor-pointer items-center justify-between rounded-md border px-3 py-2 text-sm {kind ===
							k
								? 'border-brass-500 bg-brass-200/30'
								: 'border-ink-900/10'}"
						>
							<span class="flex items-center gap-2">
								<input
									type="radio"
									name="kind"
									value={k}
									checked={kind === k}
									onchange={() => chooseKind(k as Activity)}
								/>
								{a.label}
							</span>
							{#if a.points}<span class="text-stone-muted">+{a.points}</span>{/if}
						</label>
					{/each}
					<label
						class="flex cursor-pointer items-center justify-between rounded-md border px-3 py-2 text-sm {kind ===
						'adjustment'
							? 'border-brass-500 bg-brass-200/30'
							: 'border-ink-900/10'}"
					>
						<span class="flex items-center gap-2">
							<input
								type="radio"
								name="kind"
								value="adjustment"
								checked={kind === 'adjustment'}
								onchange={() => chooseKind('adjustment')}
							/>
							Adjustment (add or take away)
						</span>
					</label>
				</div>
			</fieldset>

			<label class="block">
				<span class="field-label">Points per member *</span>
				<input
					type="number"
					name="points"
					required
					step="1"
					min={kind === 'adjustment' ? undefined : 1}
					bind:value={points}
					class="field-input"
				/>
				{#if kind === 'adjustment'}
					<span class="mt-1 block text-xs text-stone-muted"
						>Use a minus sign to take points away.</span
					>
				{/if}
			</label>

			<label class="block">
				<span class="field-label">Date of the activity *</span>
				<input type="date" name="date" required value={today} max={today} class="field-input" />
			</label>

			<label class="block">
				<span class="field-label">Note{kind === 'adjustment' ? ' *' : ''}</span>
				<input
					name="note"
					maxlength="500"
					required={kind === 'adjustment'}
					placeholder={kind === 'adjustment' ? 'Why the points change' : 'e.g. November meeting'}
					class="field-input"
				/>
			</label>

			<button disabled={busy === -1 || !picked.length} class="btn-primary w-full">
				<Award class="size-4" />
				{busy === -1
					? 'Saving…'
					: picked.length
						? `Save ${signed(points || 0)} for ${picked.length} member${picked.length === 1 ? '' : 's'}`
						: 'Choose members'}
			</button>
		</div>

		<div class="rounded-lg border border-ink-900/10 bg-white">
			<div class="space-y-3 border-b border-ink-900/10 p-5">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<h2 class="font-semibold">
						Members <span class="font-normal text-stone-muted">· {picked.length} chosen</span>
					</h2>
					{#if picked.length}
						<button type="button" onclick={() => (picked = [])} class="text-sm text-brass-600"
							>Clear choice</button
						>
					{/if}
				</div>
				{#if data.events.length}
					<label class="block">
						<span class="text-xs font-semibold text-stone-muted"
							>Add everyone confirmed for an event</span
						>
						<select
							value={eventId}
							onchange={(e) => fromEvent(e.currentTarget.value)}
							class="field-input !mt-1"
						>
							<option value="">Choose an event…</option>
							{#each data.events as ev (ev.id)}
								<option value={String(ev.id)}
									>{ev.title} · {eventShortDate(ev.startsAt)} · {ev.members.length} member{ev
										.members.length === 1
										? ''
										: 's'}</option
								>
							{/each}
						</select>
					</label>
				{/if}
				<div class="flex flex-wrap gap-2">
					<input
						type="search"
						bind:value={find}
						placeholder="Search name, business or member no."
						aria-label="Search members"
						class="field-input !mt-0 min-w-0 flex-1"
					/>
					<select bind:value={hub} aria-label="Hub" class="field-input !mt-0 w-auto">
						<option value="">All hubs</option>
						{#each hubs as h (h)}<option value={h}>{h}</option>{/each}
					</select>
				</div>
				<label class="flex items-center gap-2 text-sm">
					<input type="checkbox" checked={allShownPicked} onchange={toggleShown} />
					Select all {shown.length} shown
				</label>
			</div>
			<ul class="max-h-[32rem] divide-y divide-ink-900/5 overflow-y-auto">
				{#each shown as m (m.id)}
					<li>
						<label
							class="flex cursor-pointer items-center gap-3 px-5 py-2.5 text-sm hover:bg-ivory-100"
						>
							<input type="checkbox" name="member" value={m.id} bind:group={picked} />
							<span class="min-w-0 flex-1">
								<span class="font-medium">{m.name}</span>
								<span class="block truncate text-xs text-stone-muted"
									>{m.memberNumber} · {m.business} · {m.hub}{m.active ? '' : ' · expired'}</span
								>
							</span>
						</label>
					</li>
				{:else}
					<li class="px-5 py-6 text-center text-sm text-stone-muted">No members match.</li>
				{/each}
			</ul>
			<!-- Chosen members hidden by the search still go with the form. -->
			{#each picked.filter((id) => !shown.some((m) => m.id === id)) as id (id)}
				<input type="hidden" name="member" value={id} />
			{/each}
		</div>
	</form>
{/if}
