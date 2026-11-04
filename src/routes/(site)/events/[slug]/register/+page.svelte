<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';
	import { brand, rupees } from '#lib/content.ts';
	import { eventDate, eventTimeRange } from '#lib/events.ts';
	import { shrinkImageInput } from '#lib/image.ts';
	import FormFields from '#lib/components/FormFields.svelte';
	import PaymentPanel from '#lib/components/PaymentPanel.svelte';

	let { data, form }: PageProps = $props();
	let busy = $state(false);
	let proofNote = $state('');

	const e = $derived(data.event);
	const values = $derived(
		(form && 'values' in form ? form.values : {}) as Record<string, string | string[]>
	);
	const errors = $derived((form && 'errors' in form ? form.errors : {}) as Record<string, string>);
	const val = (k: 'name' | 'email' | 'phone') => String(values[k] ?? data.prefill?.[k] ?? '');
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

<section data-nav="light" class="bg-ivory-50 py-16 sm:py-24">
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
			<div class="grid gap-14 lg:grid-cols-[7fr_4fr]">
				<form
					method="POST"
					enctype="multipart/form-data"
					use:enhance={() => {
						busy = true;
						return async ({ update }) => {
							await update({ reset: false });
							busy = false;
						};
					}}
					class="grid content-start gap-x-8 gap-y-6 sm:grid-cols-2"
				>
					<div class="sm:col-span-2">
						<h2 class="display text-3xl text-ink-900">Your details</h2>
						{#if data.isMember}<p class="mt-2 text-sm text-stone-muted">
								Filled in from your member profile.
							</p>{/if}
					</div>
					<label class="block">
						<span class="field-label">Full name *</span>
						<input
							name="name"
							required
							autocomplete="name"
							value={val('name')}
							class="field-input"
						/>
						{#if errors.name}<p class="field-error">{errors.name}</p>{/if}
					</label>
					<label class="block">
						<span class="field-label">Email *</span>
						<input
							name="email"
							type="email"
							required
							autocomplete="email"
							value={val('email')}
							class="field-input"
						/>
						{#if errors.email}<p class="field-error">{errors.email}</p>{/if}
					</label>
					<label class="block">
						<span class="field-label">Mobile / WhatsApp *</span>
						<input
							name="phone"
							type="tel"
							required
							autocomplete="tel"
							value={val('phone')}
							class="field-input"
						/>
						{#if errors.phone}<p class="field-error">{errors.phone}</p>{/if}
					</label>
					<FormFields fields={data.fields} {values} {errors} />

					{#if data.amount > 0}
						<h2 class="display mt-4 text-3xl text-ink-900 sm:col-span-2">Your payment</h2>
						<label class="block">
							<span class="field-label">UPI transaction ID (UTR) *</span>
							<input
								name="utr"
								required
								autocomplete="off"
								value={String(values.utr ?? '')}
								placeholder="e.g. 412345678901"
								class="field-input font-mono"
							/>
							{#if errors.utr}<p class="field-error">{errors.utr}</p>{:else}<p
									class="mt-1.5 text-xs text-stone-muted"
								>
									On the payment receipt in your UPI app
								</p>{/if}
						</label>
						<label class="block">
							<span class="field-label"
								>Payment screenshot <span class="font-normal text-stone-muted">(optional)</span
								></span
							>
							<input
								name="proof"
								type="file"
								accept="image/jpeg,image/png,image/webp"
								onchange={async (ev) =>
									(proofNote = (await shrinkImageInput(ev.currentTarget, 1400))?.note ?? '')}
								class="mt-1.5 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-ink-900 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-ivory-50"
							/>
							{#if errors.proof}<p class="field-error">{errors.proof}</p>{:else if proofNote}<p
									class="mt-1.5 text-xs text-stone-muted"
								>
									{proofNote}
								</p>{/if}
						</label>
					{/if}

					<!-- Honeypot: hidden from people, filled in by bots -->
					<input
						name="company_url"
						tabindex="-1"
						autocomplete="off"
						class="hidden"
						aria-hidden="true"
					/>

					<div class="sm:col-span-2">
						{#if errors.form}<p class="field-error mb-4" role="alert">{errors.form}</p>{/if}
						<button
							disabled={busy}
							class="rounded-full bg-ink-900 px-10 py-4 text-sm font-semibold tracking-wide text-ivory-100 transition-colors hover:bg-ink-700 disabled:opacity-60"
						>
							{busy ? 'Registering…' : 'Submit registration'}
						</button>
						{#if Object.keys(errors).length && !errors.form}<p
								class="field-error mt-3"
								role="alert"
							>
								Please fix the highlighted fields.
							</p>{/if}
					</div>
				</form>

				<aside class="order-first h-fit space-y-4 lg:sticky lg:top-28 lg:order-none">
					{#if data.amount > 0 && data.payment}
						<PaymentPanel
							payment={data.payment}
							amount={data.amount}
							note={data.note}
							qrSvg={data.qrSvg}
						/>
						{#if data.isMember && e.memberFee !== null && e.memberFee < e.fee}
							<p class="text-sm text-emerald-800">
								Member price applied (regular {rupees(e.fee)}).
							</p>
						{:else if e.memberFee !== null && e.memberFee < e.fee}
							<p class="text-sm text-stone-muted">
								Members pay {rupees(e.memberFee)} —
								<a href="/login?next=/events/{e.slug}/register" class="font-semibold text-brass-600"
									>sign in</a
								> first.
							</p>
						{/if}
					{:else}
						<div class="rounded-[2px] bg-ink-900 p-7 text-ivory-100">
							<p class="eyebrow text-brass-300">Entry</p>
							<p class="display text-brass-gradient mt-4 text-5xl">Free</p>
							<p class="mt-4 text-sm text-ivory-200/70">
								Your seat is confirmed as soon as you register.
							</p>
						</div>
					{/if}
					{#if data.seatsLeft !== null}
						<p class="text-sm text-stone-muted">
							{data.seatsLeft} seat{data.seatsLeft === 1 ? '' : 's'} left
						</p>
					{/if}
				</aside>
			</div>
		{/if}
	</div>
</section>
