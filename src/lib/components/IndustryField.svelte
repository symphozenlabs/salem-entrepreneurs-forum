<script lang="ts">
	import { untrack } from 'svelte';
	import { categories } from '#lib/categories.ts';

	/**
	 * The member's business category (form field `industry`, stored in the `industry` columns):
	 * one of the listed categories, or whatever was typed under "Other". Earlier members may
	 * have an older industry name, which shows under "Other" until they pick a category.
	 */
	let {
		value = '',
		error = '',
		optional = false
	}: { value?: string; error?: string; optional?: boolean } = $props();

	const listed: readonly string[] = categories;
	const initial = untrack(() => value);
	let choice = $state(!initial ? '' : listed.includes(initial) ? initial : 'Other');
	let other = $state(listed.includes(initial) ? '' : initial);
</script>

<div class="grid gap-x-8 gap-y-6 sm:grid-cols-2">
	<label class="block {choice === 'Other' ? '' : 'sm:col-span-2'}">
		<span class="field-label">Category{optional ? '' : ' *'}</span>
		<select name="industry" required={!optional} bind:value={choice} class="field-input">
			<option value="" disabled={!optional}>Choose one</option>
			{#each listed as name (name)}<option>{name}</option>{/each}
			<option>Other</option>
		</select>
	</label>
	{#if choice === 'Other'}
		<label class="block">
			<span class="field-label">Your category{optional ? '' : ' *'}</span>
			<!-- svelte-ignore a11y_autofocus -->
			<input
				name="industryOther"
				required={!optional}
				maxlength="60"
				bind:value={other}
				placeholder="e.g. Granite, Poultry, Printing"
				autofocus={!initial}
				class="field-input"
			/>
		</label>
	{/if}
	{#if error}<p class="field-error sm:col-span-2">{error}</p>{/if}
</div>
