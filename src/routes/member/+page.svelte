<script lang="ts">
	import type { PageProps } from './$types';
	import { page } from '$app/state';
	import { Award, Handshake, ArrowLeftRight, Users } from '@lucide/svelte';
	import { levelFor, levelTone, nextReward, pts } from '#lib/loyalty.ts';
	import { rupees } from '#lib/content.ts';
	import { eventShortDate } from '#lib/events.ts';
	import MemberCard from '#lib/components/MemberCard.svelte';
	import { isLifetimeMember, profileCompletion } from '#lib/membership.ts';

	let { data }: PageProps = $props();

	const lifetime = $derived(isLifetimeMember(data.me.expiresAt));
	const validTill = $derived(
		lifetime
			? 'LIFETIME'
			: new Intl.DateTimeFormat('en-IN', {
					month: '2-digit',
					year: '2-digit',
					timeZone: 'Asia/Kolkata'
				})
					.format(data.me.expiresAt)
					.replace('/', ' / ')
	);
	const completion = $derived(profileCompletion(data.me));
	const stats = $derived([
		...(data.features.connects
			? [
					{
						label: 'Connects given',
						value: String(data.perf.connectsGiven),
						href: '/member/connects?view=given'
					},
					{
						label: 'Connects received',
						value: String(data.perf.connectsReceived),
						href: '/member/connects?view=received'
					}
				]
			: []),
		...(data.features.transactions
			? [
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
				]
			: [])
	]);
	const next = $derived(data.points ? nextReward(data.points.available) : undefined);
	const lv = $derived(
		data.points ? levelFor(data.points.levelPoints, data.points.levelOverride) : undefined
	);
	const actions = $derived([
		...(data.features.connects
			? [
					{
						href: '/member/connects',
						label: 'Give a connect',
						hint: 'Pass a lead to a member',
						icon: Handshake
					}
				]
			: []),
		...(data.features.transactions
			? [
					{
						href: '/member/transactions',
						label: 'Record business',
						hint: 'Thank a member for business',
						icon: ArrowLeftRight
					}
				]
			: []),
		{
			href: '/member/directory',
			label: 'Find a member',
			hint: 'Search by name or industry',
			icon: Users
		}
	]);
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
		<section class="rounded-lg border border-ink-900/10 bg-white p-5 sm:p-6">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 class="font-semibold">Profile completion</h2>
					<p class="mt-1 text-sm text-stone-muted">
						{completion.missing.length
							? `Still to add: ${completion.missing.slice(0, 3).join(', ')}${completion.missing.length > 3 ? ` and ${completion.missing.length - 3} more` : ''}`
							: 'Your profile is complete.'}
					</p>
				</div>
				<p class="display text-3xl text-brass-600">{completion.percent}%</p>
			</div>
			<div
				class="mt-4 h-2.5 overflow-hidden rounded-full bg-ink-900/10"
				role="progressbar"
				aria-label="Profile completion"
				aria-valuemin="0"
				aria-valuemax="100"
				aria-valuenow={completion.percent}
			>
				<div class="h-full rounded-full bg-brass-400" style="width: {completion.percent}%"></div>
			</div>
			{#if completion.missing.length}
				<a href="/member/profile" class="btn-primary mt-4">Complete my profile</a>
			{/if}
		</section>

		{#if stats.length}
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
		{/if}

		<section
			class="grid gap-4 {actions.length === 3
				? 'sm:grid-cols-3'
				: actions.length === 2
					? 'sm:grid-cols-2'
					: 'max-w-sm'}"
		>
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

		{#if data.features.transactions}
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
		{/if}
	</div>

	<aside>
		<MemberCard
			name={data.me.name}
			number={data.me.memberNumber}
			{validTill}
			category={data.me.industry}
			business={data.me.business}
		/>
		<p class="mt-4 text-center text-sm text-stone-muted">
			Member since {eventShortDate(data.me.joinedAt)} · {lifetime
				? 'Lifetime'
				: `valid till ${eventShortDate(data.me.expiresAt)}`}
		</p>
		{#if data.points}
			{@const points = data.points}
			<a
				href="/member/points"
				class="mt-6 block rounded-lg bg-ink-900 p-5 text-ivory-100 transition-colors hover:bg-ink-700"
			>
				<p class="flex items-center justify-between gap-2 text-sm text-ivory-200/70">
					<span class="flex items-center gap-2"
						><Award class="size-4 text-brass-300" /> Loyalty points</span
					>
					{#if lv}<span
							class="rounded-full px-2 py-0.5 text-xs font-semibold {levelTone[lv.level.key]}"
							>{lv.level.label}</span
						>{/if}
				</p>
				<p class="display mt-2 text-3xl text-brass-300">{pts(points.balance)} PTS</p>
				<p class="mt-1 text-sm text-ivory-200/60">
					{next
						? `${pts(next.cost - points.available)} to ${next.label}`
						: 'Every reward is within reach'}
				</p>
			</a>
		{/if}
	</aside>
</div>
