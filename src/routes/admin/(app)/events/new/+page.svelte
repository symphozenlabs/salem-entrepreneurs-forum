<script lang="ts">
	import type { PageProps } from './$types';
	import EventForm from '#lib/components/admin/EventForm.svelte';

	let { form }: PageProps = $props();
</script>

<a href="/admin/events" class="text-sm text-stone-muted hover:text-ink-900">← All events</a>
<h1 class="display mt-3 text-4xl">New event</h1>

<EventForm
	values={form?.values ?? { category: 'Conclave' }}
	errors={form?.errors}
	submitLabel="Create event"
/>
