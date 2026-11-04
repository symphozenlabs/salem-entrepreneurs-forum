<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { categories, registrationModes } from '#lib/events.ts';
	import FormBuilder from '#lib/components/admin/FormBuilder.svelte';
	import DateTimePicker from '#lib/components/admin/DateTimePicker.svelte';
	import { shrinkImageInput } from '#lib/image.ts';

	type Props = {
		values: Record<string, string>;
		errors?: Record<string, string>;
		/** Current cover image URL when editing. */
		cover?: string | null;
		submitLabel: string;
	};
	let { values, errors = {}, cover = null, submitLabel }: Props = $props();

	let busy = $state(false);
	// A category outside the list was typed under "Other".
	const listed = categories as readonly string[];
	let categoryChoice = $state(
		untrack(() => {
			const c = values.category || 'Conclave';
			return listed.includes(c) ? c : 'Other';
		})
	);
	let categoryOther = $state(
		untrack(
			() =>
				values.categoryOther ??
				(listed.includes(values.category ?? '') ? '' : (values.category ?? ''))
		)
	);
	// The start time steers the end and closing pickers' defaults.
	let startsAt = $state(untrack(() => values.startsAt ?? ''));
	// Which registration settings to show; seeded from the event, then the admin's choice.
	let registration = $state(untrack(() => values.registration || 'whatsapp'));
	let preview = $state<string | null>(null);
	let removeCover = $state(false);
	let coverNote = $state('');

	async function prepareCover(e: Event & { currentTarget: HTMLInputElement }) {
		removeCover = false;
		const shrunk = await shrinkImageInput(e.currentTarget, 1800);
		preview = shrunk?.preview ?? null;
		coverNote = shrunk?.note ?? '';
	}

	const shown = $derived(preview ?? (removeCover ? null : cover));
</script>

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
	class="mt-8 grid gap-8 xl:grid-cols-[1fr_20rem]"
