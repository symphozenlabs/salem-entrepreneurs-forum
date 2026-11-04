<script lang="ts">
	import type { LayoutProps } from './$types';
	import { page } from '$app/state';
	import {
		ArrowLeftRight,
		BadgeCheck,
		Handshake,
		Home,
		Menu,
		UserRound,
		Users,
		X,
		LogOut
	} from '@lucide/svelte';
	import { brand } from '#lib/content.ts';
	import { photoUrl } from '#lib/network.ts';

	let { data, children }: LayoutProps = $props();
	let open = $state(false);

	const links = [
		{ href: '/member', label: 'Overview', icon: Home },
		{ href: '/member/connects', label: 'Connects', icon: Handshake },
		{ href: '/member/transactions', label: 'Transactions', icon: ArrowLeftRight },
		{ href: '/member/directory', label: 'Directory', icon: Users },
		{ href: '/member/profile', label: 'My profile', icon: UserRound },
		{ href: '/member/membership', label: 'Membership', icon: BadgeCheck }
	];
	const active = (href: string) =>
		page.url.pathname === href || (href !== '/member' && page.url.pathname.startsWith(href + '/'));
	const forcedPassword = $derived(page.url.pathname === '/member/password');
	const photo = $derived(photoUrl(data.me));
	const initials = $derived(
		data.me.name
			.split(/\s+/)
			.map((w) => w[0])
			.slice(0, 2)
			.join('')
			.toUpperCase()
	);
</script>

<svelte:head>
	<title>Members — {brand.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="min-h-svh bg-ivory-100 text-ink-900 lg:grid lg:grid-cols-[17rem_1fr]">
	<div class="flex items-center justify-between bg-ink-950 px-5 py-4 lg:hidden">
		<a href="/member"><img src="/brand/logo-light.png" alt={brand.name} class="h-8" /></a>
		{#if !forcedPassword}
			<button
				onclick={() => (open = !open)}
				class="text-ivory-100"
				aria-label={open ? 'Close menu' : 'Open menu'}
				aria-expanded={open}
			>
				{#if open}<X />{:else}<Menu />{/if}
			</button>
		{/if}
	</div>

	<aside
		class="flex-col bg-ink-950 text-ivory-100 lg:sticky lg:top-0 lg:flex lg:h-svh {open
			? 'flex'
			: 'hidden'}"
	>
		<div class="flex items-center gap-3 border-b border-ivory-100/10 px-5 py-6">
			{#if photo}
				<img src={photo} alt="" class="size-12 rounded-full object-cover" />
			{:else}
				<span
					class="grid size-12 place-items-center rounded-full bg-brass-400 font-semibold text-ink-950"
					>{initials}</span
				>
			{/if}
			<div class="min-w-0">
				<p class="truncate font-semibold">{data.me.name}</p>
				<p class="truncate text-xs text-brass-300">{data.me.memberNumber}</p>
			</div>
		</div>

		{#if !forcedPassword}
			<nav class="space-y-1 px-3 py-4" aria-label="Members">
				{#each links as l (l.href)}
					<a
						href={l.href}
						onclick={() => (open = false)}
						aria-current={active(l.href) ? 'page' : undefined}
						class="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors {active(
							l.href
						)
							? 'bg-ivory-100/10 text-ivory-50'
							: 'text-ivory-200/70 hover:bg-ivory-100/5 hover:text-ivory-50'}"
					>
						<l.icon class="size-4" />
						<span class="flex-1">{l.label}</span>
						{#if l.href === '/member/transactions' && data.awaitingMe}
							<span
								class="rounded-full bg-brass-400 px-2 py-0.5 text-[0.7rem] font-semibold text-ink-950"
								>{data.awaitingMe}</span
							>
						{/if}
						{#if l.href === '/member/membership' && data.status.state !== 'active'}
							<span class="size-2 rounded-full bg-laterite-400" title="Renewal due"></span>
						{/if}
					</a>
				{/each}
			</nav>
		{/if}

		<div class="mt-auto border-t border-ivory-100/10 px-5 py-5">
			<a href="/" class="block text-sm text-ivory-200/60 hover:text-ivory-50">← Website</a>
			<form method="POST" action="/logout" class="mt-3">
				<button class="flex items-center gap-2 text-sm text-ivory-200/70 hover:text-ivory-50"
					><LogOut class="size-4" /> Sign out</button
				>
			</form>
		</div>
	</aside>

	<main class="min-w-0 px-5 py-8 sm:px-10 sm:py-12">
		{#if data.status.state === 'expired' && !forcedPassword && !page.url.pathname.startsWith('/member/membership')}
			<p class="mb-8 rounded-md bg-laterite-500/10 px-4 py-3 text-sm text-laterite-500">
				Your membership has expired, so you’re hidden from the directory.
				<a href="/member/membership" class="font-semibold underline">Renew now</a>
			</p>
		{:else if data.status.state === 'expiring' && !forcedPassword && !page.url.pathname.startsWith('/member/membership')}
			<p class="mb-8 rounded-md bg-brass-200/60 px-4 py-3 text-sm text-ink-900">
				Your membership ends in {data.status.days} day{data.status.days === 1 ? '' : 's'}.
				<a href="/member/membership" class="font-semibold underline">Renew</a>
			</p>
		{/if}
		{@render children()}
	</main>
</div>
