<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';
	import { rupees } from '#lib/content.ts';
	import { eventShortDate } from '#lib/events.ts';
	import { statusLabel } from '#lib/membership.ts';
	import { shrinkImageInput } from '#lib/image.ts';
	import PaymentPanel from '#lib/components/PaymentPanel.svelte';

	let { data, form }: PageProps = $props();
	let busy = $state(false);

	const pendingRenewal = $derived(
		data.payments.some((p) => p.purpose === 'renewal' && p.status === 'pending')
	);
	const stateText = $derived(
		data.status.state === 'expired'
			? 'Expired'
			: data.status.state === 'expiring'
				? `Ends in ${data.status.days} day${data.status.days === 1 ? '' : 's'}`
				: 'Active'
	);
	const badge: Record<string, string> = {
		pending: 'bg-brass-200 text-brass-600',
		verified: 'bg-emerald-100 text-emerald-800',
		rejected: 'bg-laterite-500/10 text-laterite-500'
	};
</script>

<p class="eyebrow text-brass-600">Membership</p>
<h1 class="display mt-2 text-4xl">Your membership</h1>

<div class="mt-8 grid gap-8 xl:grid-cols-[1fr_22rem]">
	<div class="space-y-8">
		<section class="grid gap-4 sm:grid-cols-3">
			<div class="rounded-lg border border-ink-900/10 bg-white p-5">
				<p class="text-sm text-stone-muted">Status</p>
				<p
					class="display mt-1 text-2xl {data.status.state === 'active'
						? 'text-emerald-800'
						: 'text-laterite-500'}"
				>
					{stateText}
				</p>
			</div>
			<div class="rounded-lg border border-ink-900/10 bg-white p-5">
				<p class="text-sm text-stone-muted">Valid till</p>
				<p class="display mt-1 text-2xl">{eventShortDate(data.me.expiresAt)}</p>
			</div>
			<div class="rounded-lg border border-ink-900/10 bg-white p-5">
				<p class="text-sm text-stone-muted">Member number</p>
				<p class="display mt-1 text-2xl">{data.me.memberNumber}</p>
			</div>
		</section>

		<section class="rounded-lg border border-ink-900/10 bg-white p-5 sm:p-7">
			<h2 class="font-semibold">Renew</h2>
			{#if form?.ok || pendingRenewal}
				<p class="mt-3 text-sm text-ink-800">
					Your renewal payment is with the secretariat for verification. Your membership is extended
					once it’s confirmed — you’ll get an email.
				</p>
			{:else}
				<p class="mt-2 text-sm text-stone-muted">
					Pay {rupees(data.membership.fee)} by UPI, then enter the transaction ID. Renewing early adds
					a full {data.membership.period} to your current end date.
				</p>
				<form
					method="POST"
					action="?/renew"
					enctype="multipart/form-data"
					use:enhance={() => {
						busy = true;
						return async ({ update }) => {
							await update({ reset: false });
							busy = false;
						};
					}}
					class="mt-6 grid gap-6 sm:grid-cols-2"
				>
					<label class="block">
						<span class="field-label">UPI transaction ID (UTR) *</span>
						<input
							name="utr"
							required
							autocomplete="off"
							value={form?.utr ?? ''}
							class="field-input font-mono"
							placeholder="e.g. 412345678901"
						/>
					</label>
					<label class="block">
						<span class="field-label"
							>Screenshot <span class="font-normal text-stone-muted">(optional)</span></span
						>
						<input
							name="proof"
							type="file"
							accept="image/jpeg,image/png,image/webp"
							onchange={(e) => shrinkImageInput(e.currentTarget, 1400)}
							class="mt-1.5 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-ink-900 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-ivory-50"
						/>
					</label>
					{#if form?.error}<p class="field-error sm:col-span-2" role="alert">{form.error}</p>{/if}
					<div class="sm:col-span-2">
						<button disabled={busy} class="btn-primary"
							>{busy ? 'Submitting…' : 'Submit renewal'}</button
						>
					</div>
				</form>
			{/if}
		</section>

		<section class="rounded-lg border border-ink-900/10 bg-white">
			<h2 class="border-b border-ink-900/10 px-5 py-4 font-semibold">Payment history</h2>
			{#if data.payments.length}
				<ul class="divide-y divide-ink-900/10">
					{#each data.payments as p (p.id)}
						<li class="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm">
							<div>
								<p class="font-medium">
									{p.purpose === 'joining' ? 'Joining fee' : 'Renewal'} · {rupees(p.amount)}
								</p>
								<p class="text-stone-muted">
									{eventShortDate(p.createdAt)} · UTR <span class="font-mono">{p.utr}</span>
								</p>
								{#if p.status === 'rejected' && p.note}<p class="mt-1 text-laterite-500">
										“{p.note}”
									</p>{/if}
							</div>
							<span class="rounded-full px-2.5 py-0.5 text-xs font-semibold {badge[p.status]}"
								>{statusLabel[p.status] ?? p.status}</span
							>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="px-5 py-6 text-sm text-stone-muted">No payments yet.</p>
			{/if}
		</section>
	</div>

	<aside class="h-fit">
		<PaymentPanel
			payment={data.payment}
			amount={data.membership.fee}
			period={data.membership.period}
			note={data.note}
			qrSvg={data.qrSvg}
		/>
	</aside>
</div>
