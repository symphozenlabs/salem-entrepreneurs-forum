<script lang="ts">
	import CoverImage from '#lib/components/CoverImage.svelte';
	import {
		coverUrl,
		eventDay,
		eventMonth,
		eventTimeRange,
		isPast,
		reserveUrl,
		feeLabel,
		registrationState,
		type PublicEvent
	} from '#lib/events.ts';

	let { event: e }: { event: PublicEvent } = $props();

	const cover = $derived(coverUrl(e));
	const past = $derived(isPast(e));
	const closed = $derived(
		e.registration === 'form' && registrationState(e, e.taken) !== 'open'
			? registrationState(e, e.taken) === 'full'
				? 'Fully booked'
				: 'Registration closed'
			: null
	);
	const weekday = $derived(
		new Intl.DateTimeFormat('en-IN', { weekday: 'short', timeZone: 'Asia/Kolkata' }).format(
			e.startsAt
		)
	);
</script>

<article
	class="group relative grid gap-6 border-t border-ink-900/10 py-10 sm:grid-cols-[7rem_1fr] lg:grid-cols-[8rem_1fr_16rem] lg:items-center lg:gap-10"
>
	<div class="flex items-baseline gap-3 sm:block">
		<p class="display text-6xl text-ink-900 sm:text-7xl">{eventDay(e.startsAt)}</p>
		<p class="eyebrow mt-2 text-brass-600">{eventMonth(e.startsAt)} · {weekday}</p>
	</div>

	<div>
		<p class="eyebrow text-stone-muted">{e.category}</p>
		<h3 class="display mt-3 text-3xl text-ink-900 sm:text-4xl">
			<a href="/events/{e.slug}" class="after:absolute after:inset-0">{e.title}</a>
		</h3>
		<p class="mt-3 text-sm text-ink-700">
			{eventTimeRange(e.startsAt, e.endsAt)} · {e.venue}{e.price
				? ` · ${e.price}`
				: e.registration === 'form'
					? ` · ${feeLabel(e)}`
					: ''}
		</p>
		<p class="mt-4 max-w-xl text-stone-muted">{e.summary}</p>
		{#if !past}
			<div class="relative z-10 mt-6 flex flex-wrap items-center gap-5">
				{#if closed}
					<span
						class="rounded-full bg-ink-900/5 px-6 py-3 text-xs font-semibold tracking-wide text-stone-muted"
						>{closed}</span
					>
				{:else}
					<a
						href={reserveUrl(e)}
						target={e.registration === 'form' ? undefined : '_blank'}
						rel={e.registration === 'form' ? undefined : 'noopener'}
						class="rounded-full bg-ink-900 px-6 py-3 text-xs font-semibold tracking-wide text-ivory-100 transition-colors hover:bg-ink-700"
						>{e.registration === 'form' ? 'Register' : 'Reserve a seat'}</a
					>
				{/if}
				<a
					href="/events/{e.slug}"
					class="text-xs font-semibold tracking-wide text-ink-900 hover:text-brass-600">Details →</a
				>
			</div>
		{/if}
	</div>

	<div
		class="aspect-[4/3] overflow-hidden rounded-[2px] bg-gradient-to-br from-ink-800 via-ink-700 to-brass-600 max-lg:hidden"
	>
		{#if cover}
			<CoverImage
				src={cover}
				loading="lazy"
				class="h-full w-full"
				imgClass="transition-transform duration-1000 ease-out-expo group-hover:scale-105"
			/>
		{:else}
			<div class="grid h-full place-items-center">
				<img src="/brand/logo-light.png" alt="" class="w-2/3 opacity-30" />
			</div>
		{/if}
	</div>
</article>
