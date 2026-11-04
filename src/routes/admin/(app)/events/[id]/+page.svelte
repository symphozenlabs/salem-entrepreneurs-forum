<script lang="ts">
	import type { PageProps } from './$types';
	import { page } from '$app/state';
	import { coverUrl } from '#lib/events.ts';
	import EventForm from '#lib/components/admin/EventForm.svelte';

	let { data, form }: PageProps = $props();

	const notice = $derived(
		form?.saved
			? 'Saved.'
			: page.url.searchParams.has('created')
				? 'Event created.'
				: page.url.searchParams.has('copied')
					? 'Copy created as a draft — update the date and title, then publish.'
					: null
	);
</script>

<a href="/admin/events" class="text-sm text-stone-muted hover:text-ink-900">← All events</a>
<div class="mt-3 flex flex-wrap items-end justify-between gap-4">
	<h1 class="display text-4xl">{data.event.title}</h1>
	<div class="flex flex-wrap gap-2">
		{#if data.event.registration === 'form'}
			<a href="/admin/events/{data.event.id}/registrations" class="btn-primary">Registrations</a>
		{/if}
		<a href="/events/{data.event.slug}" target="_blank" class="btn-quiet">
			{data.event.published ? 'View on website' : 'Preview draft'} ↗
		</a>
	</div>
</div>
<p class="mt-2 text-sm text-stone-muted">Web address: /events/{data.event.slug}</p>

{#if notice && !form?.errors}
	<p class="mt-6 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">
		{notice}
	</p>
{/if}

{#key data.event.coverVersion}
	<EventForm
		values={form?.values ?? data.values}
		errors={form?.errors}
		cover={coverUrl(data.event)}
		submitLabel="Save changes"
	/>
{/key}
