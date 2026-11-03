<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';
	import { coverUrl, eventShortDate, eventTime, isPast } from '#lib/events.ts';

	let { data, form }: PageProps = $props();
	let confirming = $state<number | null>(null);

	const status = (e: (typeof data.events)[number]) =>
		!e.published ? 'Draft' : isPast(e) ? 'Past' : 'Live';
	const badge: Record<string, string> = {
		Live: 'bg-emerald-100 text-emerald-800',
		Draft: 'bg-ivory-200 text-ink-700',
		Past: 'bg-ink-900/5 text-stone-muted'
	};
</script>

<header class="flex flex-wrap items-end justify-between gap-4">
	<div>
		<p class="eyebrow text-brass-600">Events</p>
		<h1 class="display mt-2 text-4xl">All events</h1>
		<p class="mt-2 text-sm text-stone-muted">
			Live events appear on the home page (next three) and on the
			<a href="/events" target="_blank" class="text-brass-600">events page</a>. Drafts stay hidden.
		</p>
	</div>
	<a href="/admin/events/new" class="btn-primary">+ New event</a>
</header>

{#if form?.deleted}
	<p class="mt-6 rounded-md bg-ivory-200 px-4 py-3 text-sm" role="status">Event deleted.</p>
{/if}

{#if data.events.length}
	<ul class="mt-8 divide-y divide-ink-900/10 rounded-lg border border-ink-900/10 bg-white">
		{#each data.events as e (e.id)}
			{@const s = status(e)}
			{@const cover = coverUrl(e)}
			<li class="flex flex-wrap items-center gap-4 px-4 py-4 sm:flex-nowrap sm:px-5">
				<div
					class="size-14 shrink-0 overflow-hidden rounded bg-gradient-to-br from-ink-800 to-brass-600"
				>
					{#if cover}<img src={cover} alt="" class="h-full w-full object-cover" />{/if}
				</div>
				<div class="min-w-0 flex-1">
					<p class="flex flex-wrap items-center gap-2">
						<a href="/admin/events/{e.id}" class="font-medium hover:text-brass-600">{e.title}</a>
						<span class="rounded-full px-2 py-0.5 text-[0.7rem] font-semibold {badge[s]}">{s}</span>
					</p>
					<p class="mt-1 text-sm text-stone-muted">
						{eventShortDate(e.startsAt)}, {eventTime(e.startsAt)} · {e.venue} · {e.category}
					</p>
				</div>
				<div class="flex flex-wrap items-center gap-2">
					<a href="/admin/events/{e.id}" class="btn-quiet !px-3 !py-1.5">Edit</a>
					<a href="/events/{e.slug}" target="_blank" class="btn-quiet !px-3 !py-1.5"
						>{e.published ? 'View' : 'Preview'}</a
					>
					<form method="POST" use:enhance>
						<input type="hidden" name="id" value={e.id} />
						<button
							formaction={e.published ? '?/unpublish' : '?/publish'}
							class="btn-quiet !px-3 !py-1.5"
						>
							{e.published ? 'Unpublish' : 'Publish'}
						</button>
						<button formaction="?/duplicate" class="btn-quiet !px-3 !py-1.5">Duplicate</button>
					</form>
					{#if confirming === e.id}
						<form
							method="POST"
							action="?/delete"
							use:enhance={() =>
								async ({ update }) => {
									confirming = null;
									await update();
								}}
							class="flex gap-2"
						>
							<input type="hidden" name="id" value={e.id} />
							<button class="btn-danger !px-3 !py-1.5">Delete for good</button>
							<button
								type="button"
								onclick={() => (confirming = null)}
								class="btn-quiet !px-3 !py-1.5">Cancel</button
							>
						</form>
					{:else}
						<button
							onclick={() => (confirming = e.id)}
							class="btn-quiet !px-3 !py-1.5 hover:!border-laterite-500 hover:!text-laterite-500"
							>Delete</button
						>
					{/if}
				</div>
			</li>
		{/each}
	</ul>
{:else}
	<div
		class="mt-8 rounded-lg border border-dashed border-ink-900/20 bg-white px-6 py-14 text-center"
	>
		<p class="display text-2xl">No events yet.</p>
		<p class="mt-2 text-sm text-stone-muted">
			Create the first one — it can stay a draft until you publish it.
		</p>
		<a href="/admin/events/new" class="btn-primary mt-6">+ New event</a>
	</div>
{/if}
