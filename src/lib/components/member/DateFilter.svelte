<script lang="ts">
	type Props = { view: string; from: string; to: string };
	let { view, from, to }: Props = $props();
</script>

<form method="GET" class="flex flex-wrap items-end gap-3">
	<input type="hidden" name="view" value={view} />
	<label class="block">
		<span class="field-label">From</span>
		<input type="date" name="from" value={from} class="field-input !py-2" />
	</label>
	<label class="block">
		<span class="field-label">To</span>
		<input type="date" name="to" value={to} class="field-input !py-2" />
	</label>
	<button class="btn-quiet !py-2">Filter</button>
	{#if from || to}<a href="?view={view}" class="py-2 text-sm text-brass-600">Clear</a>{/if}
</form>
