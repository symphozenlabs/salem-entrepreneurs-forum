<script lang="ts">
	import { scrollIntoViewTop } from '#lib/motion.ts';
	import type { PageProps } from './$types';
	import { activeForum } from '#lib/forum.svelte.ts';
	import { eventDate, eventTimeRange } from '#lib/events.ts';
	import RegistrationForm from '#lib/components/RegistrationForm.svelte';

	let { data, form }: PageProps = $props();
	const brand = $derived(activeForum().brand);
	let section: HTMLElement;

	const e = $derived(data.event);
	const values = $derived(
		(form && 'values' in form ? form.values : {}) as Record<string, string | string[]>
	);
	const errors = $derived((form && 'errors' in form ? form.errors : {}) as Record<string, string>);
	const closedText = {
		past: 'This event has already started.',
		closed: 'Registration for this event has closed.',
		full: 'This event is fully booked.'
	};
</script>

<svelte:head>
	<title>Register — {e.title} — {brand.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section data-nav="dark" class="bg-ink-950 pt-40 pb-14 text-ivory-100 sm:pt-48">
	<div class="mx-auto max-w-7xl px-6 sm:px-10">
		<a href="/events/{e.slug}" class="eyebrow text-ivory-200/60 hover:text-brass-300"
			>← Event details</a
		>
		<p class="eyebrow mt-8 text-brass-300">Register</p>
		<h1 class="display mt-4 max-w-4xl text-[clamp(2.5rem,6vw,5rem)]">{e.title}</h1>
		<p class="mt-5 text-ivory-200/75">
			{eventDate(e.startsAt)} · {eventTimeRange(e.startsAt, e.endsAt)} · {e.venue}
		</p>
	</div>
</section>

<section bind:this={section} data-nav="light" class="bg-ivory-50 py-16 sm:py-24">
	<div class="mx-auto max-w-7xl px-6 sm:px-10">
		{#if form && 'ok' in form && form.ok}
			<div class="max-w-xl">
				<p class="eyebrow text-brass-600">
					{form.confirmed ? 'You’re in' : 'Registration received'}
				</p>
				<h2 class="display mt-5 text-5xl text-ink-900">Thank you.</h2>
				<p class="mt-5 text-lg text-stone-muted">
					{#if form.confirmed}
						Your seat is confirmed. A confirmation has been emailed to you.
					{:else}
						We’ll confirm your seat once the secretariat verifies your payment — usually within a
						day.
					{/if}
				</p>
				{#if form.code}
					<p class="mt-8 inline-block rounded-md bg-white px-5 py-4 ring-1 ring-ink-900/10">
						<span class="block text-xs tracking-wide text-stone-muted uppercase"
							>Your reference</span
						>
						<span class="font-mono text-2xl tracking-widest">{form.code}</span>
					</p>
				{/if}
				<div class="mt-10">
					<a
						href="/events"
						class="rounded-full bg-ink-900 px-8 py-4 text-sm font-semibold text-ivory-100 hover:bg-ink-700"
						>More events</a
					>
				</div>
			</div>
		{:else if data.state !== 'open'}
			<p class="display text-4xl text-ink-900">
				{closedText[data.state as keyof typeof closedText] ?? 'Registration isn’t open.'}
			</p>
			<a href="/events" class="mt-8 inline-block text-sm font-semibold text-brass-600"
				>See other events →</a
			>
		{:else}
			<RegistrationForm
				event={e}
				fields={data.fields}
				amount={data.amount}
				isMember={data.isMember}
				prefill={data.prefill}
				seatsLeft={data.seatsLeft}
				payment={data.payment}
				note={data.note}
				qrSvg={data.qrSvg}
				{values}
				{errors}
				onsuccess={() => scrollIntoViewTop(section)}
			/>
		{/if}
	</div>
</section>
