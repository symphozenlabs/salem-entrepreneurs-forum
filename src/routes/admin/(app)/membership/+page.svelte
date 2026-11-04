<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';
	import { REFERRAL_PERCENT, rupees } from '#lib/content.ts';

	let { data, form }: PageProps = $props();
	let busy = $state<'fee' | 'payment' | null>(null);

	const feeForm = $derived(form?.fee);
	const payForm = $derived(form?.payment);
	const feeValues = $derived(feeForm && 'values' in feeForm ? feeForm.values : undefined);

	// Seeded from the saved settings (or what was just submitted); edited freely after that.
	let fee = $state(untrack(() => feeValues?.fee ?? String(data.membership.fee)));
	let period = $state(untrack(() => feeValues?.period ?? data.membership.period));

	const feeNumber = $derived(Number(fee.replace(/[₹,\s]/g, '')));
	const valid = $derived(Number.isInteger(feeNumber) && feeNumber >= 0);

	const submit = (which: 'fee' | 'payment') => () => {
		busy = which;
		return async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) => {
			await update({ reset: false });
			busy = null;
		};
	};
</script>

<p class="eyebrow text-brass-600">Membership & payment</p>
<h1 class="display mt-2 text-4xl">Fee, benefits and how to pay</h1>
<p class="mt-2 text-sm text-stone-muted">
	Shown on the home page’s membership card and the application page. The referral reward in
	“Privileges” is worked out from the fee ({REFERRAL_PERCENT}%).
</p>

<form
	method="POST"
	action="?/fee"
	use:enhance={submit('fee')}
	class="mt-8 grid gap-8 xl:grid-cols-[1fr_22rem]"
>
	<div class="space-y-6 rounded-lg border border-ink-900/10 bg-white p-5 sm:p-7">
		<h2 class="font-semibold">Fee & benefits</h2>
		<div class="grid gap-6 sm:grid-cols-2">
			<label class="block">
				<span class="field-label">Annual fee (₹) *</span>
				<input name="fee" inputmode="numeric" required bind:value={fee} class="field-input" />
			</label>
			<label class="block">
				<span class="field-label">Period *</span>
				<input name="period" required bind:value={period} class="field-input" />
				<span class="mt-1.5 block text-xs text-stone-muted"
					>Also sets how long approvals and renewals last.</span
				>
			</label>
		</div>
		<label class="block">
			<span class="field-label"
				>What’s included * <span class="font-normal text-stone-muted">— one per line</span></span
			>
			<textarea name="includes" rows="7" required class="field-input"
				>{feeValues?.includes ?? data.membership.includes.join('\n')}</textarea
			>
		</label>
		<label class="block">
			<span class="field-label">Note under the button</span>
			<input name="note" value={feeValues?.note ?? data.membership.note} class="field-input" />
		</label>
		{#if feeForm && 'error' in feeForm}<p class="field-error" role="alert">{feeForm.error}</p>{/if}
		{#if feeForm && 'saved' in feeForm}<p class="text-sm text-emerald-800" role="status">
				Saved — the website shows the new details now.
			</p>{/if}
		<button disabled={busy === 'fee'} class="btn-primary"
			>{busy === 'fee' ? 'Saving…' : 'Save fee & benefits'}</button
		>
	</div>

	<aside class="h-fit rounded-lg bg-ink-950 p-6 text-ivory-100">
		<p class="eyebrow text-brass-300">Preview</p>
		<p class="mt-5 flex items-baseline gap-2">
			<span class="display text-brass-gradient text-5xl">{valid ? rupees(feeNumber) : '—'}</span>
			<span class="text-sm text-ivory-200/60">/ {period}</span>
		</p>
		<p class="mt-6 border-t border-ivory-100/10 pt-4 text-sm text-ivory-200/70">
			Referral reward:
			<span class="text-ivory-50"
				>{valid ? rupees(Math.round((feeNumber * REFERRAL_PERCENT) / 100)) : '—'}</span
			>
			({REFERRAL_PERCENT}%)
		</p>
	</aside>
</form>

<form
	method="POST"
	action="?/payment"
	use:enhance={submit('payment')}
	class="mt-8 grid gap-8 xl:grid-cols-[1fr_22rem]"
>
	<div class="space-y-6 rounded-lg border border-ink-900/10 bg-white p-5 sm:p-7">
		<h2 class="font-semibold">UPI payment details</h2>
		<div class="grid gap-6 sm:grid-cols-2">
			<label class="block">
				<span class="field-label">UPI ID</span>
				<input
					name="upiId"
					value={data.payment.upiId}
					placeholder="salemforum@okaxis"
					class="field-input font-mono"
				/>
			</label>
			<label class="block">
				<span class="field-label">Payee name</span>
				<input
					name="payeeName"
					value={data.payment.payeeName}
					placeholder="Salem Entrepreneurs Forum"
					class="field-input"
				/>
				<span class="mt-1.5 block text-xs text-stone-muted"
					>As it appears in the payer’s UPI app.</span
				>
			</label>
		</div>
		<p class="text-sm text-stone-muted">
			The QR code is made from this UPI ID with the membership fee filled in, so it always matches.
			On phones, a <strong>Pay now with Google Pay</strong> button opens GPay with everything filled in.
		</p>
		{#if payForm && 'error' in payForm}<p class="field-error" role="alert">{payForm.error}</p>{/if}
		{#if payForm && 'saved' in payForm}<p class="text-sm text-emerald-800" role="status">
				Saved — the website shows the new payment details now.
			</p>{/if}
		<button disabled={busy === 'payment'} class="btn-primary"
			>{busy === 'payment' ? 'Saving…' : 'Save payment details'}</button
		>
	</div>

	<aside class="h-fit rounded-lg border border-ink-900/10 bg-white p-6">
		<p class="eyebrow text-brass-600">QR code</p>
		<div
			class="mt-4 grid aspect-square place-items-center rounded bg-ivory-100 p-3 [&_svg]:h-full [&_svg]:w-full"
		>
			{#if data.qrSvg}
				<!-- Generated server-side from the saved UPI ID. -->
				{@html data.qrSvg}
			{:else}
				<p class="px-6 text-center text-sm text-stone-muted">
					Add a UPI ID to generate the QR code.
				</p>
			{/if}
		</div>
		{#if data.qrSvg}
			<p class="mt-3 text-center text-xs text-stone-muted">
				Scan it with your phone to check: it should open {rupees(data.membership.fee)} to {data
					.payment.payeeName || data.payment.upiId}.
			</p>
		{/if}
	</aside>
</form>
