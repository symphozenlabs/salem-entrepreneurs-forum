<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';
	import { rupees } from '#lib/content.ts';
	import { eventShortDate, eventTime } from '#lib/events.ts';
	import CredentialsNotice from '#lib/components/admin/CredentialsNotice.svelte';

	let { data, form }: PageProps = $props();
	let rejecting = $state<number | null>(null);
	let busy = $state<number | null>(null);

	const tabs = [
		{ key: 'pending', label: 'Waiting' },
		{ key: 'approved', label: 'Approved' },
		{ key: 'rejected', label: 'Rejected' }
	];
	const when = (d: Date) => `${eventShortDate(d)}, ${eventTime(d)}`;
	const act = (id: number) => () => {
		busy = id;
		return async ({ update }: { update: () => Promise<void> }) => {
			await update();
			busy = null;
			rejecting = null;
		};
	};
</script>

<p class="eyebrow text-brass-600">Applications</p>
<h1 class="display mt-2 text-4xl">Membership applications</h1>
<p class="mt-2 max-w-2xl text-sm text-stone-muted">
	Check each UPI transaction ID against your bank or UPI app. Approving creates the member’s login
	and emails it to them.
</p>

{#if form?.approved}
	<div class="mt-6">
		<CredentialsNotice {...form.approved} />
	</div>
{/if}
{#if form?.rejected}
	<p class="mt-6 rounded-md bg-ivory-200 px-4 py-3 text-sm" role="status">
		Application rejected{form.rejected.emailed
			? ' and the applicant was emailed'
			: ' — email isn’t set up, so let them know yourself'}.
	</p>
{/if}
{#if form?.error}<p class="field-error mt-6" role="alert">{form.error}</p>{/if}

<nav class="mt-8 flex gap-2" aria-label="Filter">
	{#each tabs as t (t.key)}
		<a
			href="?show={t.key}"
			aria-current={data.show === t.key ? 'page' : undefined}
			class="rounded-full px-4 py-1.5 text-sm {data.show === t.key
				? 'bg-ink-900 text-ivory-50'
				: 'bg-white text-ink-700 hover:text-ink-900'}"
			>{t.label}{t.key === 'pending' && data.pendingApplications
				? ` (${data.pendingApplications})`
				: ''}</a
		>
	{/each}
</nav>

{#if data.applications.length}
	<ul class="mt-6 space-y-4">
		{#each data.applications as { app, paymentId, amount, utr, hasProof } (app.id)}
			<li class="rounded-lg border border-ink-900/10 bg-white p-5 sm:p-6">
				<div class="flex flex-wrap items-start justify-between gap-4">
					<div>
						<p class="text-lg font-semibold">{app.name}</p>
						<p class="text-sm text-ink-700">
							{app.designation ? `${app.designation}, ` : ''}{app.business} · {app.industry}{app.city
								? ` · ${app.city}`
								: ''}
						</p>
						<p class="mt-1 text-sm text-stone-muted">Applied {when(app.createdAt)}</p>
					</div>
					{#if amount !== null}
						<div class="rounded-md bg-ivory-100 px-4 py-3 text-right">
							<p class="display text-2xl">{rupees(amount)}</p>
							<p class="font-mono text-sm">UTR {utr}</p>
							{#if hasProof && paymentId}
								<a
									href="/admin/proof/{paymentId}"
									target="_blank"
									class="text-xs font-semibold text-brass-600">View screenshot ↗</a
								>
							{/if}
						</div>
					{/if}
				</div>

				<dl class="mt-5 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
					<div>
						<dt class="text-stone-muted">Email</dt>
						<dd><a href="mailto:{app.email}" class="hover:text-brass-600">{app.email}</a></dd>
					</div>
					<div>
						<dt class="text-stone-muted">Phone</dt>
						<dd><a href="tel:{app.phone}" class="hover:text-brass-600">{app.phone}</a></dd>
					</div>
					{#if app.website}<div>
							<dt class="text-stone-muted">Website</dt>
							<dd>
								<a href={app.website} target="_blank" rel="noopener" class="text-brass-600"
									>{app.website}</a
								>
							</dd>
						</div>{/if}
					{#if app.referredBy}<div>
							<dt class="text-stone-muted">Referred by</dt>
							<dd>{app.referredBy}</dd>
						</div>{/if}
					{#if app.about}<div class="sm:col-span-2">
							<dt class="text-stone-muted">About</dt>
							<dd class="whitespace-pre-line">{app.about}</dd>
						</div>{/if}
					{#if app.adminNote}<div class="sm:col-span-2">
							<dt class="text-stone-muted">Reason given</dt>
							<dd>{app.adminNote}</dd>
						</div>{/if}
					{#if app.reviewedAt}<div>
							<dt class="text-stone-muted">Reviewed</dt>
							<dd>{when(app.reviewedAt)}</dd>
						</div>{/if}
				</dl>

				{#if app.status === 'pending'}
					<div class="mt-5 border-t border-ink-900/10 pt-4">
						{#if rejecting === app.id}
							<form
								method="POST"
								action="?/reject"
								use:enhance={act(app.id)}
								class="flex flex-wrap gap-2"
							>
								<input type="hidden" name="id" value={app.id} />
								<input
									name="note"
									maxlength="500"
									placeholder="Reason, e.g. payment not received for this UTR"
									class="field-input !mt-0 min-w-0 flex-1"
								/>
								<button disabled={busy === app.id} class="btn-danger">Reject</button>
								<button type="button" onclick={() => (rejecting = null)} class="btn-quiet"
									>Cancel</button
								>
							</form>
						{:else}
							<div class="flex flex-wrap gap-2">
								<form method="POST" action="?/approve" use:enhance={act(app.id)}>
									<input type="hidden" name="id" value={app.id} />
									<button disabled={busy === app.id} class="btn-primary"
										>{busy === app.id
											? 'Approving…'
											: 'Payment received — approve & send login'}</button
									>
								</form>
								<button onclick={() => (rejecting = app.id)} class="btn-quiet">Reject</button>
							</div>
						{/if}
					</div>
				{/if}
			</li>
		{/each}
	</ul>
{:else}
	<p
		class="mt-6 rounded-lg border border-dashed border-ink-900/20 bg-white px-6 py-12 text-center text-sm text-stone-muted"
	>
		{data.show === 'pending' ? 'No applications waiting.' : 'None yet.'}
	</p>
{/if}
