<script lang="ts">
	import type { PageProps } from './$types';
	import { page } from '$app/state';
	import { brand } from '#lib/content.ts';
	import {
		coverUrl,
		eventDate,
		eventTimeRange,
		isPast,
		paragraphs,
		reserveUrl,
		feeLabel,
		registrationState
	} from '#lib/events.ts';
	import { reveal } from '#lib/motion.ts';

	let { data }: PageProps = $props();
	const e = $derived(data.event);
	const cover = $derived(coverUrl(e));
	const past = $derived(isPast(e));
	const ownForm = $derived(e.registration === 'form');
	const state = $derived(registrationState(e, data.taken));
</script>

<svelte:head>
	<title>{e.title} — {brand.name}</title>
	<meta name="description" content={e.summary} />
	<meta property="og:title" content={e.title} />
	<meta property="og:description" content={e.summary} />
	{#if cover}<meta property="og:image" content={new URL(cover, page.url.origin).href} />{/if}
</svelte:head>

{#if data.admin && !e.published}
	<div
		class="fixed inset-x-0 bottom-0 z-50 bg-laterite-500 px-6 py-3 text-center text-sm text-ivory-50"
	>
		Draft preview — only admins can see this page.
		<a href="/admin/events/{e.id}" class="ml-2 font-semibold underline">Edit event</a>
	</div>
{/if}

<section
	data-nav="dark"
	class="relative overflow-hidden bg-ink-950 pt-44 pb-20 text-ivory-100 sm:pt-52"
>
	{#if cover}
		<img src={cover} alt="" class="absolute inset-0 h-full w-full object-cover opacity-35" />
		<div class="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/70 to-ink-950/40"></div>
	{/if}
	<div class="relative mx-auto max-w-7xl px-6 sm:px-10">
		<a href="/events" class="eyebrow text-ivory-200/60 hover:text-brass-300">← All events</a>
		<p class="eyebrow mt-10 text-brass-300">{e.category}{past ? ' · Past event' : ''}</p>
		<h1 use:reveal class="display mt-6 max-w-4xl text-[clamp(2.75rem,7vw,6rem)]">{e.title}</h1>
		<p class="mt-6 max-w-2xl text-lg text-ivory-200/80">{e.summary}</p>
	</div>
</section>

{#snippet description()}
	<div class="space-y-6 text-lg leading-relaxed text-ink-800">
		{#each paragraphs(e.description) as p, i (i)}
			<p class="whitespace-pre-line">{p}</p>
		{:else}
			<p class="text-stone-muted">{e.summary}</p>
		{/each}
	</div>
{/snippet}

{#snippet details(wide: boolean)}
	<dl class="grid gap-x-10 gap-y-7 text-ink-900 {wide ? 'sm:grid-cols-2' : ''}">
		<div>
			<dt class="eyebrow text-stone-muted">When</dt>
			<dd class="mt-2">{eventDate(e.startsAt)}<br />{eventTimeRange(e.startsAt, e.endsAt)}</dd>
		</div>
		<div>
			<dt class="eyebrow text-stone-muted">Where</dt>
			<dd class="mt-2">
				{e.venue}
				{#if e.address}<br /><span class="whitespace-pre-line text-stone-muted">{e.address}</span
					>{/if}
				{#if e.mapUrl}
					<br /><a
						href={e.mapUrl}
						target="_blank"
						rel="noopener"
						class="text-sm font-semibold text-brass-600 hover:text-brass-500">Open in Maps →</a
					>
				{/if}
			</dd>
		</div>
		{#if e.price || ownForm}
			<div>
				<dt class="eyebrow text-stone-muted">Entry</dt>
				<dd class="mt-2">{e.price || feeLabel(e)}</dd>
			</div>
		{/if}
		{#if e.seats}
			<div>
				<dt class="eyebrow text-stone-muted">Seats</dt>
				<dd class="mt-2">
					{ownForm
						? `${Math.max(0, e.seats - data.taken)} of ${e.seats} left`
						: `Limited to ${e.seats}`}
				</dd>
			</div>
		{/if}
	</dl>
	{#if ownForm && state !== 'open'}
		<p
			class="mt-10 rounded-full bg-ink-900/5 px-8 py-4 text-center text-sm font-semibold text-stone-muted sm:max-w-sm"
		>
			{state === 'full' ? 'Fully booked' : past ? 'This event has ended' : 'Registration closed'}
		</p>
	{:else if !past}
		<a
			href={reserveUrl(e)}
			target={ownForm ? undefined : '_blank'}
			rel={ownForm ? undefined : 'noopener'}
			class="mt-10 block rounded-full bg-ink-900 px-8 py-4 text-center text-sm font-semibold tracking-wide text-ivory-100 transition-colors hover:bg-ink-700 sm:max-w-sm"
			>{ownForm ? 'Register' : 'Reserve a seat'}</a
		>
		{#if e.registration === 'whatsapp'}
			<p class="mt-3 text-xs text-stone-muted sm:max-w-sm sm:text-center">
				Opens WhatsApp with the secretariat.
			</p>
		{/if}
	{/if}
{/snippet}

<section data-nav="light" class="bg-ivory-50 py-16 sm:py-24">
	{#if cover}
		<!-- Poster on one side, everything to read and do on the other. -->
		<div
			class="mx-auto grid max-w-7xl items-start gap-12 px-6 sm:px-10 lg:grid-cols-[5fr_7fr] lg:gap-16"
		>
			<div class="space-y-10 border-t border-ink-900/15 pt-8">
				{@render description()}
				{@render details(true)}
			</div>
			<img
				src={cover}
				alt="{e.title} cover"
				class="mx-auto h-auto max-h-[calc(100svh-8rem)] w-auto max-w-full rounded-[2px] shadow-xl shadow-ink-950/10 lg:sticky lg:top-28 lg:order-first lg:mr-0"
			/>
		</div>
	{:else}
		<div class="mx-auto grid max-w-7xl gap-16 px-6 sm:px-10 lg:grid-cols-[7fr_4fr]">
			{@render description()}
			<aside class="h-fit border-t border-ink-900/15 pt-8 lg:sticky lg:top-28">
				{@render details(false)}
			</aside>
		</div>
	{/if}
</section>
