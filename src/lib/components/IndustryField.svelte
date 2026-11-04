<script lang="ts">
	import { untrack } from 'svelte';
	import { industries } from '#lib/content.ts';

	/** `value` is the saved industry: one of the listed ones, or whatever was typed under "Other". */
	let { value = '', error = '' }: { value?: string; error?: string } = $props();

	const listed = industries.map((i) => i.name);
	const initial = untrack(() => value);
	let choice = $state(!initial ? '' : listed.includes(initial) ? initial : 'Other');
	let other = $state(listed.includes(initial) ? '' : initial);
</script>

<div class="grid gap-x-8 gap-y-6 sm:grid-cols-2">
	<label class="block {choice === 'Other' ? '' : 'sm:col-span-2'}">
		<span class="field-label">Industry *</span>
		<select name="industry" required bind:value={choice} class="field-input">
			<option value="" disabled>Choose one</option>
			{#each listed as name (name)}<option>{name}</option>{/each}
			<option>Other</option>
		</select>
	</label>
	{#if choice === 'Other'}
		<label class="block">
			<span class="field-label">Your industry *</span>
			<!-- svelte-ignore a11y_autofocus -->
			<input
				name="industryOther"
				required
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
