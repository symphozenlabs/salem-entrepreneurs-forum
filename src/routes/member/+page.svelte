<script lang="ts">
	import type { PageProps } from './$types';
	import { page } from '$app/state';
	import { Handshake, ArrowLeftRight, Users } from '@lucide/svelte';
	import { rupees } from '#lib/content.ts';
	import { eventShortDate } from '#lib/events.ts';
	import MemberCard from '#lib/components/MemberCard.svelte';

	let { data }: PageProps = $props();

	const validTill = $derived(
		new Intl.DateTimeFormat('en-IN', {
			month: '2-digit',
			year: '2-digit',
			timeZone: 'Asia/Kolkata'
		})
			.format(data.me.expiresAt)
			.replace('/', ' / ')
	);
	const stats = $derived([
		{
			label: 'Connects given',
			value: String(data.perf.connectsGiven),
			href: '/member/connects?view=given'
		},
		{
			label: 'Connects received',
			value: String(data.perf.connectsReceived),
			href: '/member/connects?view=received'
		},
		{
			label: 'Business given',
			value: rupees(data.perf.businessGiven),
			href: '/member/transactions'
		},
		{
			label: 'Business received',
			value: rupees(data.perf.businessReceived),
			href: '/member/transactions'
		}
	]);
	const actions = [
		{
			href: '/member/connects',
			label: 'Give a connect',
			hint: 'Pass a lead to a member',
			icon: Handshake
		},
		{
			href: '/member/transactions',
			label: 'Record business',
			hint: 'Thank a member for business',
			icon: ArrowLeftRight
		},
		{
			href: '/member/directory',
			label: 'Find a member',
			hint: 'Search by name or industry',
			icon: Users
		}
	];
</script>

{#if page.url.searchParams.has('welcome')}
	<p class="mb-8 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">
		Password saved. Welcome aboard — start by <a
			href="/member/profile"
			class="font-semibold underline">completing your profile</a
		> so members can find you.
	</p>
{/if}

<p class="eyebrow text-brass-600">Overview</p>
<h1 class="display mt-2 text-4xl">Hello, {data.me.name.split(' ')[0]}.</h1>

<div class="mt-10 grid gap-10 xl:grid-cols-[1fr_24rem]">
	<div class="space-y-10">
		<section>
			<h2 class="text-sm font-semibold tracking-wide text-ink-700">My performance</h2>
			<div class="mt-4 grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
				{#each stats as s (s.label)}
					<a
						href={s.href}
						class="rounded-lg border border-ink-900/10 bg-white p-5 transition-colors hover:border-brass-400"
					>
						<p class="display text-3xl">{s.value}</p>
						<p class="mt-2 text-sm text-stone-muted">{s.label}</p>
					</a>
				{/each}
			</div>
		</section>

		<section class="grid gap-4 sm:grid-cols-3">
			{#each actions as a (a.href)}
				<a
					href={a.href}
					class="group rounded-lg bg-ink-900 p-5 text-ivory-100 transition-colors hover:bg-ink-700"
				>
					<a.icon class="size-5 text-brass-300" />
					<p class="mt-4 font-semibold">{a.label}</p>
					<p class="mt-1 text-sm text-ivory-200/60">{a.hint}</p>
				</a>
			{/each}
		</section>

		<section class="rounded-lg border border-ink-900/10 bg-white">
			<div class="flex items-center justify-between border-b border-ink-900/10 px-5 py-4">
				<h2 class="font-semibold">Waiting for your confirmation</h2>
				<a href="/member/transactions" class="text-sm text-brass-600">All transactions</a>
			</div>
			{#if data.awaiting.length}
				<ul class="divide-y divide-ink-900/10">
					{#each data.awaiting as t (t.id)}
						<li class="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
							<div>
								<p class="font-medium">
									{t.direction === 'received'
										? `${t.otherName} says they gave you ${rupees(t.amount)} of business`
										: `${t.otherName} says they got ${rupees(t.amount)} of business from you`}
								</p>
								<p class="text-sm text-stone-muted">
									{eventShortDate(t.createdAt)}{t.description ? ` · ${t.description}` : ''}
								</p>
							</div>
							<a href="/member/transactions" class="btn-primary !px-3 !py-1.5">Review</a>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="px-5 py-6 text-sm text-stone-muted">
					Nothing waiting. When a member records business with you, it shows here for you to
					confirm.
				</p>
			{/if}
		</section>
	</div>

	<aside>
		<MemberCard
			name={data.me.name}
			number={data.me.memberNumber}
			{validTill}
			industry="{data.me.industry} · {data.me.business}"
		/>
		<p class="mt-4 text-center text-sm text-stone-muted">
			Member since {eventShortDate(data.me.joinedAt)} · valid till {eventShortDate(
				data.me.expiresAt
			)}
		</p>
	</aside>
</div>
