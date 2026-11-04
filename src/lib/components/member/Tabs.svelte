<script lang="ts">
	type Props = {
		tabs: { key: string; label: string; count?: number }[];
		current: string;
		param?: string;
	};
	let { tabs, current, param = 'view' }: Props = $props();
</script>

<nav class="mt-8 flex flex-wrap gap-1 border-b border-ink-900/10" aria-label="Sections">
	{#each tabs as t (t.key)}
		<a
			href="?{param}={t.key}"
			aria-current={current === t.key ? 'page' : undefined}
			class="-mb-px shrink-0 border-b-2 px-4 py-3 text-sm font-semibold transition-colors {current ===
			t.key
				? 'border-brass-500 text-ink-900'
				: 'border-transparent text-stone-muted hover:text-ink-900'}"
		>
			{t.label}{#if t.count}<span class="ml-1.5 rounded-full bg-ink-900/5 px-2 py-0.5 text-xs"
					>{t.count}</span
				>{/if}
		</a>
	{/each}
</nav>
