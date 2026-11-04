<script lang="ts">
	import { untrack } from 'svelte';
	import { ArrowDown, ArrowUp, Eye, Pencil, Plus, Trash2 } from '@lucide/svelte';
	import {
		cleanFields,
		fieldTypes,
		hasOptions,
		MAX_FIELDS,
		newFieldId,
		type FieldType,
		type FormField
	} from '#lib/forms.ts';
	import FormFields from '#lib/components/FormFields.svelte';

	/** `value` is the form as JSON; the builder edits it and submits it in a hidden input. */
	let { value = '[]', error = '' }: { value?: string; error?: string } = $props();

	type Draft = Omit<FormField, 'options'> & { optionsText: string };

	const toDraft = (f: FormField): Draft => ({ ...f, optionsText: (f.options ?? []).join('\n') });
	const fromDraft = (d: Draft): FormField => {
		const { optionsText, ...f } = d;
		return hasOptions(d.type)
			? {
					...f,
					options: optionsText
						.split('\n')
						.map((o) => o.trim())
						.filter(Boolean)
				}
			: f;
	};

	let drafts = $state<Draft[]>(
		untrack(() => {
			try {
				return (JSON.parse(value) as FormField[]).map(toDraft);
			} catch {
				return [];
			}
		})
	);
	let previewing = $state(false);

	const json = $derived(JSON.stringify(drafts.map(fromDraft)));
	const previewFields = $derived(cleanFields(drafts.map(fromDraft)).fields);

	// One-tap starting points for questions events usually ask.
	const presets: { label: string; type: FieldType; options?: string[]; required?: boolean }[] = [
		{ label: 'Company / business name', type: 'text', required: true },
		{ label: 'Designation', type: 'text' },
		{ label: 'Industry', type: 'text' },
		{ label: 'Number of attendees', type: 'number', required: true },
		{ label: 'Food preference', type: 'radio', options: ['Vegetarian', 'Non-vegetarian'] },
		{ label: 'Are you an SEF member?', type: 'yesno', required: true },
		{ label: 'GST number (for invoice)', type: 'text' },
		{ label: 'What do you hope to get from this event?', type: 'textarea' }
	];

	function add(p?: (typeof presets)[number]) {
		if (drafts.length >= MAX_FIELDS) return;
		drafts.push({
			id: newFieldId(),
			type: p?.type ?? 'text',
			label: p?.label ?? '',
			required: p?.required ?? false,
			optionsText: (p?.options ?? []).join('\n')
		});
		previewing = false;
	}

	function move(i: number, by: number) {
		const j = i + by;
		if (j < 0 || j >= drafts.length) return;
		[drafts[i], drafts[j]] = [drafts[j], drafts[i]];
	}
</script>

<input type="hidden" name="formFields" value={json} />

<div class="rounded-lg border border-ink-900/10 bg-ivory-50 p-4 sm:p-5">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div>
			<p class="text-sm font-semibold">Registration form</p>
			<p class="text-xs text-stone-muted">
				Name, email and phone are always asked. Add any other questions below.
			</p>
		</div>
		{#if drafts.length}
			<button
				type="button"
				onclick={() => (previewing = !previewing)}
				class="btn-quiet !px-3 !py-1.5"
			>
				{#if previewing}<Pencil class="size-3.5" /> Edit questions{:else}<Eye class="size-3.5" /> Preview{/if}
			</button>
		{/if}
	</div>

	{#if previewing}
		<div class="mt-4 grid gap-5 rounded-md border border-ink-900/10 bg-white p-4 sm:grid-cols-2">
			<label class="block"
				><span class="field-label">Full name *</span><input class="field-input" disabled /></label
			>
			<label class="block"
				><span class="field-label">Email *</span><input class="field-input" disabled /></label
			>
			<label class="block"
				><span class="field-label">Mobile / WhatsApp *</span><input
					class="field-input"
					disabled
				/></label
			>
			<FormFields fields={previewFields} preview />
		</div>
	{:else}
		<ol class="mt-4 space-y-3">
			{#each drafts as d, i (d.id)}
				<li class="rounded-md border border-ink-900/10 bg-white p-4">
					<div class="flex gap-3">
						<span class="pt-2.5 text-xs font-semibold text-stone-muted">{i + 1}</span>
						<div class="grid flex-1 gap-3 sm:grid-cols-[1fr_12rem]">
							<input
								bind:value={d.label}
								placeholder="Question, e.g. Company name"
								aria-label="Question {i + 1}"
								class="field-input !mt-0"
							/>
							<select
								bind:value={d.type}
								aria-label="Answer type for question {i + 1}"
								class="field-input !mt-0"
							>
								{#each Object.entries(fieldTypes) as [key, label] (key)}
									<option value={key}>{label}</option>
								{/each}
							</select>
							{#if hasOptions(d.type)}
								<label class="block sm:col-span-2">
									<span class="text-xs text-stone-muted">Options — one per line</span>
									<textarea
										bind:value={d.optionsText}
										rows="3"
										placeholder={'Option one\nOption two'}
										class="field-input !mt-1"></textarea>
								</label>
							{/if}
							<input
								bind:value={d.help}
								placeholder="Hint shown under the question (optional)"
								aria-label="Hint for question {i + 1}"
								class="field-input !mt-0 sm:col-span-2"
							/>
						</div>
					</div>
					<div class="mt-3 flex items-center justify-between gap-3 pl-6">
						<label class="flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								bind:checked={d.required}
								class="rounded border-ink-900/30 text-ink-900"
							/> Required
						</label>
						<div class="flex gap-1">
							<button
								type="button"
								onclick={() => move(i, -1)}
								disabled={i === 0}
								aria-label="Move up"
								class="rounded p-1.5 hover:bg-ivory-100 disabled:opacity-30"
								><ArrowUp class="size-4" /></button
							>
							<button
								type="button"
								onclick={() => move(i, 1)}
								disabled={i === drafts.length - 1}
								aria-label="Move down"
								class="rounded p-1.5 hover:bg-ivory-100 disabled:opacity-30"
								><ArrowDown class="size-4" /></button
							>
							<button
								type="button"
								onclick={() => drafts.splice(i, 1)}
								aria-label="Delete question"
								class="rounded p-1.5 text-laterite-500 hover:bg-laterite-500/10"
								><Trash2 class="size-4" /></button
							>
						</div>
					</div>
				</li>
			{/each}
		</ol>

		{#if drafts.length < MAX_FIELDS}
			<div class="mt-4">
				<button type="button" onclick={() => add()} class="btn-quiet !px-3 !py-1.5"
					><Plus class="size-3.5" /> Add a question</button
				>
				<p class="mt-3 text-xs text-stone-muted">Or add a common one:</p>
				<div class="mt-2 flex flex-wrap gap-2">
					{#each presets.filter((p) => !drafts.some((d) => d.label === p.label)) as p (p.label)}
						<button
							type="button"
							onclick={() => add(p)}
							class="rounded-full border border-ink-900/15 bg-white px-3 py-1 text-xs hover:border-brass-500 hover:text-brass-600"
							>+ {p.label}</button
						>
					{/each}
				</div>
			</div>
		{/if}
	{/if}
	{#if error}<p class="field-error">{error}</p>{/if}
</div>
