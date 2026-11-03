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
		reserveUrl
	} from '#lib/events.ts';
	import { reveal } from '#lib/motion.ts';

	let { data }: PageProps = $props();
	const e = $derived(data.event);
	const cover = $derived(coverUrl(e));
	const past = $derived(isPast(e));
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

<section data-nav="light" class="bg-ivory-50 py-20 sm:py-28">
	<div class="mx-auto grid max-w-7xl gap-16 px-6 sm:px-10 lg:grid-cols-[7fr_4fr]">
		<div class="space-y-6 text-lg leading-relaxed text-ink-800">
			{#each paragraphs(e.description) as p, i (i)}
				<p class="whitespace-pre-line">{p}</p>
			{:else}
				<p class="text-stone-muted">{e.summary}</p>
			{/each}
		</div>

		<aside class="h-fit border-t border-ink-900/15 pt-8 lg:sticky lg:top-28">
			<dl class="space-y-7 text-ink-900">
				<div>
					<dt class="eyebrow text-stone-muted">When</dt>
					<dd class="mt-2">{eventDate(e.startsAt)}<br />{eventTimeRange(e.startsAt, e.endsAt)}</dd>
				</div>
				<div>
					<dt class="eyebrow text-stone-muted">Where</dt>
					<dd class="mt-2">
						{e.venue}
						{#if e.address}<br /><span class="whitespace-pre-line text-stone-muted"
								>{e.address}</span
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
				{#if e.price}
					<div>
						<dt class="eyebrow text-stone-muted">Entry</dt>
						<dd class="mt-2">{e.price}</dd>
					</div>
				{/if}
				{#if e.seats}
					<div>
						<dt class="eyebrow text-stone-muted">Seats</dt>
						<dd class="mt-2">Limited to {e.seats}</dd>
					</div>
				{/if}
			</dl>
			{#if !past}
				<a
					href={reserveUrl(e)}
					target="_blank"
					rel="noopener"
					class="mt-10 block rounded-full bg-ink-900 px-8 py-4 text-center text-sm font-semibold tracking-wide text-ivory-100 transition-colors hover:bg-ink-700"
					>Reserve a seat</a
				>
				{#if !e.registrationUrl}
					<p class="mt-3 text-center text-xs text-stone-muted">
						Opens WhatsApp with the secretariat.
					</p>
				{/if}
			{/if}
		</aside>
	</div>
</section>