>
	<div class="space-y-6 rounded-lg border border-ink-900/10 bg-white p-5 sm:p-7">
		<label class="block">
			<span class="field-label">Title *</span>
			<input
				name="title"
				required
				maxlength="120"
				value={values.title ?? ''}
				class="field-input"
				placeholder="November Conclave: Exporting from Salem"
			/>
			{#if errors.title}<p class="field-error">{errors.title}</p>{/if}
		</label>

		<div class="grid gap-6 sm:grid-cols-2">
			<label class="block">
				<span class="field-label">Category *</span>
				<select name="category" required bind:value={categoryChoice} class="field-input">
					{#each categories as c (c)}
						<option value={c}>{c}</option>
					{/each}
				</select>
				{#if errors.category && categoryChoice !== 'Other'}<p class="field-error">
						{errors.category}
					</p>{/if}
			</label>
			{#if categoryChoice === 'Other'}
				<label class="block">
					<span class="field-label">What kind of event? *</span>
					<input
						name="categoryOther"
						required
						maxlength="40"
						bind:value={categoryOther}
						placeholder="e.g. Member meetup, Diwali celebration"
						class="field-input"
					/>
					{#if errors.category}<p class="field-error">{errors.category}</p>{/if}
				</label>
			{/if}
			<label class="block">
				<span class="field-label">Entry / price</span>
				<input
					name="price"
					value={values.price ?? ''}
					class="field-input"
					placeholder="Free for members · ₹1,500 for guests"
				/>
			</label>
		</div>

		<label class="block">
			<span class="field-label"
				>Summary * <span class="font-normal text-stone-muted"
					>— one or two lines, shown on the home page</span
				></span
			>
			<textarea name="summary" required maxlength="240" rows="2" class="field-input"
				>{values.summary ?? ''}</textarea
			>
			{#if errors.summary}<p class="field-error">{errors.summary}</p>{/if}
		</label>

		<div class="grid gap-6 sm:grid-cols-2">
			<div>
				<span class="field-label"
					>Starts * <span class="font-normal text-stone-muted">(India time)</span></span
				>
				<DateTimePicker name="startsAt" label="Starts" bind:value={startsAt} />
				{#if errors.startsAt}<p class="field-error">{errors.startsAt}</p>{/if}
			</div>
			<div>
				<span class="field-label">Ends</span>
				<DateTimePicker
					name="endsAt"
					label="Ends"
					value={values.endsAt ?? ''}
					placeholder="Optional"
					optional
					anchor={startsAt}
					anchorOffsetHours={3}
				/>
				{#if errors.endsAt}<p class="field-error">{errors.endsAt}</p>{/if}
			</div>
		</div>

		<div class="grid gap-6 sm:grid-cols-2">
			<label class="block">
				<span class="field-label">Venue *</span>
				<input
					name="venue"
					required
					value={values.venue ?? ''}
					class="field-input"
					placeholder="Radisson Salem, Fairlands"
				/>
				{#if errors.venue}<p class="field-error">{errors.venue}</p>{/if}
			</label>
			<label class="block">
				<span class="field-label">Google Maps link</span>
				<input
					name="mapUrl"
					type="url"
					value={values.mapUrl ?? ''}
					class="field-input"
					placeholder="https://maps.app.goo.gl/…"
				/>
				{#if errors.mapUrl}<p class="field-error">{errors.mapUrl}</p>{/if}
			</label>
		</div>

		<label class="block">
			<span class="field-label">Address</span>
			<textarea name="address" rows="2" class="field-input">{values.address ?? ''}</textarea>
		</label>

		<label class="block">
			<span class="field-label"
				>Full description <span class="font-normal text-stone-muted"
					>— leave a blank line between paragraphs</span
				></span
			>
			<textarea
				name="description"
				rows="9"
				class="field-input"
				placeholder="Agenda, speakers, dress code…">{values.description ?? ''}</textarea
			>
		</label>

		<fieldset class="space-y-5 border-t border-ink-900/10 pt-6">
			<legend class="text-sm font-semibold">Registration</legend>
			<div class="grid gap-3 sm:grid-cols-3">
				{#each Object.entries(registrationModes) as [key, label] (key)}
					<label
						class="flex cursor-pointer gap-2.5 rounded-md border p-3 text-sm transition-colors {registration ===
						key
							? 'border-brass-500 bg-brass-200/30'
							: 'border-ink-900/15 hover:border-ink-900/30'}"
					>
						<input
							type="radio"
							name="registration"
							value={key}
							bind:group={registration}
							class="mt-0.5 text-ink-900"
						/>
						{label}
					</label>
				{/each}
			</div>
			{#if errors.registration}<p class="field-error">{errors.registration}</p>{/if}

			<div class="grid gap-6 sm:grid-cols-2">
				<label class="block">
					<span class="field-label">Seats</span>
					<input
						name="seats"
						type="number"
						min="1"
						step="1"
						value={values.seats ?? ''}
						class="field-input"
						placeholder="60"
					/>
					<span class="mt-1.5 block text-xs text-stone-muted">
						{registration === 'form'
							? 'Registration closes when this many have registered.'
							: 'Shown on the event page.'}
					</span>
					{#if errors.seats}<p class="field-error">{errors.seats}</p>{/if}
				</label>
				<!-- Every option's settings stay in the form (just hidden), so switching back and
				     forth before saving loses nothing. -->
				<label class="block" class:hidden={registration !== 'link'}>
					<span class="field-label">Registration link *</span>
					<input
						name="registrationUrl"
						type="url"
						value={values.registrationUrl ?? ''}
						class="field-input"
						placeholder="https://forms.gle/…"
					/>
					{#if errors.registrationUrl}<p class="field-error">{errors.registrationUrl}</p>{/if}
				</label>
				<div class:hidden={registration !== 'form'}>
					<span class="field-label">Registration closes</span>
					<DateTimePicker
						name="registrationClosesAt"
						label="Registration closes"
						value={values.registrationClosesAt ?? ''}
						placeholder="When the event starts"
						optional
						anchor={startsAt}
					/>
					<span class="mt-1.5 block text-xs text-stone-muted"
						>Empty: open until the event starts.</span
					>
					{#if errors.registrationClosesAt}<p class="field-error">
							{errors.registrationClosesAt}
						</p>{/if}
				</div>
				<label class="block" class:hidden={registration !== 'form'}>
					<span class="field-label">Fee (₹)</span>
					<input
						name="fee"
						inputmode="numeric"
						value={values.fee ?? '0'}
						class="field-input"
						placeholder="0"
					/>
					<span class="mt-1.5 block text-xs text-stone-muted"
						>0 = free; free registrations are confirmed straight away.</span
					>
					{#if errors.fee}<p class="field-error">{errors.fee}</p>{/if}
				</label>
				<label class="block" class:hidden={registration !== 'form'}>
					<span class="field-label">Member fee (₹)</span>
					<input
						name="memberFee"
						inputmode="numeric"
						value={values.memberFee ?? ''}
						class="field-input"
						placeholder="Same as fee"
					/>
					<span class="mt-1.5 block text-xs text-stone-muted"
						>Optional lower fee for signed-in members.</span
					>
					{#if errors.memberFee}<p class="field-error">{errors.memberFee}</p>{/if}
				</label>
				{#if registration === 'whatsapp'}
					<p class="self-end text-sm text-stone-muted">
						“Reserve a seat” opens WhatsApp with the secretariat.
					</p>
				{/if}
			</div>

			<div class:hidden={registration !== 'form'}>
				<FormBuilder value={values.formFields ?? '[]'} error={errors.formFields} />
			</div>
		</fieldset>
	</div>

	<div class="space-y-6">
		<div class="rounded-lg border border-ink-900/10 bg-white p-5">
			<span class="field-label">Cover image</span>
			{#if shown}
				<img
					src={shown}
					alt="Cover preview"
					class="mx-auto mt-2 h-auto max-h-[28rem] w-auto max-w-full rounded"
				/>
				<p class="mt-1.5 text-xs text-stone-muted">
					Shown in full on the site, at its own shape — nothing is cut off.
				</p>
			{:else}
				<div
					class="mt-2 aspect-[4/3] rounded bg-gradient-to-br from-ink-800 via-ink-700 to-brass-600"
				></div>
			{/if}
			<input
				name="cover"
				type="file"
				accept="image/jpeg,image/png,image/webp"
				onchange={prepareCover}
				class="mt-3 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-ink-900 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-ivory-50"
			/>
			{#if coverNote}<p class="mt-1.5 text-xs text-stone-muted">Will upload {coverNote}</p>{/if}
			{#if errors.cover}<p class="field-error">{errors.cover}</p>{/if}
			{#if cover && !preview}
				<label class="mt-3 flex items-center gap-2 text-sm">
					<input
						type="checkbox"
						name="removeCover"
						bind:checked={removeCover}
						class="rounded border-ink-900/30 text-ink-900"
					/>
					Remove the current image
				</label>
			{/if}
		</div>

		<div class="rounded-lg border border-ink-900/10 bg-white p-5">
			<label class="flex items-start gap-3">
				<input
					type="checkbox"
					name="published"
					checked={values.published === 'on'}
					class="mt-0.5 rounded border-ink-900/30 text-ink-900"
				/>
				<span>
					<span class="block text-sm font-semibold">Published</span>
					<span class="block text-xs text-stone-muted">Show this event on the website.</span>
				</span>
			</label>
			<button disabled={busy} class="btn-primary mt-5 w-full"
				>{busy ? 'Saving…' : submitLabel}</button
			>
			{#if Object.keys(errors).length}
				<p class="field-error text-center" role="alert">Please fix the highlighted fields.</p>
			{/if}
		</div>
	</div>
</form>
