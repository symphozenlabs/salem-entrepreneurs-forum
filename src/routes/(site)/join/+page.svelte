<script lang="ts">
	import { tick } from 'svelte';
	import { enhance } from '$app/forms';
	import { scrollIntoViewTop } from '#lib/motion.ts';
	import type { PageProps } from './$types';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { activeForum } from '#lib/forum.svelte.ts';
	const brand = $derived(activeForum().brand);
	import IndustryField from '#lib/components/IndustryField.svelte';
	import ReferrerField from '#lib/components/ReferrerField.svelte';
	import { shrinkImageInput } from '#lib/image.ts';
	import PaymentPanel from '#lib/components/PaymentPanel.svelte';
	import { hubs } from '#lib/network.ts';

	let { data, form }: PageProps = $props();
	let busy = $state(false);
	let photoNote = $state('');
	let photoPreview = $state<string | null>(null);
	let section: HTMLElement;

	const values = $derived((form?.values ?? {}) as Record<string, string>);
	const errors = $derived((form?.errors ?? {}) as Record<string, string>);

	const fields: {
		name: string;
		label: string;
		type?: string;
		autocomplete?: HTMLInputAttributes['autocomplete'];
		required?: boolean;
		placeholder?: string;
		hint?: string;
	}[] = [
		{ name: 'name', label: 'Full name', autocomplete: 'name', required: true },
		{
			name: 'email',
			label: 'Email',
			type: 'email',
			autocomplete: 'email',
			required: true,
			hint: 'Your login is sent here'
		},
		{ name: 'phone', label: 'Mobile / WhatsApp', type: 'tel', autocomplete: 'tel', required: true },
		{ name: 'business', label: 'Business name', autocomplete: 'organization', required: true },
		{
			name: 'designation',
			label: 'Your role',
			autocomplete: 'organization-title',
			placeholder: 'Founder, Managing Director…'
		},
		{ name: 'city', label: 'City', autocomplete: 'address-level2', placeholder: 'Salem' },
		{ name: 'website', label: 'Website', type: 'url', placeholder: 'https://' },
		{
			name: 'instagram',
			label: 'Instagram',
			required: true,
			placeholder: 'instagram.com/yourbusiness or @yourbusiness',
			hint: 'Your business or personal Instagram profile'
		}
	];
</script>

<svelte:head>
	<title>Apply for membership — {brand.name}</title>
	<meta
		name="description"
		content="Apply to join the {brand.name}. Pay the one-time lifetime membership fee by UPI and the secretariat verifies it within a day."
	/>
</svelte:head>

<section data-nav="dark" class="bg-ink-950 pt-44 pb-20 text-ivory-100 sm:pt-52">
	<div class="mx-auto max-w-7xl px-6 sm:px-10">
		<p class="eyebrow text-brass-300">Membership</p>
		<h1 class="display mt-6 text-[clamp(3rem,7vw,6rem)]">Apply for your seat.</h1>
		<ol class="mt-10 grid max-w-3xl gap-4 text-sm text-ivory-200/75 sm:grid-cols-3">
			<li>
				<span class="display mr-2 text-2xl text-brass-400">1</span>Pay the one-time membership fee
				by UPI
			</li>
			<li>
				<span class="display mr-2 text-2xl text-brass-400">2</span>Fill in this form with the
				transaction ID
			</li>
			<li>
				<span class="display mr-2 text-2xl text-brass-400">3</span>We verify and email your login
			</li>
		</ol>
	</div>
</section>

