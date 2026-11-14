<script lang="ts">
	import { BadgeCheck, CalendarDays, MapPin } from '@lucide/svelte';
	import type { PageProps } from './$types';
	import { rupees } from '#lib/content.ts';
	import {
		coverUrl,
		eventDay,
		eventMonth,
		eventShortDate,
		eventTimeRange,
		isPast
	} from '#lib/events.ts';

	let { data }: PageProps = $props();

	const statusText: Record<string, string> = {
		pending: 'Payment being verified',
		confirmed: 'Seat confirmed',
		rejected: 'Not confirmed'
	};
	const badge: Record<string, string> = {
		pending: 'bg-brass-200 text-brass-600',
		confirmed: 'bg-emerald-100 text-emerald-800',
		rejected: 'bg-laterite-500/10 text-laterite-500'
	};
	const closedText: Record<string, string> = {
		past: 'Started',
		closed: 'Registration closed',
		full: 'Fully booked'
	};
	const price = (n: number) => (n ? rupees(n) : 'Free');
</script>

<p class="eyebrow text-brass-600">Events</p>
<h1 class="display mt-2 text-4xl">Member events</h1>
<p class="mt-2 max-w-2xl text-sm text-stone-muted">
	Upcoming forum events with a member price. Register and pay here — your seat is confirmed once the
	secretariat verifies the payment.
</p>

{#if !data.memberPrice}
	<p class="mt-6 rounded-md bg-laterite-500/10 px-4 py-3 text-sm text-laterite-500">
		Your membership has expired, so you’d pay the regular price.
		<a href="/member/membership" class="font-semibold underline">Renew</a> to get member prices.
	</p>
{/if}

{#if data.events.length}
	<ul class="mt-8 grid gap-5 xl:grid-cols-2">
		{#each data.events as e (e.id)}
			{@const cover = coverUrl(e)}
			{@const memberFee = e.memberFee ?? e.fee}
			<li class="flex flex-col overflow-hidden rounded-lg border border-ink-900/10 bg-white">
				{#if cover}
					<img src={cover} alt="" class="aspect-[16/7] w-full object-cover" loading="lazy" />
				{/if}
				<div class="flex flex-1 flex-col p-5 sm:p-6">
					<div class="flex gap-4">
						<div
							class="grid h-fit w-14 shrink-0 place-items-center rounded-md bg-ink-900 py-2 text-ivory-50"
						>
							<span class="display text-2xl leading-none">{eventDay(e.startsAt)}</span>
							<span class="mt-1 text-[0.7rem] tracking-wide text-brass-300 uppercase"
								>{eventMonth(e.startsAt)}</span
							>
						</div>
						<div class="min-w-0">
							<p class="text-xs font-semibold tracking-wide text-brass-600 uppercase">
								{e.category}
							</p>
							<h2 class="mt-1 text-lg leading-snug font-semibold">{e.title}</h2>
							<p class="mt-1 flex items-center gap-1.5 text-sm text-stone-muted">
								<CalendarDays class="size-3.5 shrink-0" />
								{eventShortDate(e.startsAt)} · {eventTimeRange(e.startsAt, e.endsAt)}
							</p>
							<p class="flex items-center gap-1.5 text-sm text-stone-muted">
								<MapPin class="size-3.5 shrink-0" />
								<span class="truncate">{e.venue}</span>
							</p>
						</div>
					</div>
					<p class="mt-4 line-clamp-2 text-sm text-ink-800">{e.summary}</p>

					<div
						class="mt-auto flex flex-wrap items-end justify-between gap-4 border-t border-ink-900/10 pt-4"
					>
						<div>
							<p class="flex items-center gap-1 text-xs font-semibold text-emerald-800">
								<BadgeCheck class="size-3.5" /> Member price
							</p>
							<p class="mt-0.5 flex items-baseline gap-2">
								<span class="display text-2xl">{price(memberFee)}</span>
								{#if e.fee > memberFee}
									<span class="text-sm text-stone-muted line-through">{rupees(e.fee)}</span>
								{/if}
							</p>
							{#if e.seatsLeft !== null && e.state === 'open'}
								<p class="text-xs text-stone-muted">
									{e.seatsLeft} seat{e.seatsLeft === 1 ? '' : 's'} left
								</p>
							{/if}
						</div>
						{#if e.mine}
							<div class="text-right">
								<span
									class="rounded-full px-2.5 py-0.5 text-xs font-semibold {badge[e.mine.status]}"
									>{statusText[e.mine.status]}</span
								>
								<p class="mt-1 text-xs text-stone-muted">
									Ref <span class="font-mono">{e.mine.code}</span>
								</p>
							</div>
						{:else if e.state === 'open'}
							<a href="/member/events/{e.slug}" class="btn-primary"
								>{(data.memberPrice ? memberFee : e.fee) ? 'Register & pay' : 'Register'}</a
							>
						{:else}
							<span class="text-sm font-semibold text-stone-muted">{closedText[e.state]}</span>
						{/if}
					</div>
				</div>
			</li>
		{/each}
	</ul>
{:else}
	<p
		class="mt-8 rounded-lg border border-dashed border-ink-900/20 bg-white px-6 py-12 text-center text-sm text-stone-muted"
	>
		No member events coming up right now. <a href="/events" class="font-semibold text-brass-600"
			>See all forum events</a
		>
	</p>
{/if}

{#if data.registrations.length}
	<section class="mt-12 rounded-lg border border-ink-900/10 bg-white">
		<h2 class="border-b border-ink-900/10 px-5 py-4 font-semibold">My registrations</h2>
		<ul class="divide-y divide-ink-900/10">
			{#each data.registrations as r (r.id)}
				<li class="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm">
					<div class="min-w-0">
						<p class="font-medium">{r.title}</p>
						<p class="text-stone-muted">
							{eventShortDate(r.startsAt)}{isPast(r) ? ' · over' : ''} · {price(r.amount)}
							{#if r.utr}· UTR <span class="font-mono">{r.utr}</span>{/if} · ref
							<span class="font-mono">{r.code}</span>
						</p>
						{#if r.status === 'rejected' && r.note}<p class="mt-1 text-laterite-500">
								“{r.note}”
							</p>{/if}
					</div>
					<span class="rounded-full px-2.5 py-0.5 text-xs font-semibold {badge[r.status]}"
						>{statusText[r.status] ?? r.status}</span
					>
				</li>
			{/each}
		</ul>
	</section>
{/if}
