<script lang="ts">
	import type { PageProps } from './$types';
	import ScrollStory from '#lib/components/ScrollStory.svelte';
	import Stats from '#lib/components/home/Stats.svelte';
	import Industries from '#lib/components/home/Industries.svelte';
	import Reasons from '#lib/components/home/Reasons.svelte';
	import Manifesto from '#lib/components/home/Manifesto.svelte';
	import Events from '#lib/components/home/Events.svelte';
	import Privileges from '#lib/components/home/Privileges.svelte';
	import Membership from '#lib/components/home/Membership.svelte';
	import Contact from '#lib/components/home/Contact.svelte';

	let { data, form }: PageProps = $props();
</script>

<div data-nav="dark"><ScrollStory /></div>
<Stats />
<Industries />
<Reasons />
<Manifesto />
{#if data.events.length}
	<Events events={data.events} />
{/if}
<Privileges />
<Membership />
<Contact {form} />
