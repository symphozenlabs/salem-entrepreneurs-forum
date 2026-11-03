<script lang="ts">
	import type { LayoutProps } from './$types';
	import { brand } from '#lib/content.ts';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<title>Admin — {brand.name}</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="min-h-svh bg-ivory-100 text-ink-900">
	{@render children()}
</div>