<section bind:this={section} data-nav="light" class="bg-ivory-50 py-20 sm:py-28">
	<div class="mx-auto grid max-w-7xl gap-14 px-6 sm:px-10 lg:grid-cols-[7fr_4fr]">
		{#if form?.ok}
			<div class="lg:col-span-2">
				<p class="eyebrow text-brass-600">Application received</p>
				<h2 class="display mt-6 text-5xl text-ink-900">Thank you.</h2>
				<p class="mt-6 max-w-xl text-lg text-stone-muted">
					The secretariat will verify your payment within 24 business hours. Once it’s confirmed,
					your member login is emailed to <strong class="text-ink-900">{form.email ?? 'you'}</strong
					>.
				</p>
				<a
					href="/"
					class="mt-10 inline-block rounded-full bg-ink-900 px-8 py-4 text-sm font-semibold text-ivory-100 hover:bg-ink-700"
					>Back to the home page</a
				>
			</div>
		{:else}
			<form
				method="POST"
				enctype="multipart/form-data"
				use:enhance={() => {
					busy = true;
					return async ({ result, update }) => {
						await update({ reset: false });
						busy = false;
						// Show the thank-you (or the first problem) instead of where the button was.
						await tick();
						if (result.type === 'success') scrollIntoViewTop(section);
						else
							section
								.querySelector('.field-error, [role=alert]')
								?.scrollIntoView({ block: 'center' });
					};
				}}
				class="order-2 grid content-start gap-x-8 gap-y-6 sm:grid-cols-2 lg:order-1"
			>
				<h2 class="display text-3xl text-ink-900 sm:col-span-2">Your details</h2>
				{#each fields as f (f.name)}
					<label class="block">
						<span class="field-label">{f.label}{f.required ? ' *' : ''}</span>
						<input
							name={f.name}
							type={f.type ?? 'text'}
							autocomplete={f.autocomplete}
							required={f.required}
							placeholder={f.placeholder}
							value={values[f.name] ?? ''}
							class="field-input"
						/>
						{#if errors[f.name]}<p class="field-error">{errors[f.name]}</p>{:else if f.hint}<p
								class="mt-1.5 text-xs text-stone-muted"
							>
								{f.hint}
							</p>{/if}
					</label>
				{/each}
				<ReferrerField {values} error={errors.referrerNumber} />
				<fieldset class="sm:col-span-2">
					<legend class="field-label">Your hub *</legend>
					<div class="mt-2 grid grid-cols-2 gap-3 sm:max-w-xl sm:grid-cols-3">
						{#each hubs as h (h)}
							<label
								class="flex cursor-pointer items-center gap-3 rounded-md border border-ink-900/15 bg-white px-4 py-3 text-sm has-[:checked]:border-brass-500 has-[:checked]:bg-brass-200/30"
							>
								<input
									type="radio"
									name="hub"
									value={h}
									required
									checked={values.hub === h}
									class="text-ink-900"
								/>
								{h}
							</label>
						{/each}
					</div>
					{#if errors.hub}<p class="field-error">{errors.hub}</p>{/if}
				</fieldset>
				<div class="sm:col-span-2">
					<IndustryField
						value={values.industry}
						error={errors.industry}
						options={data.categories}
					/>
				</div>
				<div class="sm:col-span-2">
					<span class="field-label">Your photo</span>
					<div class="mt-2 flex items-center gap-5">
						<div
							class="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full bg-ink-900/5 ring-1 ring-ink-900/10"
						>
							{#if photoPreview}
								<img src={photoPreview} alt="" class="h-full w-full object-cover" />
							{:else}
								<span class="text-2xl text-ink-900/30" aria-hidden="true">◎</span>
							{/if}
						</div>
						<label class="block min-w-0 flex-1">
							<span class="sr-only">Profile photo</span>
							<input
								name="photo"
								type="file"
								accept="image/jpeg,image/png,image/webp"
								onchange={async (e) => {
									const input = e.currentTarget;
									photoNote = (await shrinkImageInput(input, 800))?.note ?? '';
									const file = input.files?.[0];
									if (photoPreview) URL.revokeObjectURL(photoPreview);
									photoPreview = file ? URL.createObjectURL(file) : null;
								}}
								class="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-ink-900 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-ivory-50"
							/>
							{#if errors.photo}<p class="field-error">{errors.photo}</p>{:else}<p
									class="mt-1.5 text-xs text-stone-muted"
								>
									{photoNote ||
										'A clear photo of you, shown on your member profile. JPEG, PNG or WebP.'}
								</p>{/if}
						</label>
					</div>
				</div>
				<label class="block sm:col-span-2">
					<span class="field-label">About your business</span>
					<textarea
						name="about"
						rows="3"
						maxlength="1000"
						class="field-input"
						placeholder="What you make or do, and who you serve">{values.about ?? ''}</textarea
					>
					{#if errors.about}<p class="field-error">{errors.about}</p>{/if}
				</label>

				<h2 class="display mt-6 text-3xl text-ink-900 sm:col-span-2">Your payment</h2>
				<label class="block sm:col-span-2 sm:max-w-md">
					<span class="field-label">UPI transaction ID (UTR) *</span>
					<input
						name="utr"
						required
						autocomplete="off"
						inputmode="text"
						value={values.utr ?? ''}
						placeholder="e.g. 412345678901"
						class="field-input font-mono"
					/>
					{#if errors.utr}<p class="field-error">{errors.utr}</p>{:else}<p
							class="mt-1.5 text-xs text-stone-muted"
						>
							On the payment receipt in your UPI app
						</p>{/if}
				</label>

				<!-- Honeypot: hidden from people, filled in by bots -->
				<input
					name="company_url"
					tabindex="-1"
					autocomplete="off"
					class="hidden"
					aria-hidden="true"
				/>

				<label class="flex items-start gap-3 text-sm text-ink-800 sm:col-span-2">
					<input
						type="checkbox"
						name="consent"
						required
						class="mt-0.5 rounded border-ink-900/30 text-ink-900"
					/>
					<span>
						I confirm these details are correct and that I’ve paid the membership fee by UPI. I
						understand the fee is a one-time lifetime fee and is non-refundable.
						<span class="mt-1 block text-xs text-stone-muted"
							>The membership fee is non-refundable once paid.</span
						>
					</span>
				</label>
				{#if errors.consent}<p class="field-error sm:col-span-2">{errors.consent}</p>{/if}
				{#if errors.form}<p class="field-error sm:col-span-2" role="alert">{errors.form}</p>{/if}

				<div class="sm:col-span-2">
					<button
						disabled={busy}
						class="rounded-full bg-ink-900 px-10 py-4 text-sm font-semibold tracking-wide text-ivory-100 transition-colors hover:bg-ink-700 disabled:opacity-60"
					>
						{busy ? 'Submitting…' : 'Submit application'}
					</button>
					{#if Object.keys(errors).length && !errors.form}<p class="field-error mt-3" role="alert">
							Please fix the highlighted fields.
						</p>{/if}
				</div>
			</form>

			<aside class="order-1 h-fit lg:sticky lg:top-28 lg:order-2">
				<PaymentPanel
					payment={data.payment}
					amount={data.membership.fee}
					period="Lifetime"
					note={data.note}
					qrSvg={data.qrSvg}
				/>
				<p class="mt-4 text-xs text-stone-muted">
					Already a member? <a href="/login" class="font-semibold text-brass-600">Sign in</a>
				</p>
			</aside>
		{/if}
	</div>
</section>
