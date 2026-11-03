<script lang="ts">
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import type { LayoutProps } from './$types';
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

<div class="grain">
	<Preloader />
	<Nav />
	<main>
		{@render children()}
	</main>
	<Footer />
</div>
