<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';
	import { eventShortDate } from '#lib/events.ts';
	import { membershipStatus } from '#lib/membership.ts';
	import CredentialsNotice from '#lib/components/admin/CredentialsNotice.svelte';

	let { data, form }: PageProps = $props();
	let confirming = $state<string | null>(null);

	const badge = {
		active: 'bg-emerald-100 text-emerald-800',
		expiring: 'bg-brass-200 text-brass-600',
		expired: 'bg-laterite-500/10 text-laterite-500'
	};
	const label = { active: 'Active', expiring: 'Renewal due', expired: 'Expired' };
</script>

<p class="eyebrow text-brass-600">Members</p>
<h1 class="display mt-2 text-4xl">All members</h1>

{#if form?.reset}<div class="mt-6"><CredentialsNotice {...form.reset} /></div>{/if}
{#if form?.removed}<p class="mt-6 rounded-md bg-ivory-200 px-4 py-3 text-sm" role="status">
		{form.removed} was removed.
	</p>{/if}
{#if form?.error}<p class="field-error mt-6" role="alert">{form.error}</p>{/if}

<form method="GET" class="mt-8 flex max-w-xl gap-3">
	<input
		type="search"
		name="q"
		value={data.q}
		placeholder="Search name, email, phone, business or number"
		class="field-input !mt-0 flex-1"
	/>
	<button class="btn-primary">Search</button>
</form>
<p class="mt-3 text-sm text-stone-muted">
	{data.members.length} member{data.members.length === 1 ? '' : 's'}
</p>

{#if data.members.length}
	<div class="mt-4 overflow-x-auto rounded-lg border border-ink-900/10 bg-white">
		<table class="w-full min-w-[56rem] text-left text-sm">
			<thead class="border-b border-ink-900/10 text-xs tracking-wide text-stone-muted uppercase">
				<tr>
					<th class="px-4 py-3 font-semibold">Member</th>
					<th class="px-4 py-3 font-semibold">Business</th>
					<th class="px-4 py-3 font-semibold">Contact</th>
					<th class="px-4 py-3 font-semibold">Membership</th>
					<th class="px-4 py-3 font-semibold"></th>
				</tr>
			</thead>
			<tbody class="divide-y divide-ink-900/10">
				{#each data.members as m (m.id)}
					{@const s = membershipStatus(m.expiresAt)}
					<tr class="align-top">
						<td class="px-4 py-4">
							<p class="font-medium">{m.name}</p>
							<p class="text-xs text-stone-muted">
								{m.memberNumber}{m.mustChangePassword ? ' · still on temporary password' : ''}
							</p>
						</td>
						<td class="px-4 py-4"
							>{m.business}<span class="block text-xs text-stone-muted">{m.industry}</span></td
						>
						<td class="px-4 py-4">
							<a href="mailto:{m.email}" class="block hover:text-brass-600">{m.email}</a>
							<a href="tel:{m.phone}" class="text-xs text-stone-muted hover:text-brass-600"
								>{m.phone}</a
							>
						</td>
						<td class="px-4 py-4">
							<span class="rounded-full px-2 py-0.5 text-xs font-semibold {badge[s.state]}"
								>{label[s.state]}</span
							>
							<span class="mt-1 block text-xs text-stone-muted"
								>Since {eventShortDate(m.joinedAt)} · till {eventShortDate(m.expiresAt)}</span
							>
						</td>
						<td class="px-4 py-4">
							<div class="flex flex-wrap justify-end gap-2">
								<form method="POST" action="?/reset" use:enhance>
									<input type="hidden" name="id" value={m.id} />
									<button class="btn-quiet !px-3 !py-1.5">Reset password</button>
								</form>
								{#if confirming === m.id}
									<form
										method="POST"
										action="?/remove"
										use:enhance={() =>
											async ({ update }) => {
												confirming = null;
												await update();
											}}
										class="flex gap-2"
									>
										<input type="hidden" name="id" value={m.id} />
										<button class="btn-danger !px-3 !py-1.5">Remove for good</button>
										<button
											type="button"
											onclick={() => (confirming = null)}
											class="btn-quiet !px-3 !py-1.5">Cancel</button
										>
									</form>
								{:else}
									<button onclick={() => (confirming = m.id)} class="btn-quiet !px-3 !py-1.5"
										>Remove</button
									>
								{/if}
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{:else}
	<p
		class="mt-6 rounded-lg border border-dashed border-ink-900/20 bg-white px-6 py-12 text-center text-sm text-stone-muted"
	>
		{data.q ? 'No members match.' : 'No members yet — approve an application to add the first.'}
	</p>
{/if}
