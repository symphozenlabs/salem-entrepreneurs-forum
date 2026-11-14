<script lang="ts">
	import { onMount } from 'svelte';
	import { magnetic, getLenis } from '#lib/motion.ts';
	import { activeForum } from '#lib/forum.svelte.ts';
	import ForumSwitcher from './ForumSwitcher.svelte';

	const forum = $derived(activeForum());
	const nav = $derived([
		{ label: 'Story', href: '/#story' },
		{ label: `Why ${forum.brand.short}`, href: '/#why' },
		{ label: 'Membership', href: '/#membership' },
		{ label: 'Events', href: '/events' },
		{ label: 'Contact', href: '/#contact' }
	]);

	let dark = $state(true);
	let open = $state(false);

	onMount(() => {
		// The header stays put (the forum switcher lives in it); only its tone follows the page.
		const onScroll = () => {
			// Sections declare their tone with data-nav="dark" | "light".
			const under = document
				.elementsFromPoint(window.innerWidth / 2, 40)
				.find((el) => !el.closest('header') && el.closest('[data-nav]'))
				?.closest('[data-nav]');
			dark = (under?.getAttribute('data-nav') ?? 'light') === 'dark';
		};
		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});

	function toggle() {
		open = !open;
		const lenis = getLenis();
		if (open) lenis?.stop();
		else lenis?.start();
	}
</script>

<header
	class="fixed inset-x-0 top-0 z-50 transition-[background-color,color] duration-700 ease-out-expo
		{open
		? 'text-ivory-100'
		: dark
			? 'text-ivory-100'
			: 'bg-ivory-100/75 text-ink-900 backdrop-blur-xl'}"
>
	<div class="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 sm:px-10">
		<ForumSwitcher tone={dark || open ? 'light' : 'ink'} />

		<nav class="hidden items-center gap-9 lg:flex" aria-label="Primary">
			{#each nav as item (item.href)}
				<a
					href={item.href}
					class="group relative text-[0.8rem] font-medium tracking-wide opacity-80 transition-opacity hover:opacity-100"
				>
					{item.label}
					<span
						class="absolute -bottom-1 left-0 h-px w-full origin-right scale-x-0 bg-brass-400 transition-transform duration-500 ease-out-expo group-hover:origin-left group-hover:scale-x-100"
					></span>
				</a>
			{/each}
		</nav>

		<div class="relative z-10 flex items-center gap-3">
			<a
				href="/login"
				class="hidden text-[0.8rem] font-medium tracking-wide opacity-80 hover:opacity-100 sm:block"
				>Member login</a
			>
			<a
				use:magnetic={0.25}
				href="/join"
				class="hidden rounded-full bg-brass-400 px-5 py-2.5 text-[0.8rem] font-semibold tracking-wide text-ink-950 transition-colors hover:bg-brass-300 sm:block"
				>Apply</a
			>
			<button
				onclick={toggle}
				class="grid size-11 place-items-center lg:hidden"
				aria-expanded={open}
				aria-controls="mobile-menu"
				aria-label={open ? 'Close menu' : 'Open menu'}
			>
				<span class="relative block h-3 w-6">
					<span
						class="absolute inset-x-0 top-0 h-px bg-current transition-transform duration-500 {open
							? 'translate-y-1.5 rotate-45'
							: ''}"
					></span>
					<span
						class="absolute inset-x-0 bottom-0 h-px bg-current transition-transform duration-500 {open
							? '-translate-y-1.5 -rotate-45'
							: ''}"
					></span>
				</span>
			</button>
		</div>
	</div>
</header>

<div
	id="mobile-menu"
	class="fixed inset-0 z-40 flex flex-col justify-end bg-ink-950 px-6 pt-28 pb-12 text-ivory-100 transition-[clip-path] duration-900 ease-out-expo lg:hidden"
	style="clip-path: inset(0 0 {open ? '0' : '100%'} 0)"
	inert={!open}
>
	<nav class="flex flex-col gap-2" aria-label="Mobile">
		{#each nav as item, i (item.href)}
			<a
				href={item.href}
				onclick={toggle}
				class="display text-5xl transition-[opacity,transform] duration-700 ease-out-expo"
				style="transition-delay:{open ? 150 + i * 60 : 0}ms; opacity:{open
					? 1
					: 0}; transform:translateY({open ? 0 : 24}px)">{item.label}</a
			>
		{/each}
	</nav>
	<div class="hairline my-10"></div>
	<div class="flex gap-3">
		<a
			href="/join"
			class="flex-1 rounded-full bg-brass-400 py-4 text-center font-semibold text-ink-950">Apply</a
		>
		<a
			href="/login"
			class="flex-1 rounded-full border border-ivory-100/30 py-4 text-center font-semibold"
			>Member login</a
		>
	</div>
</div>
