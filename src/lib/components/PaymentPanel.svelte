<script lang="ts">
	import { onMount } from 'svelte';
	import { rupees, contact } from '#lib/content.ts';
	import { gpayLinks, upiLink, type PaymentInfo } from '#lib/membership.ts';

	type Props = {
		payment: PaymentInfo;
		amount: number;
		note: string;
		period?: string;
		/** SVG QR of the payment request, generated on the server from the UPI ID. */
		qrSvg: string | null;
	};
	let { payment, amount, note, period, qrSvg }: Props = $props();

	const gpay = $derived(gpayLinks(payment, amount, note));
	const anyApp = $derived(upiLink(payment, amount, note));
	let copied = $state(false);
	// Pay buttons only make sense on a phone; on a computer people scan the QR.
	let platform = $state<'android' | 'ios' | 'desktop'>('desktop');

	onMount(() => {
		const ua = navigator.userAgent;
		platform = /android/i.test(ua)
			? 'android'
			: /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
				? 'ios'
				: 'desktop';
	});

	async function copy() {
		try {
			await navigator.clipboard.writeText(payment.upiId);
			copied = true;
			setTimeout(() => (copied = false), 1800);
		} catch {
			/* clipboard blocked — the ID is visible to copy by hand */
		}
	}
</script>

<div
	class="rounded-[2px] bg-gradient-to-b from-ink-800 to-ink-900 p-7 text-ivory-100 ring-1 ring-brass-400/30"
>
	<p class="eyebrow text-brass-300">Pay by UPI</p>
	<p class="mt-4 flex items-baseline gap-2">
		<span class="display text-brass-gradient text-5xl">{rupees(amount)}</span>
		{#if period}<span class="text-sm text-ivory-200/60">/ {period}</span>{/if}
	</p>

	{#if payment.upiId}
		{#if gpay && platform !== 'desktop'}
			<a
				href={platform === 'android' ? gpay.android : gpay.ios}
				class="mt-6 flex items-center justify-center gap-2 rounded-full bg-brass-400 py-4 text-sm font-semibold text-ink-950 transition-colors hover:bg-brass-300"
			>
				Pay now with Google Pay
			</a>
			{#if anyApp}
				<a href={anyApp} class="mt-3 block text-center text-xs text-ivory-200/70 underline">
					Use PhonePe, Paytm or another UPI app
				</a>
			{/if}
		{/if}

		{#if qrSvg}
			<div
				class="mt-6 rounded bg-white p-3 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:w-full [&_svg]:max-w-56"
			>
				<!-- Generated server-side from the admin's UPI ID; contains no user input. -->
				{@html qrSvg}
			</div>
			<p class="mt-2 text-center text-xs text-ivory-200/60">
				{platform === 'desktop' ? 'Scan with your phone’s UPI app' : 'Or scan from another phone'} —
				{rupees(amount)} is filled in
			</p>
		{/if}

		<div
			class="mt-5 flex items-center justify-between gap-3 rounded border border-ivory-100/15 px-4 py-3"
		>
			<div class="min-w-0">
				<p class="text-[0.7rem] tracking-wide text-ivory-200/50 uppercase">UPI ID</p>
				<p class="truncate font-mono text-sm">{payment.upiId}</p>
				{#if payment.payeeName}<p class="text-xs text-ivory-200/60">{payment.payeeName}</p>{/if}
			</div>
			<button
				type="button"
				onclick={copy}
				class="shrink-0 text-xs font-semibold text-brass-300 hover:text-brass-200"
			>
				{copied ? 'Copied' : 'Copy'}
			</button>
		</div>
		<p class="mt-5 text-xs leading-relaxed text-ivory-200/60">
			After paying, copy the <strong class="text-ivory-100">UPI transaction ID (UTR)</strong> from the
			payment receipt and enter it in the form.
		</p>
	{:else}
		<p class="mt-6 text-sm text-ivory-200/70">
			Payment details are being updated. Please
			<a href={contact.whatsapp} target="_blank" rel="noopener" class="text-brass-300 underline"
				>WhatsApp the secretariat</a
			>
			for the UPI ID.
		</p>
	{/if}
</div>
