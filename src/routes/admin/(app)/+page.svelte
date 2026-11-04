<script lang="ts">
	import type { PageProps } from './$types';
	import { eventShortDate, eventTime } from '#lib/events.ts';
	import { rupees } from '#lib/content.ts';

	let { data }: PageProps = $props();

	const stats = $derived([
		{
			label: 'Applications to verify',
			value: String(data.pendingApplications),
			href: '/admin/applications'
		},
		{
			label: 'Payments to verify (events, joining, renewals)',
			value: String(data.pendingPayments),
			href: '/admin/payments'
		},
		{ label: 'Active members', value: String(data.activeMembers), href: '/admin/members' },
		{ label: 'Open enquiries', value: String(data.openEnquiries), href: '/admin/enquiries' },
		{
			label: 'Upcoming events on the site',
			value: String(data.upcomingTotal),
			href: '/admin/events'
		},
		{
			label: 'Connects between members',
			value: String(data.network.connects),
			href: '/admin/members'
		},
		{
			label: 'Business recorded (confirmed)',
			value: rupees(data.network.business),
			href: '/admin/members'
		}
	]);
	const when = (d: Date) => `${eventShortDate(d)}, ${eventTime(d)}`;
</script>

<header class="flex flex-wrap items-end justify-between gap-4">
	<div>
		<p class="eyebrow text-brass-600">Dashboard</p>
		<h1 class="display mt-2 text-4xl">Welcome, {data.me.name.split(' ')[0]}.</h1>
	</div>
	<a href="/admin/events/new" class="btn-primary">+ New event</a>
</header>

<div class="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
	{#each stats as s (s.label)}
		<a
			href={s.href}
			class="rounded-lg border border-ink-900/10 bg-white p-5 transition-colors hover:border-brass-400"
		>
			<p class="display text-4xl">{s.value}</p>
			<p class="mt-2 text-sm text-stone-muted">{s.label}</p>
		</a>
	{/each}
</div>

<div class="mt-10 grid gap-8 xl:grid-cols-2">
	<section class="rounded-lg border border-ink-900/10 bg-white">
		<div class="flex items-center justify-between border-b border-ink-900/10 px-5 py-4">
			<h2 class="font-semibold">Next on the calendar</h2>
			<a href="/admin/events" class="text-sm text-brass-600 hover:text-brass-500">All events</a>
		</div>
		{#if data.upcoming.length}
			<ul class="divide-y divide-ink-900/10">
				{#each data.upcoming as e (e.id)}
					<li>
						<a href="/admin/events/{e.id}" class="block px-5 py-4 hover:bg-ivory-50">
							<p class="font-medium">{e.title}</p>
							<p class="mt-1 text-sm text-stone-muted">{when(e.startsAt)} · {e.venue}</p>
						</a>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="px-5 py-8 text-sm text-stone-muted">
				No upcoming events are published, so the home page’s events section is hidden.
				<a href="/admin/events/new" class="font-semibold text-brass-600">Add one →</a>
			</p>
		{/if}
	</section>

	<section class="rounded-lg border border-ink-900/10 bg-white">
		<div class="flex items-center justify-between border-b border-ink-900/10 px-5 py-4">
			<h2 class="font-semibold">Latest enquiries</h2>
			<a href="/admin/enquiries" class="text-sm text-brass-600 hover:text-brass-500"
				>All enquiries</a
			>
		</div>
		{#if data.recent.length}
			<ul class="divide-y divide-ink-900/10">
				{#each data.recent as m (m.id)}
					<li class="px-5 py-4">
						<p class="flex items-center gap-2 font-medium">
							{m.name}
							{#if !m.handled}<span
									class="rounded-full bg-brass-200 px-2 py-0.5 text-[0.7rem] font-semibold text-brass-600"
									>Open</span
								>{/if}
						</p>
						<p class="mt-1 line-clamp-1 text-sm text-stone-muted">{m.message}</p>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="px-5 py-8 text-sm text-stone-muted">
				Messages from the website’s contact form will appear here.
			</p>
		{/if}
	</section>
</div>
