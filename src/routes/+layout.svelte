<script lang="ts">
	import './layout.css';
	import type { LayoutProps } from './$types';
	import { brand } from '#lib/content.ts';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<title>{brand.name} — Meet. Learn. Collaborate. Grow.</title>
	<meta name="description" content={brand.description} />
	<meta name="theme-color" content="#070d18" />
	<meta property="og:site_name" content={brand.name} />
	<meta property="og:locale" content="en_IN" />
	<link rel="icon" href="/brand/favicon.png" />
</svelte:head>

{@render children()}
