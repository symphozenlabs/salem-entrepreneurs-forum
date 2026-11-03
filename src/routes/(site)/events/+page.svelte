<script lang="ts">
	import type { PageProps } from './$types';
	import { brand, contact } from '#lib/content.ts';
	import { eventShortDate } from '#lib/events.ts';
	import { reveal, rise } from '#lib/motion.ts';
	import EventRow from '#lib/components/EventRow.svelte';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Events — {brand.name}</title>
	<meta
		name="description"
		content="Conclaves, masterclasses and networking dinners of the {brand.name}."
	/>
</svelte:head>

<section data-nav="dark" class="bg-ink-950 pt-44 pb-24 text-ivory-100 sm:pt-52">
	<div class="mx-auto max-w-7xl px-6 sm:px-10">
		<p class="eyebrow text-brass-300">Events</p>
		<h1 use:reveal class="display mt-6 text-[clamp(3rem,8vw,7rem)]">The forum calendar.</h1>
		<p class="mt-6 max-w-lg text-lg text-ivory-200/70">
			Monthly conclaves, masterclasses and dinners — where Salem’s founders meet in person.
		</p>
	</div>
</section>

<section data-nav="light" class="bg-ivory-50 py-24 sm:py-32">
	<div class="mx-auto max-w-7xl px-6 sm:px-10">
		<h2 class="eyebrow text-brass-600">Upcoming</h2>
		{#if data.upcoming.length}
			<div use:rise={{ children: true }} class="mt-8 border-b border-ink-900/10">
				{#each data.upcoming as e (e.id)}
					<EventRow event={e} />
				{/each}
			</div>
		{:else}
			<div class="mt-8 border-t border-ink-900/10 pt-10">
				<p class="display text-4xl text-ink-900">The next gathering is being planned.</p>
				<p class="mt-4 max-w-lg text-stone-muted">
					{data.unavailable
						? 'The calendar can’t be loaded right now.'
						: 'New dates are announced here first.'} Ask the secretariat what’s coming up.
				</p>
				<a
					href={contact.whatsapp}
					target="_blank"
					rel="noopener"
					class="mt-8 inline-flex items-center gap-3 rounded-full border border-ink-900/15 px-6 py-3.5 text-sm font-semibold text-ink-900 transition-colors hover:border-brass-500 hover:text-brass-600"
				>
					<span class="size-2 rounded-full bg-[#25D366]"></span> Message us on WhatsApp
				</a>
			</div>
		{/if}

		{#if data.past.length}
			<h2 class="eyebrow mt-28 text-stone-muted">Past gatherings</h2>
			<ul class="mt-8 divide-y divide-ink-900/10 border-y border-ink-900/10">
				{#each data.past as e (e.id)}
					<li>
						<a
							href="/events/{e.slug}"
							class="grid gap-1 py-5 transition-colors hover:text-brass-600 sm:grid-cols-[10rem_1fr_auto] sm:items-baseline sm:gap-6"
						>
							<span class="text-sm text-stone-muted">{eventShortDate(e.startsAt)}</span>
							<span class="text-lg text-ink-900">{e.title}</span>
							<span class="text-sm text-stone-muted">{e.venue}</span>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</section>
