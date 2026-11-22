<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';
	import { Gift } from '@lucide/svelte';
	import { eventShortDate } from '#lib/events.ts';
	import {
		activities,
		entryKinds,
		levelFor,
		levelRange,
		levels,
		levelTone,
		nextReward,
		pts,
		redemptionStatus,
		rewards,
		standardActivities
	} from '#lib/loyalty.ts';
	import Pagination from '#lib/components/Pagination.svelte';

	let { data, form }: PageProps = $props();

	const s = $derived(data.summary);
	const next = $derived(nextReward(s.available));
	const progress = $derived(
		next ? Math.max(0, Math.min(100, (s.available / next.cost) * 100)) : 100
	);
	const canRedeem = $derived(s.available >= rewards[0].cost);
	const stats = $derived([
		{ label: 'Meetings & events', value: s.eventsAttended },
		{ label: 'Group discussions', value: s.discussions },
		{ label: 'On-time registrations', value: s.onTime },
		{ label: 'Other activities', value: s.activitiesCompleted }
	]);
	const lv = $derived(levelFor(s.levelPoints, s.levelOverride));
	const levelProgress = $derived(
		lv.next
			? Math.max(
					0,
					Math.min(100, ((s.levelPoints - lv.level.min) / (lv.next.min - lv.level.min)) * 100)
				)
			: 100
	);
	const pending = $derived(data.requests.filter((r) => r.status === 'pending'));
	const answered = $derived(data.requests.filter((r) => r.status !== 'pending'));
	const tones: Record<string, string> = {
		pending: 'bg-brass-200 text-brass-600',
		approved: 'bg-emerald-100 text-emerald-800',
		rejected: 'bg-laterite-500/10 text-laterite-500',
		cancelled: 'bg-ink-900/5 text-stone-muted'
	};
</script>

<p class="eyebrow text-brass-600">Loyalty points</p>
<h1 class="display mt-2 text-4xl">My SEF points</h1>

