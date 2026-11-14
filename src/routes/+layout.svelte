<script lang="ts">
	import './layout.css';
	import type { LayoutProps } from './$types';
	import { page } from '$app/state';
	import { activeForum } from '#lib/forum.svelte.ts';
	import NavLoader from '#lib/components/NavLoader.svelte';

	let { children }: LayoutProps = $props();
	const brand = $derived(activeForum().brand);
	const cover = $derived(new URL(activeForum().cover, page.url.origin).href);
</script>

<svelte:head>
	<title>{brand.name} — Meet. Learn. Collaborate. Grow.</title>
	<meta name="description" content={brand.description} />
	<meta name="theme-color" content="#070d18" />
	<meta property="og:site_name" content={brand.name} />
	<meta property="og:title" content="{brand.name} — Meet. Learn. Collaborate. Grow." />
	<meta property="og:description" content={brand.description} />
	<meta property="og:image" content={cover} />
	<meta property="og:locale" content="en_IN" />
	<meta name="twitter:card" content="summary_large_image" />
	<link rel="icon" href="/brand/favicon.png" />
</svelte:head>

<NavLoader />
{@render children()}
