<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import type { LayoutProps } from './$types';
	import { brand } from '#lib/content.ts';
	import { startSmoothScroll, ScrollTrigger } from '#lib/motion.ts';
	import Nav from '#lib/components/Nav.svelte';
	import Footer from '#lib/components/Footer.svelte';
	import Preloader from '#lib/components/Preloader.svelte';

	let { children }: LayoutProps = $props();

	onMount(() => {
		const stop = startSmoothScroll();
		// Web fonts and images shift layout after first paint; re-measure trigger positions.
		const refresh = () => ScrollTrigger.refresh();
		document.fonts.ready.then(refresh);
		window.addEventListener('load', refresh);
		return () => {
			stop();
			window.removeEventListener('load', refresh);
		};
	});
	afterNavigate(() => ScrollTrigger.refresh());
</script>

<svelte:head>
	<title>{brand.name} — Meet. Learn. Collaborate. Grow.</title>
	<meta name="description" content={brand.description} />
	<meta name="theme-color" content="#070d18" />
	<meta property="og:site_name" content={brand.name} />
	<meta property="og:locale" content="en_IN" />
	<link rel="icon" href="/brand/favicon.png" />
</svelte:head>

<div class="grain">
	<Preloader />
	<Nav />
	<main>
		{@render children()}
	</main>
	<Footer />
</div>
