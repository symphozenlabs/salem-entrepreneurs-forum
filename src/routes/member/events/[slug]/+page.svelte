<script lang="ts">
	import { CalendarDays, MapPin } from '@lucide/svelte';
	import type { PageProps } from './$types';
	import { rupees } from '#lib/content.ts';
	import { eventDate, eventTimeRange } from '#lib/events.ts';
	import RegistrationForm from '#lib/components/RegistrationForm.svelte';

	let { data, form }: PageProps = $props();
	let top: HTMLElement;

	const e = $derived(data.event);
	const values = $derived(
		(form && 'values' in form ? form.values : {}) as Record<string, string | string[]>
	);
	const errors = $derived((form && 'errors' in form ? form.errors : {}) as Record<string, string>);
	const closedText: Record<string, string> = {
		past: 'This event has already started.',
		closed: 'Registration for this event has closed.',
		full: 'This event is fully booked.'
	};
</script>

<div bind:this={top} class="scroll-mt-8">
	<a href="/member/events" class="text-sm text-stone-muted hover:text-ink-900">← Member events</a>
	<p class="eyebrow mt-6 text-brass-600">{e.category}</p>
	<h1 class="display mt-2 text-4xl">{e.title}</h1>
	<p class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-stone-muted">
		<span class="flex items-center gap-1.5"
			><CalendarDays class="size-4" />
			{eventDate(e.startsAt)} · {eventTimeRange(e.startsAt, e.endsAt)}</span
		>
		<span class="flex items-center gap-1.5"><MapPin class="size-4" /> {e.venue}</span>
		<a href="/events/{e.slug}" class="font-semibold text-brass-600 hover:underline"
			>Full event details</a
		>
	</p>
</div>

<div class="mt-10">
	{#if form && 'ok' in form && form.ok}
		<div class="max-w-xl rounded-lg border border-ink-900/10 bg-white p-6 sm:p-8">
			<p class="eyebrow text-brass-600">{form.confirmed ? 'You’re in' : 'Registration received'}</p>
			<h2 class="display mt-3 text-3xl">Thank you.</h2>
			<p class="mt-3 text-stone-muted">
				{#if form.confirmed}
					Your seat is confirmed. A confirmation has been emailed to you.
				{:else}
					We’ll confirm your seat once the secretariat verifies your payment — usually within a day.
					You’ll get an email, and the status shows on Member events.
				{/if}
			</p>
			{#if form.code}
				<p class="mt-6 inline-block rounded-md bg-ivory-100 px-5 py-4">
					<span class="block text-xs tracking-wide text-stone-muted uppercase">Your reference</span>
					<span class="font-mono text-2xl tracking-widest">{form.code}</span>
				</p>
			{/if}
			<div class="mt-6"><a href="/member/events" class="btn-primary">Back to member events</a></div>
		</div>
	{:else if data.mine}
		<div class="max-w-xl rounded-lg border border-ink-900/10 bg-white p-6 sm:p-8">
			<p class="eyebrow text-brass-600">Already registered</p>
			<p class="mt-3 text-ink-800">
				{#if data.mine.status === 'confirmed'}
					Your seat is confirmed.
				{:else}
					Your payment of {rupees(data.mine.amount)} is with the secretariat for verification.
				{/if}
				Reference <span class="font-mono font-semibold">{data.mine.code}</span>.
			</p>
			<div class="mt-6"><a href="/member/events" class="btn-quiet">Back to member events</a></div>
		</div>
	{:else if data.state !== 'open'}
		<p class="display text-3xl">{closedText[data.state] ?? 'Registration isn’t open.'}</p>
		<a href="/member/events" class="mt-6 inline-block text-sm font-semibold text-brass-600"
			>See other member events →</a
		>
	{:else}
		<RegistrationForm
			portal
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
			onsuccess={() => top.scrollIntoView({ behavior: 'smooth', block: 'start' })}
		/>
	{/if}
</div>
