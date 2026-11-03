<script lang="ts">
	import type { PublicEvent } from '#lib/events.ts';
	import { reveal, rise } from '#lib/motion.ts';
	import EventRow from '#lib/components/EventRow.svelte';

	let { events }: { events: PublicEvent[] } = $props();
</script>

<section id="events" data-nav="light" class="bg-ivory-50 py-32 sm:py-44">
	<div class="mx-auto max-w-7xl px-6 sm:px-10">
		<div class="flex flex-wrap items-end justify-between gap-8">
			<div>
				<p class="eyebrow text-brass-600">On the calendar</p>
				<h2 use:reveal class="display mt-6 text-[clamp(2.75rem,5vw,4.75rem)] text-ink-900">
					Upcoming gatherings.
				</h2>
			</div>
			<a
				href="/events"
				class="rounded-full border border-ink-900/15 px-6 py-3.5 text-sm font-semibold text-ink-900 transition-colors hover:border-brass-500 hover:text-brass-600"
				>All events</a
			>
		</div>
		<div use:rise={{ children: true }} class="mt-16 border-b border-ink-900/10">
			{#each events as e (e.id)}
				<EventRow event={e} />
			{/each}
		</div>
	</div>
</section>
