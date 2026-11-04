<script lang="ts">
	import { fieldName, type FormField } from '#lib/forms.ts';

	type Props = {
		fields: FormField[];
		/** Previously submitted values, keyed by control name (for redisplay after an error). */
		values?: Record<string, string | string[]>;
		errors?: Record<string, string>;
		/** Admin preview inside the event form: controls get no names and nothing is required. */
		preview?: boolean;
	};
	let { fields, values = {}, errors = {}, preview = false }: Props = $props();

	const val = (f: FormField) => {
		const v = values[fieldName(f)];
		return Array.isArray(v) ? v.join(', ') : (v ?? '');
	};
	const checked = (f: FormField, option: string) => {
		const v = values[fieldName(f)];
		return Array.isArray(v) ? v.includes(option) : v === option;
	};
	const choices = (f: FormField) => (f.type === 'yesno' ? ['Yes', 'No'] : (f.options ?? []));
	const inputType: Partial<Record<FormField['type'], string>> = {
		text: 'text',
		email: 'email',
		phone: 'tel',
		number: 'number',
		date: 'date'
	};
</script>

{#each fields as f (f.id)}
	{@const name = preview ? undefined : fieldName(f)}
	<div
		class={f.type === 'textarea' || f.type === 'checkbox' || f.type === 'radio'
			? 'sm:col-span-2'
			: ''}
	>
		{#if f.type === 'radio' || f.type === 'checkbox' || f.type === 'yesno'}
			<fieldset>
				<legend class="field-label">{f.label}{f.required ? ' *' : ''}</legend>
				{#if f.help}<p class="mt-1 text-xs text-stone-muted">{f.help}</p>{/if}
				<div class="mt-2 flex flex-wrap gap-x-6 gap-y-2">
					{#each choices(f) as option (option)}
						<label class="flex items-center gap-2 text-sm">
							<input
								type={f.type === 'checkbox' ? 'checkbox' : 'radio'}
								{name}
								value={option}
								checked={checked(f, option)}
								required={!preview && f.required && f.type !== 'checkbox'}
								class="border-ink-900/30 text-ink-900 {f.type === 'checkbox' ? 'rounded' : ''}"
							/>
							{option}
						</label>
					{/each}
				</div>
			</fieldset>
		{:else}
			<label class="block">
				<span class="field-label">{f.label}{f.required ? ' *' : ''}</span>
				{#if f.type === 'textarea'}
					<textarea
						{name}
						rows="3"
						maxlength="2000"
						required={!preview && f.required}
						class="field-input">{val(f)}</textarea
					>
				{:else if f.type === 'select'}
					<select {name} required={!preview && f.required} class="field-input">
						<option value="">Choose…</option>
						{#each f.options ?? [] as option (option)}
							<option selected={val(f) === option}>{option}</option>
						{/each}
					</select>
				{:else}
					<input
						type={inputType[f.type] ?? 'text'}
						{name}
						value={val(f)}
						required={!preview && f.required}
						class="field-input"
					/>
				{/if}
				{#if f.help}<span class="mt-1.5 block text-xs text-stone-muted">{f.help}</span>{/if}
			</label>
		{/if}
		{#if errors[f.id]}<p class="field-error">{errors[f.id]}</p>{/if}
	</div>
{/each}
