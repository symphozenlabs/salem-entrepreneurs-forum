<script lang="ts">
	import { enhance } from '$app/forms';
	import { categories } from '#lib/events.ts';

	type Props = {
		values: Record<string, string>;
		errors?: Record<string, string>;
		/** Current cover image URL when editing. */
		cover?: string | null;
		submitLabel: string;
	};
	let { values, errors = {}, cover = null, submitLabel }: Props = $props();

	let busy = $state(false);
	let preview = $state<string | null>(null);
	let removeCover = $state(false);
	let coverNote = $state('');

	const MAX_EDGE = 1800;

	/** Shrinks the chosen photo in the browser so uploads stay small (phone photos are 5–10 MB). */
	async function prepareCover(e: Event & { currentTarget: HTMLInputElement }) {
		const input = e.currentTarget;
		const file = input.files?.[0];
		coverNote = '';
		if (!file) return (preview = null);
		removeCover = false;
		try {
			const bitmap = await createImageBitmap(file);
			const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
			const canvas = document.createElement('canvas');
			canvas.width = Math.round(bitmap.width * scale);
			canvas.height = Math.round(bitmap.height * scale);
			canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
			const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', 0.82));
			if (blob && blob.size < file.size) {
				const dt = new DataTransfer();
				dt.items.add(
					new File([blob], file.name.replace(/\.\w+$/, '') + '.webp', { type: 'image/webp' })
				);
				input.files = dt.files;
			}
			const final = input.files![0];
			coverNote = `${canvas.width}×${canvas.height}, ${Math.round(final.size / 1024)} KB`;
			preview = URL.createObjectURL(final);
		} catch {
			preview = URL.createObjectURL(file);
		}
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
				<select name="category" required class="field-input">
					{#each categories as c (c)}
						<option value={c} selected={(values.category ?? 'Conclave') === c}>{c}</option>
					{/each}
				</select>
				{#if errors.category}<p class="field-error">{errors.category}</p>{/if}
			</label>
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
			<label class="block">
				<span class="field-label"
					>Starts * <span class="font-normal text-stone-muted">(India time)</span></span
				>
				<input
					name="startsAt"
					type="datetime-local"
					required
					value={values.startsAt ?? ''}
					class="field-input"
				/>
				{#if errors.startsAt}<p class="field-error">{errors.startsAt}</p>{/if}
			</label>
			<label class="block">
				<span class="field-label">Ends</span>
				<input
					name="endsAt"
					type="datetime-local"
					value={values.endsAt ?? ''}
					class="field-input"
				/>
				{#if errors.endsAt}<p class="field-error">{errors.endsAt}</p>{/if}
			</label>
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
				{#if errors.seats}<p class="field-error">{errors.seats}</p>{/if}
			</label>
			<label class="block">
				<span class="field-label">Registration link</span>
				<input
					name="registrationUrl"
					type="url"
					value={values.registrationUrl ?? ''}
					class="field-input"
					placeholder="https://forms.gle/…"
				/>
				<span class="mt-1.5 block text-xs text-stone-muted"
					>Empty: “Reserve a seat” opens WhatsApp with the secretariat.</span
				>
				{#if errors.registrationUrl}<p class="field-error">{errors.registrationUrl}</p>{/if}
			</label>
		</div>
	</div>

	<div class="space-y-6">
		<div class="rounded-lg border border-ink-900/10 bg-white p-5">
			<span class="field-label">Cover image</span>
			<div
				class="mt-2 aspect-[4/3] overflow-hidden rounded bg-gradient-to-br from-ink-800 via-ink-700 to-brass-600"
			>
				{#if shown}<img src={shown} alt="Cover preview" class="h-full w-full object-cover" />{/if}
			</div>
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
