<script lang="ts">
	import type { LayoutProps } from './$types';
	import { page } from '$app/state';
	import {
		CalendarDays,
		IdCard,
		ReceiptIndianRupee,
		UserPlus,
		ExternalLink,
		Inbox,
		IndianRupee,
		LayoutDashboard,
		LogOut,
		Menu,
		ShieldCheck,
		X
	} from '@lucide/svelte';

	let { data, children }: LayoutProps = $props();
	let open = $state(false);

	const links = $derived([
		{ href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
		{
			href: '/admin/applications',
			label: 'Applications',
			icon: UserPlus,
			badge: data.pendingApplications
		},
		{ href: '/admin/members', label: 'Members', icon: IdCard },
		{
			href: '/admin/payments',
			label: 'Payments',
			icon: ReceiptIndianRupee,
			badge: data.pendingPayments
		},
		{ href: '/admin/events', label: 'Events', icon: CalendarDays },
		{ href: '/admin/enquiries', label: 'Enquiries', icon: Inbox, badge: data.openEnquiries },
		{ href: '/admin/membership', label: 'Membership & payment', icon: IndianRupee },
		{ href: '/admin/admins', label: 'Admins & account', icon: ShieldCheck }
	]);

	const active = (href: string) =>
		page.url.pathname === href || (href !== '/admin' && page.url.pathname.startsWith(href + '/'));
</script>

<div class="lg:grid lg:min-h-svh lg:grid-cols-[16rem_1fr]">
	<!-- Mobile bar -->
	<div class="flex items-center justify-between bg-ink-950 px-5 py-4 lg:hidden">
		<img src="/brand/logo-light.png" alt="SEF admin" class="h-8" />
		<button
			onclick={() => (open = !open)}
			class="text-ivory-100"
			aria-label={open ? 'Close menu' : 'Open menu'}
			aria-expanded={open}
		>
			{#if open}<X />{:else}<Menu />{/if}
		</button>
	</div>

	<aside
		class="flex-col bg-ink-950 px-4 py-6 text-ivory-100 lg:sticky lg:top-0 lg:flex lg:h-svh {open
			? 'flex'
			: 'hidden'}"
	>
		<a href="/admin" class="hidden px-3 lg:block"
			><img src="/brand/logo-light.png" alt="SEF admin" class="w-40" /></a
		>
		<p class="eyebrow mt-3 hidden px-3 text-brass-300 lg:block">Admin</p>

		<nav class="mt-2 space-y-1 lg:mt-10" aria-label="Admin">
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
					{#if l.badge}
						<span
							class="rounded-full bg-brass-400 px-2 py-0.5 text-[0.7rem] font-semibold text-ink-950"
							>{l.badge}</span
						>
					{/if}
				</a>
			{/each}
			<a
				href="/"
				target="_blank"
				class="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-ivory-200/70 transition-colors hover:bg-ivory-100/5 hover:text-ivory-50"
			>
				<ExternalLink class="size-4" /> View website
			</a>
		</nav>

		<div class="mt-8 border-t border-ivory-100/10 px-3 pt-5 lg:mt-auto">
			<p class="truncate text-sm text-ivory-50">{data.me.name}</p>
			<p class="truncate text-xs text-ivory-200/50">{data.me.email}</p>
			<form method="POST" action="/admin/logout" class="mt-4">
				<button class="flex items-center gap-2 text-sm text-ivory-200/70 hover:text-ivory-50">
					<LogOut class="size-4" /> Sign out
				</button>
			</form>
		</div>
	</aside>

	<div class="min-w-0 px-5 py-8 sm:px-10 sm:py-12">
		{@render children()}
	</div>
</div>
