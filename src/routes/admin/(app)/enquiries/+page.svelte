<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';
	import { eventShortDate, eventTime } from '#lib/events.ts';

	let { data }: PageProps = $props();
	let confirming = $state<number | null>(null);

	const tabs = [
		{ key: 'open', label: 'Open' },
		{ key: 'handled', label: 'Handled' },
		{ key: 'all', label: 'All' }
	];
	const digits = (phone: string) => phone.replace(/\D/g, '').replace(/^(\d{10})$/, '91$1');
</script>

<p class="eyebrow text-brass-600">Enquiries</p>
<h1 class="display mt-2 text-4xl">Contact form messages</h1>
<p class="mt-2 text-sm text-stone-muted">
	Mark a message handled once someone from the secretariat has replied.
</p>

<nav class="mt-8 flex gap-2" aria-label="Filter">
	{#each tabs as t (t.key)}
		<a
			href="?show={t.key}"
			aria-current={data.show === t.key ? 'page' : undefined}
			class="rounded-full px-4 py-1.5 text-sm {data.show === t.key
				? 'bg-ink-900 text-ivory-50'
				: 'bg-white text-ink-700 hover:text-ink-900'}"
			>{t.label}{t.key === 'open' && data.openEnquiries ? ` (${data.openEnquiries})` : ''}</a
		>
	{/each}
</nav>

{#if data.messages.length}
	<ul class="mt-6 space-y-4">
		{#each data.messages as m (m.id)}
			<li class="rounded-lg border border-ink-900/10 bg-white p-5 {m.handled ? 'opacity-70' : ''}">
				<div class="flex flex-wrap items-start justify-between gap-3">
					<div>
						<p class="font-semibold">
							{m.name}{#if m.business}<span class="font-normal text-stone-muted">
									· {m.business}</span
								>{/if}
						</p>
						<p class="mt-1 text-sm text-stone-muted">
							{eventShortDate(m.createdAt)}, {eventTime(m.createdAt)}
						</p>
					</div>
					{#if !m.handled}<span
							class="rounded-full bg-brass-200 px-2.5 py-0.5 text-xs font-semibold text-brass-600"
							>Open</span
						>{/if}
				</div>
				<p class="mt-4 whitespace-pre-line text-ink-800">{m.message}</p>
				<div class="mt-5 flex flex-wrap items-center gap-2 border-t border-ink-900/10 pt-4">
					<a href="tel:{m.phone}" class="btn-quiet !px-3 !py-1.5">Call {m.phone}</a>
					<a
						href="https://wa.me/{digits(m.phone)}"
						target="_blank"
						rel="noopener"
						class="btn-quiet !px-3 !py-1.5">WhatsApp</a
					>
					<a href="mailto:{m.email}" class="btn-quiet !px-3 !py-1.5">{m.email}</a>
					<span class="flex-1"></span>
					<form method="POST" use:enhance>
						<input type="hidden" name="id" value={m.id} />
						<button
							formaction={m.handled ? '?/reopen' : '?/handled'}
							class="btn-primary !px-3 !py-1.5"
						>
							{m.handled ? 'Reopen' : 'Mark handled'}
						</button>
					</form>
					{#if confirming === m.id}
						<form
							method="POST"
							action="?/delete"
							use:enhance={() =>
								async ({ update }) => {
									confirming = null;
									await update();
								}}
							class="flex gap-2"
						>
							<input type="hidden" name="id" value={m.id} />
							<button class="btn-danger !px-3 !py-1.5">Delete for good</button>
							<button
								type="button"
								onclick={() => (confirming = null)}
								class="btn-quiet !px-3 !py-1.5">Cancel</button
							>
						</form>
					{:else}
						<button onclick={() => (confirming = m.id)} class="btn-quiet !px-3 !py-1.5"
							>Delete</button
						>
					{/if}
				</div>
			</li>
		{/each}
	</ul>
{:else}
	<p
		class="mt-6 rounded-lg border border-dashed border-ink-900/20 bg-white px-6 py-12 text-center text-sm text-stone-muted"
	>
		{data.show === 'open'
			? 'Nothing waiting — every enquiry has been handled.'
			: 'No messages here yet.'}
	</p>
{/if}
