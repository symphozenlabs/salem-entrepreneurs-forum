<script lang="ts">
	import { tick } from 'svelte';
	import { enhance } from '$app/forms';
	import { BadgeCheck } from '@lucide/svelte';
	import { rupees } from '#lib/content.ts';
	import { shrinkImageInput } from '#lib/image.ts';
	import type { FormField } from '#lib/forms.ts';
	import type { PaymentInfo } from '#lib/membership.ts';
	import FormFields from '#lib/components/FormFields.svelte';
	import PaymentPanel from '#lib/components/PaymentPanel.svelte';

	type Props = {
		event: { slug: string; fee: number; memberFee: number | null };
		fields: FormField[];
		amount: number;
		isMember: boolean;
		prefill: { name: string; email: string; phone: string } | null;
		seatsLeft: number | null;
		payment: PaymentInfo | null;
		note: string;
		qrSvg: string | null;
		values: Record<string, string | string[]>;
		errors: Record<string, string>;
		/** Member portal: name, email and phone come from the profile and aren't asked for. */
		portal?: boolean;
		/** Called once the registration is saved, e.g. to scroll the thank-you into view. */
		onsuccess?: () => void;
	};
	let {
		event: e,
		fields,
		amount,
		isMember,
		prefill,
		seatsLeft,
		payment,
		note,
		qrSvg,
		values,
		errors,
		portal = false,
		onsuccess
	}: Props = $props();

	let busy = $state(false);
	let proofNote = $state('');
	let root: HTMLElement;

	const val = (k: 'name' | 'email' | 'phone') => String(values[k] ?? prefill?.[k] ?? '');
	const memberDeal = $derived(e.memberFee !== null && e.memberFee < e.fee);
</script>

<div bind:this={root} class="grid gap-14 lg:grid-cols-[7fr_4fr]">
	<form
		method="POST"
		enctype="multipart/form-data"
		use:enhance={() => {
			busy = true;
			return async ({ result, update }) => {
				await update({ reset: false });
				busy = false;
				await tick();
				if (result.type === 'success') onsuccess?.();
				else root?.querySelector('.field-error, [role=alert]')?.scrollIntoView({ block: 'center' });
			};
		}}
		class="grid content-start gap-x-8 gap-y-6 sm:grid-cols-2"
	>
		{#if portal && prefill}
			<div class="rounded-lg border border-ink-900/10 bg-white p-5 sm:col-span-2">
				<p class="text-xs tracking-wide text-stone-muted uppercase">Registering as</p>
				<p class="mt-1 flex flex-wrap items-center gap-2 font-semibold">
					{prefill.name}
					{#if isMember}
						<span
							class="inline-flex items-center gap-1 rounded-full bg-ink-900 px-2 py-0.5 text-[0.7rem] text-brass-200"
							><BadgeCheck class="size-3" /> Member</span
						>
					{/if}
				</p>
				<p class="mt-1 text-sm text-stone-muted">{prefill.email} · {prefill.phone}</p>
				<p class="mt-2 text-xs text-stone-muted">
					From your profile — <a href="/member/profile" class="text-brass-600 hover:underline"
						>edit it</a
					> if something’s changed.
				</p>
				{#if errors.name || errors.email || errors.phone}
					<p class="field-error">{errors.name ?? errors.email ?? errors.phone}</p>
				{/if}
			</div>
		{:else}
			<div class="sm:col-span-2">
				<h2 class="display text-3xl text-ink-900">Your details</h2>
				{#if isMember}<p class="mt-2 text-sm text-stone-muted">
						Filled in from your member profile.
					</p>{/if}
			</div>
			<label class="block">
				<span class="field-label">Full name *</span>
				<input name="name" required autocomplete="name" value={val('name')} class="field-input" />
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
		{/if}
		<FormFields {fields} {values} {errors} />

		{#if amount > 0}
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
					>Payment screenshot <span class="font-normal text-stone-muted">(optional)</span></span
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
		<input name="company_url" tabindex="-1" autocomplete="off" class="hidden" aria-hidden="true" />

		<div class="sm:col-span-2">
			{#if errors.form}<p class="field-error mb-4" role="alert">{errors.form}</p>{/if}
			<button
				disabled={busy}
				class="rounded-full bg-ink-900 px-10 py-4 text-sm font-semibold tracking-wide text-ivory-100 transition-colors hover:bg-ink-700 disabled:opacity-60"
			>
				{busy
					? 'Registering…'
					: amount > 0
						? 'Submit registration & payment'
						: 'Submit registration'}
			</button>
			{#if Object.keys(errors).length && !errors.form}<p class="field-error mt-3" role="alert">
					Please fix the highlighted fields.
				</p>{/if}
		</div>
	</form>

	<aside class="order-first h-fit space-y-4 lg:sticky lg:top-28 lg:order-none">
		{#if amount > 0 && payment}
			<PaymentPanel {payment} {amount} {note} {qrSvg} />
			{#if isMember && memberDeal}
				<p class="text-sm text-emerald-800">
					Member price applied (regular {rupees(e.fee)}).
				</p>
			{:else if memberDeal && portal}
				<p class="text-sm text-stone-muted">
					Members pay {rupees(e.memberFee!)} —
					<a href="/member/membership" class="font-semibold text-brass-600">renew your membership</a
					> to get the member price.
				</p>
			{:else if memberDeal}
				<p class="text-sm text-stone-muted">
					Members pay {rupees(e.memberFee!)} —
					<a href="/login?next=/events/{e.slug}/register" class="font-semibold text-brass-600"
						>sign in</a
					> first.
				</p>
			{/if}
		{:else}
			<div class="rounded-[2px] bg-ink-900 p-7 text-ivory-100">
				<p class="eyebrow text-brass-300">Entry</p>
				<p class="display text-brass-gradient mt-4 text-5xl">Free</p>
				{#if isMember && e.fee > 0}
					<p class="mt-2 text-sm text-emerald-300">Free for members (regular {rupees(e.fee)}).</p>
				{/if}
				<p class="mt-4 text-sm text-ivory-200/70">
					Your seat is confirmed as soon as you register.
				</p>
			</div>
		{/if}
		{#if seatsLeft !== null}
			<p class="text-sm text-stone-muted">
				{seatsLeft} seat{seatsLeft === 1 ? '' : 's'} left
			</p>
		{/if}
	</aside>
</div>
