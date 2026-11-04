<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';
	import IndustryField from '#lib/components/IndustryField.svelte';
	import { photoUrl } from '#lib/network.ts';
	import { shrinkImageInput } from '#lib/image.ts';

	let { data, form }: PageProps = $props();
	let busy = $state(false);
	let preview = $state<string | null>(null);
	let removePhoto = $state(false);

	const me = $derived(data.me);
	const v = $derived((form?.values ?? {}) as Record<string, string>);
	const errors = $derived((form?.errors ?? {}) as Record<string, string>);
	const val = (k: string, fallback: string | null) => v[k] ?? fallback ?? '';
	const current = $derived(photoUrl(me));
	const shown = $derived(preview ?? (removePhoto ? null : current));
</script>

<p class="eyebrow text-brass-600">My profile</p>
<h1 class="display mt-2 text-4xl">How members see you</h1>

<form
	method="POST"
	enctype="multipart/form-data"
	use:enhance={() => {
		busy = true;
		return async ({ update }) => {
			await update({ reset: false });
			busy = false;
			preview = null;
		};
	}}
	class="mt-8 grid gap-8 xl:grid-cols-[1fr_20rem]"
>
	<div class="space-y-6 rounded-lg border border-ink-900/10 bg-white p-5 sm:p-7">
		<div class="grid gap-6 sm:grid-cols-2">
			<label class="block">
				<span class="field-label">Full name *</span>
				<input name="name" required value={val('name', me.name)} class="field-input" />
				{#if errors.name}<p class="field-error">{errors.name}</p>{/if}
			</label>
			<label class="block">
				<span class="field-label">Email</span>
				<input value={me.email} disabled class="field-input bg-ivory-100 text-stone-muted" />
				<span class="mt-1.5 block text-xs text-stone-muted"
					>Ask the secretariat to change your login email.</span
				>
			</label>
			<label class="block">
				<span class="field-label">Mobile / WhatsApp *</span>
				<input
					name="phone"
					type="tel"
					required
					value={val('phone', me.phone)}
					class="field-input"
				/>
				{#if errors.phone}<p class="field-error">{errors.phone}</p>{/if}
			</label>
			<label class="block">
				<span class="field-label">Your role</span>
				<input
					name="designation"
					value={val('designation', me.designation)}
					class="field-input"
					placeholder="Founder, Managing Director…"
				/>
			</label>
			<label class="block">
				<span class="field-label">Business name *</span>
				<input name="business" required value={val('business', me.business)} class="field-input" />
				{#if errors.business}<p class="field-error">{errors.business}</p>{/if}
			</label>
			<div class="sm:col-span-2">
				<IndustryField value={val('industry', me.industry)} error={errors.industry} />
			</div>
			<label class="block">
				<span class="field-label">City</span>
				<input name="city" value={val('city', me.city)} class="field-input" />
			</label>
			<label class="block">
				<span class="field-label">Website</span>
				<input
					name="website"
					type="url"
					value={val('website', me.website)}
					class="field-input"
					placeholder="https://"
				/>
				{#if errors.website}<p class="field-error">{errors.website}</p>{/if}
			</label>
		</div>
		<label class="block">
			<span class="field-label">About your business</span>
			<textarea name="about" rows="3" maxlength="1500" class="field-input"
				>{val('about', me.about)}</textarea
			>
		</label>
		<label class="block">
			<span class="field-label"
				>What we offer <span class="font-normal text-stone-muted"
					>— products and services members can send business for</span
				></span
			>
			<textarea name="offerings" rows="3" maxlength="1500" class="field-input"
				>{val('offerings', me.offerings)}</textarea
			>
		</label>
		<label class="block">
			<span class="field-label"
				>Looking for <span class="font-normal text-stone-muted"
					>— connections, suppliers or partners you need</span
				></span
			>
			<textarea name="lookingFor" rows="3" maxlength="1500" class="field-input"
				>{val('lookingFor', me.lookingFor)}</textarea
			>
		</label>
	</div>

	<div class="space-y-6">
		<div class="rounded-lg border border-ink-900/10 bg-white p-5">
			<span class="field-label">Photo</span>
			<div class="mx-auto mt-3 size-36 overflow-hidden rounded-full bg-ink-900">
				{#if shown}<img src={shown} alt="" class="h-full w-full object-cover" />{/if}
			</div>
			<input
				name="photo"
				type="file"
				accept="image/jpeg,image/png,image/webp"
				onchange={async (e) => {
					removePhoto = false;
					preview = (await shrinkImageInput(e.currentTarget, 600))?.preview ?? null;
				}}
				class="mt-4 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-ink-900 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-ivory-50"
			/>
			{#if errors.photo}<p class="field-error">{errors.photo}</p>{/if}
			{#if current && !preview}
				<label class="mt-3 flex items-center gap-2 text-sm">
					<input
						type="checkbox"
						name="removePhoto"
						bind:checked={removePhoto}
						class="rounded border-ink-900/30 text-ink-900"
					/>
					Remove photo
				</label>
			{/if}
		</div>

		<div class="rounded-lg border border-ink-900/10 bg-white p-5">
			<label class="flex items-start gap-3">
				<input
					type="checkbox"
					name="showInDirectory"
					checked={me.showInDirectory}
					class="mt-0.5 rounded border-ink-900/30 text-ink-900"
				/>
				<span>
					<span class="block text-sm font-semibold">Show me in the directory</span>
					<span class="block text-xs text-stone-muted"
						>Members can find you, see your phone and email, and send you connects.</span
					>
				</span>
			</label>
			<button disabled={busy} class="btn-primary mt-5 w-full"
				>{busy ? 'Saving…' : 'Save profile'}</button
			>
			{#if form?.saved}<p class="mt-3 text-center text-sm text-emerald-800" role="status">
					Saved.
				</p>{/if}
			{#if Object.keys(errors).length}<p class="field-error text-center" role="alert">
					Please fix the highlighted fields.
				</p>{/if}
			<a href="/member/password" class="mt-4 block text-center text-sm text-brass-600"
				>Change password</a
			>
		</div>
	</div>
</form>