{#if form?.done}
	<p class="mt-6 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">
		{form.done}
	</p>
{/if}
{#if form?.error}<p class="field-error mt-6" role="alert">{form.error}</p>{/if}

<div class="mt-8 grid gap-10 xl:grid-cols-[1fr_24rem]">
	<div class="space-y-10">
		<!-- Balance -->
		<section class="rounded-xl bg-ink-900 p-6 text-ivory-100 sm:p-8">
			<div class="flex flex-wrap items-start justify-between gap-4">
				<div>
					<p class="eyebrow text-ivory-200/70">Total loyalty points</p>
					<p class="display mt-3 text-5xl text-brass-300 sm:text-6xl">
						{pts(s.balance)} <span class="text-3xl sm:text-4xl">PTS</span>
					</p>
				</div>
				<a
					href="/member/points/redeem"
					class="inline-flex items-center gap-2 rounded-md bg-brass-400 px-4 py-2.5 text-sm font-semibold text-ink-950 transition-colors hover:bg-brass-300"
				>
					<Gift class="size-4" /> Redeem
				</a>
			</div>

			{#if s.held}
				<p class="mt-3 text-sm text-ivory-200/70">
					{pts(s.held)} on hold for requests awaiting approval · {pts(s.available)} available
				</p>
			{/if}

			<p class="mt-6 text-sm text-ivory-200/80">
				{#if next}
					{pts(next.cost - s.available)} points to
					<strong class="text-ivory-50">{next.label}</strong>
				{:else}
					You can redeem any reward.
				{/if}
			</p>
			<div
				class="mt-3 h-2.5 overflow-hidden rounded-full bg-ivory-100/15"
				role="progressbar"
				aria-valuemin="0"
				aria-valuemax="100"
				aria-valuenow={Math.round(progress)}
				aria-label={next ? `Progress to ${next.label}` : 'All rewards unlocked'}
			>
				<div class="h-full rounded-full bg-brass-400" style="width: {progress}%"></div>
			</div>
			{#if !canRedeem}
				<p class="mt-3 text-xs text-ivory-200/60">
					Rewards start at {pts(rewards[0].cost)} points.
				</p>
			{/if}
		</section>

		<!-- Level -->
		<section class="rounded-lg border border-ink-900/10 bg-white p-5 sm:p-6">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div>
					<p class="text-sm text-stone-muted">Member level</p>
					<p class="mt-1 flex items-center gap-2">
						<span class="rounded-full px-3 py-1 text-sm font-semibold {levelTone[lv.level.key]}"
							>{lv.level.label} Member</span
						>
					</p>
					<p class="mt-2 text-sm text-stone-muted">{lv.level.about}</p>
				</div>
				<p class="text-right text-sm text-stone-muted">
					{pts(s.levelPoints)} points earned
				</p>
			</div>
			{#if lv.next}
				<p class="mt-4 text-sm">
					{pts(lv.toNext)} points to <strong>{lv.next.label}</strong>
				</p>
				<div
					class="mt-2 h-2 overflow-hidden rounded-full bg-ink-900/10"
					role="progressbar"
					aria-valuemin="0"
					aria-valuemax="100"
					aria-valuenow={Math.round(levelProgress)}
					aria-label="Progress to {lv.next.label}"
				>
					<div class="h-full rounded-full bg-brass-400" style="width: {levelProgress}%"></div>
				</div>
			{:else}
				<p class="mt-4 text-sm">You’re at the top level.</p>
			{/if}
		</section>

		<!-- Activity counts -->
		<section class="grid grid-cols-2 gap-4 2xl:grid-cols-4">
			{#each stats as st (st.label)}
				<div class="rounded-lg border border-ink-900/10 bg-white p-5">
					<p class="display text-3xl">{st.value}</p>
					<p class="mt-2 text-sm text-stone-muted">{st.label}</p>
				</div>
			{/each}
		</section>

		<!-- History -->
		<section class="rounded-lg border border-ink-900/10 bg-white">
			<div
				class="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink-900/10 px-5 py-4"
			>
				<h2 class="font-semibold">Points history</h2>
				<p class="text-sm text-emerald-700">Total earned: {pts(s.earned)} points</p>
			</div>
			{#if data.history.length}
				<table class="w-full text-sm">
					<thead class="text-left text-xs tracking-wide text-stone-muted uppercase">
						<tr>
							<th class="px-5 py-3 font-semibold">Activity</th>
							<th class="hidden px-5 py-3 font-semibold sm:table-cell">Date</th>
							<th class="px-5 py-3 text-right font-semibold">Points</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-ink-900/10">
						{#each data.history as h (h.id)}
							<tr>
								<td class="px-5 py-3">
									<p class="font-medium">{entryKinds[h.kind] ?? h.kind}</p>
									{#if h.note}<p class="text-xs text-stone-muted">{h.note}</p>{/if}
									<p class="text-xs text-stone-muted sm:hidden">{eventShortDate(h.occurredAt)}</p>
								</td>
								<td class="hidden px-5 py-3 text-stone-muted sm:table-cell"
									>{eventShortDate(h.occurredAt)}</td
								>
								<td
									class="px-5 py-3 text-right font-semibold tabular-nums {h.points > 0
										? 'text-emerald-700'
										: 'text-laterite-500'}">{h.points > 0 ? '+' : '−'}{pts(Math.abs(h.points))}</td
								>
							</tr>
						{/each}
					</tbody>
				</table>
				<div class="px-5 pb-4"><Pagination pager={data.pager} /></div>
			{:else}
				<p class="px-5 py-6 text-sm text-stone-muted">
					No points yet. The secretariat adds points for meetings, retreats, intercity meetings,
					sports meetups, group discussions and more — see “How points work”.
				</p>
			{/if}
		</section>
	</div>

	<aside class="space-y-6">
		<section class="rounded-lg border border-ink-900/10 bg-white">
			<h2 class="border-b border-ink-900/10 px-5 py-4 font-semibold">My redemption requests</h2>
			{#if data.requests.length}
				<ul class="divide-y divide-ink-900/10">
					{#each [...pending, ...answered] as r (r.id)}
						<li class="px-5 py-4">
							<div class="flex items-start justify-between gap-3">
								<div class="min-w-0">
									<p class="font-medium">{r.rewardLabel}</p>
									<p class="text-xs text-stone-muted">
										{pts(r.cost)} points · asked {eventShortDate(r.createdAt)}
									</p>
								</div>
								<span
									class="shrink-0 rounded-full px-2 py-0.5 text-[0.7rem] font-semibold {tones[
										r.status
									]}"
									>{redemptionStatus[r.status as keyof typeof redemptionStatus] ?? r.status}</span
								>
							</div>
							{#if r.note}<p class="mt-2 text-sm">“{r.note}”</p>{/if}
							{#if r.adminNote}
								<p class="mt-2 text-sm text-stone-muted">Secretariat: {r.adminNote}</p>
							{/if}
							{#if r.status === 'pending'}
								<form method="POST" action="?/cancel" use:enhance class="mt-2">
									<input type="hidden" name="id" value={r.id} />
									<button class="text-xs font-semibold text-laterite-500 hover:underline"
										>Withdraw request</button
									>
								</form>
							{/if}
						</li>
					{/each}
				</ul>
			{:else}
				<p class="px-5 py-6 text-sm text-stone-muted">
					When you redeem points, your requests show here until the secretariat approves them.
				</p>
			{/if}
		</section>

		<section class="rounded-lg border border-ink-900/10 bg-white px-5 py-4 text-sm">
			<h2 class="font-semibold">How points work</h2>
			<ul class="mt-2 space-y-1 text-stone-muted">
				<li>The secretariat adds your points after each activity.</li>
				<li>A redemption holds the points until it’s approved; they come off only then.</li>
			</ul>
			<p class="mt-4 text-xs font-semibold tracking-wide text-stone-muted uppercase">Earn</p>
			<ul class="mt-1 space-y-1">
				{#each standardActivities as k (k)}
					<li class="flex justify-between gap-3">
						<span>{activities[k].label}</span><span class="text-stone-muted tabular-nums"
							>+{pts(data.activityPoints[k])}</span
						>
					</li>
				{/each}
			</ul>
			<p class="mt-4 text-xs font-semibold tracking-wide text-stone-muted uppercase">Levels</p>
			<ul class="mt-1 space-y-1">
				{#each levels as l (l.key)}
					<li class="flex justify-between gap-3">
						<span>{l.label}</span><span class="text-stone-muted tabular-nums">{levelRange(l)}</span>
					</li>
				{/each}
			</ul>
			<p class="mt-2 text-xs text-stone-muted">
				Levels go by the points you’ve earned in all, so redeeming doesn’t lower your level.
			</p>
		</section>
	</aside>
</div>
