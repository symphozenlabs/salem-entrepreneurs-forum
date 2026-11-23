<script lang="ts">
	import Pagination from '#lib/components/Pagination.svelte';
	import { hubs } from '#lib/network.ts';
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';
	import { eventShortDate } from '#lib/events.ts';
	import { isLifetimeMember, isPhoneLogin, loginId, membershipStatus } from '#lib/membership.ts';
	import CredentialsNotice from '#lib/components/admin/CredentialsNotice.svelte';
	import IndustryField from '#lib/components/IndustryField.svelte';
	import { ArrowDown, ArrowUp, Download, Upload, UserPlus, X } from '@lucide/svelte';
	import { page } from '$app/state';

	let { data, form }: PageProps = $props();
	let confirming = $state<string | null>(null);

	const badge = {
		active: 'bg-emerald-100 text-emerald-800',
		expiring: 'bg-brass-200 text-brass-600',
		expired: 'bg-laterite-500/10 text-laterite-500'
	};
	const label = { active: 'Active', expiring: 'Renewal due', expired: 'Expired' };

	/** This page's address with some query values changed (and back to page 1). */
	function withParams(changes: Record<string, string>) {
		const u = new URL(page.url.href);
		for (const [k, v] of Object.entries(changes))
			v ? u.searchParams.set(k, v) : u.searchParams.delete(k);
		u.searchParams.delete('page');
		return u.pathname + u.search;
	}
	/** Clicking a title sorts by it; clicking it again flips the order. */
	const sortHref = (key: string) =>
		withParams({
			sort: key === 'number' ? '' : key,
			dir: data.sort === key && data.dir === 'asc' ? 'desc' : ''
		});
	const filtered = $derived(Object.values(data.filters).some(Boolean) || !!data.q);
	const titles = [
		{ key: 'number', label: 'Member' },
		{ key: 'hub', label: 'Hub' },
		{ key: 'business', label: 'Business' },
		{ key: 'contact', label: 'Contact' },
		{ key: 'expires', label: 'Membership' }
	];

	const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
	const addForm = $derived(form && 'add' in form ? form.add : undefined);
	const imported = $derived(form && 'imported' in form ? form.imported : undefined);
	const problems = $derived(imported && 'problems' in imported ? (imported.problems ?? []) : []);
	let panel = $state<'add' | 'import' | null>(null);
	$effect(() => {
		if (addForm) panel = 'add';
		else if (imported && !('added' in imported)) panel = 'import';
	});
	let busy = $state(false);
	const submit = () => {
		busy = true;
		return async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) => {
			await update({ reset: false });
			busy = false;
		};
	};
	const val = (k: string) => (addForm?.values as Record<string, string> | undefined)?.[k] ?? '';
	const err = (k: string) => (addForm?.errors as Record<string, string> | undefined)?.[k];

	/** The new logins as a spreadsheet, for sharing by hand. */
	function downloadLogins(
		rows: {
			name: string;
			email: string;
			password: string;
			memberNumber: string;
			phone: string;
			emailed: boolean;
		}[]
	) {
		const q = (v: string) => `"${v.replace(/"/g, '""')}"`;
		const lines = [
			['Member number', 'Name', 'Sign in with', 'Phone', 'Password', 'Login emailed'],
			...rows.map((r) => [
				r.memberNumber,
				r.name,
				loginId(r.email),
				r.phone,
				r.password,
				r.emailed ? 'Yes' : 'No'
			])
		].map((l) => l.map(q).join(','));
		const url = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/csv' }));
		const a = Object.assign(document.createElement('a'), {
			href: url,
			download: 'new-member-logins.csv'
		});
		a.click();
		URL.revokeObjectURL(url);
	}
</script>

<div class="flex flex-wrap items-end justify-between gap-4">
	<div>
		<p class="eyebrow text-brass-600">Members</p>
		<h1 class="display mt-2 text-4xl">All members</h1>
	</div>
	<div class="flex flex-wrap gap-2">
		<button
			type="button"
			onclick={() => (panel = panel === 'add' ? null : 'add')}
			class="btn-primary"
			aria-expanded={panel === 'add'}><UserPlus class="size-4" /> Add member</button
		>
		<button
			type="button"
			onclick={() => (panel = panel === 'import' ? null : 'import')}
			class="btn-quiet"
			aria-expanded={panel === 'import'}><Upload class="size-4" /> Bulk upload</button
		>
	</div>
</div>

{#if form && 'added' in form && form.added}
	<div class="mt-6 space-y-2">
		<p class="text-sm font-semibold">
			{form.added.name} added as <span class="font-mono">{form.added.memberNumber}</span>.
		</p>
		<CredentialsNotice {...form.added} />
	</div>
{/if}

{#if imported && 'added' in imported}
	<div class="mt-6 rounded-lg border border-emerald-300 bg-emerald-50 p-5" role="status">
		<p class="font-semibold text-emerald-900">
			{imported.added.length} member{imported.added.length === 1 ? '' : 's'} added.
			{#if imported.added.some((a) => a.emailed)}
				Logins were emailed to {imported.added.filter((a) => a.emailed).length} of them.
			{/if}
		</p>
		{#if imported.added.some((a) => !a.emailed)}
			<p class="mt-1 text-sm text-emerald-900/80">
				Some logins weren’t emailed. Download them now to share by hand — the passwords are shown
				only once (you can always use “Reset password” later).
			</p>
		{/if}
		{#if imported.skipped?.length}
			<p class="mt-2 text-sm text-stone-muted">
				Skipped rows: {imported.skipped
					.map((p) => `${p.row}${p.name ? ` (${p.name})` : ''}`)
					.join(', ')}.
			</p>
		{/if}
		{#if imported.failed.length}
			<p class="mt-2 text-sm text-laterite-500">Not added: {imported.failed.join(' ')}</p>
		{/if}
		<button
			type="button"
			onclick={() => downloadLogins(imported.added)}
			class="btn-quiet mt-4 !py-2"><Download class="size-4" /> Download logins (CSV)</button
		>
		<details class="mt-4 text-sm">
			<summary class="cursor-pointer font-semibold">Member numbers given</summary>
			<ul class="mt-2 space-y-0.5">
				{#each imported.added as a (a.email)}<li>
						<span class="font-mono">{a.memberNumber}</span> · {a.name}
					</li>{/each}
			</ul>
		</details>
	</div>
{/if}

{#if panel === 'add'}
	<form
		method="POST"
		action="?/add"
		use:enhance={submit}
		class="mt-6 rounded-lg border border-ink-900/10 bg-white p-5 sm:p-7"
	>
		<h2 class="font-semibold">Add a member</h2>
		<p class="mt-1 text-sm text-stone-muted">
			They sign in with their email (or mobile number if there’s no email) and their mobile number
			as the starting password, then choose their own. They get the next member number for their hub
			— SEF-… for Salem, CEF-… for Coimbatore, TNEF-… for Tamil Nadu.
		</p>
		<div class="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
			{#each [['name', 'Full name *', 'text'], ['email', 'Email', 'email'], ['phone', 'Mobile number *', 'tel'], ['business', 'Business name *', 'text']] as [k, l, t] (k)}
				<label class="block">
					<span class="field-label">{l}</span>
					<input name={k} type={t} required={k !== 'email'} value={val(k)} class="field-input" />
					{#if err(k)}<span class="field-error">{err(k)}</span>{/if}
				</label>
			{/each}
			<div class="sm:col-span-2">
				<IndustryField
					value={val('industry')}
					error={err('industry')}
					options={data.categoryOptions}
				/>
			</div>
			<label class="block">
				<span class="field-label">Hub *</span>
				<select name="hub" required class="field-input">
					{#each hubs as h (h)}<option selected={(val('hub') || 'Salem') === h}>{h}</option>{/each}
				</select>
				{#if err('hub')}<span class="field-error">{err('hub')}</span>{/if}
			</label>
			<label class="block">
				<span class="field-label">Joining date *</span>
				<input
					name="joinedOn"
					type="date"
					required
					max={today}
					value={val('joinedOn') || today}
					class="field-input"
				/>
				{#if err('joinedOn')}<span class="field-error">{err('joinedOn')}</span>{/if}
			</label>
			{#each [['designation', 'Designation'], ['city', 'City'], ['instagram', 'Instagram'], ['website', 'Website']] as [k, l] (k)}
				<label class="block">
					<span class="field-label">{l}</span>
					<input name={k} value={val(k)} class="field-input" />
					{#if err(k)}<span class="field-error">{err(k)}</span>{/if}
				</label>
			{/each}
		</div>
		<div class="mt-8 flex gap-2">
			<button disabled={busy} class="btn-primary">{busy ? 'Adding…' : 'Add member'}</button>
			<button type="button" onclick={() => (panel = null)} class="btn-quiet">Cancel</button>
		</div>
	</form>
{:else if panel === 'import'}
	<form
		method="POST"
		action="?/import"
		enctype="multipart/form-data"
		use:enhance={submit}
		class="mt-6 rounded-lg border border-ink-900/10 bg-white p-5 sm:p-7"
	>
		<h2 class="font-semibold">Bulk upload members</h2>
		<ol class="mt-3 list-decimal space-y-1 pl-5 text-sm text-stone-muted">
			<li>
				<a href="/admin/members/template.csv" class="font-semibold text-brass-600 hover:underline"
					>Download the template</a
				> and open it in Excel or Google Sheets.
			</li>
			<li>
				One member per row. Only <strong class="text-ink-900">Name and Phone</strong> are needed — members
				add their business and category from their profile. Without an email, a member signs in with their
				mobile number. Hub (Salem, Coimbatore or Tamil Nadu) defaults to the city, else Salem; Joining
				date (DD-MM-YYYY) defaults to today. A Google Form export works as it is. Delete the example row.
			</li>
			<li>Save it as CSV (File → Save as / Download → CSV) and upload it here.</li>
		</ol>
		<p class="mt-3 text-sm text-stone-muted">
			{#if data.firstImportDone}
				New members get the next numbers in each hub’s series, in the file’s row order.
			{:else}
				<strong class="text-ink-900">First upload:</strong> member numbers follow joining dates (earliest
				first) in each hub’s series. Later uploads follow the file’s row order.
			{/if} If any row has a problem, nothing is added — fix the rows listed and upload again. Up to 200
			members at a time.
		</p>
		<input
			type="file"
			name="file"
			accept=".csv,text/csv"
			required
			class="mt-5 block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-ink-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-ivory-50"
		/>
		{#if imported && 'error' in imported}<p class="field-error mt-4">{imported.error}</p>{/if}
		{#if problems.length}
			<div class="mt-4 rounded-md bg-laterite-500/5 p-4 text-sm">
				<p class="font-semibold text-laterite-500">
					Nothing was added — {problems.length} row{problems.length === 1 ? ' needs' : 's need'} fixing:
				</p>
				<ul class="mt-2 space-y-1.5">
					{#each problems as p (p.row)}
						<li>
							<strong>Row {p.row}{p.name ? ` (${p.name})` : ''}:</strong>
							{p.problems.join(' ')}
						</li>
					{/each}
				</ul>
			</div>
		{/if}
		{#if problems.length}
			<label class="mt-4 flex items-start gap-2 text-sm">
				<input type="checkbox" name="skipProblems" class="mt-0.5" />
				<span
					>Add everyone else now and skip the {problems.length} row{problems.length === 1
						? ''
						: 's'} above (add them later, one by one or in another file).</span
				>
			</label>
		{/if}
		<div class="mt-6 flex gap-2">
			<button disabled={busy} class="btn-primary">{busy ? 'Uploading…' : 'Upload members'}</button>
			<button type="button" onclick={() => (panel = null)} class="btn-quiet">Cancel</button>
		</div>
	</form>
{/if}

{#if form?.reset}<div class="mt-6"><CredentialsNotice {...form.reset} /></div>{/if}
{#if form?.removed}<p class="mt-6 rounded-md bg-ivory-200 px-4 py-3 text-sm" role="status">
		{form.removed} was removed.
	</p>{/if}
{#if form?.error}<p class="field-error mt-6" role="alert">{form.error}</p>{/if}

<form method="GET" class="mt-8 space-y-3">
	<div class="flex max-w-xl gap-3">
		<input
			type="search"
			name="q"
			value={data.q}
			placeholder="Search name, email, phone, business or number"
			class="field-input !mt-0 flex-1"
		/>
		<button class="btn-primary">Search</button>
	</div>
	<div class="flex flex-wrap items-center gap-2 text-sm">
		<input type="hidden" name="sort" value={data.sort === 'number' ? '' : data.sort} />
		<input type="hidden" name="dir" value={data.dir === 'desc' ? 'desc' : ''} />
		<select
			name="hub"
			aria-label="Filter by hub"
			onchange={(e) => e.currentTarget.form?.requestSubmit()}
			class="rounded-md border-ink-900/15 py-1.5 pr-8 text-sm"
		>
			<option value="">All hubs</option>
			{#each hubs as h (h)}<option selected={data.filters.hub === h}>{h}</option>{/each}
		</select>
		<select
			name="category"
			aria-label="Filter by category"
			onchange={(e) => e.currentTarget.form?.requestSubmit()}
			class="max-w-56 rounded-md border-ink-900/15 py-1.5 pr-8 text-sm"
		>
			<option value="">All categories</option>
			{#if data.hasBlankCategory}<option value="—" selected={data.filters.category === '—'}
					>Category not filled in</option
				>{/if}
			{#each data.categories as c (c)}<option selected={data.filters.category === c}>{c}</option
				>{/each}
		</select>
		<select
			name="status"
			aria-label="Filter by membership"
			onchange={(e) => e.currentTarget.form?.requestSubmit()}
			class="rounded-md border-ink-900/15 py-1.5 pr-8 text-sm"
		>
			<option value="">Any membership</option>
			<option value="active" selected={data.filters.status === 'active'}>Active</option>
			<option value="expiring" selected={data.filters.status === 'expiring'}>Renewal due</option>
			<option value="expired" selected={data.filters.status === 'expired'}>Expired</option>
		</select>
		<select
			name="signin"
			aria-label="Filter by sign-in"
			onchange={(e) => e.currentTarget.form?.requestSubmit()}
			class="rounded-md border-ink-900/15 py-1.5 pr-8 text-sm"
		>
			<option value="">Signed in or not</option>
			<option value="yes" selected={data.filters.signin === 'yes'}>Has signed in</option>
			<option value="no" selected={data.filters.signin === 'no'}>Hasn’t signed in yet</option>
		</select>
		{#if filtered}
			<a href="/admin/members" class="inline-flex items-center gap-1 text-brass-600 hover:underline"
				><X class="size-3.5" /> Clear</a
			>
		{/if}
	</div>
</form>
<p class="mt-3 text-sm text-stone-muted">
	{data.pager.total}{filtered ? ` of ${data.totalMembers}` : ''} member{data.pager.total === 1
		? ''
		: 's'}
</p>

{#if data.members.length}
	<div class="mt-4 overflow-x-auto rounded-lg border border-ink-900/10 bg-white">
		<table class="w-full min-w-[56rem] text-left text-sm">
			<thead class="border-b border-ink-900/10 text-xs tracking-wide text-stone-muted uppercase">
				<tr>
					{#each titles as t (t.key)}
						<th
							class="px-4 py-3 font-semibold"
							aria-sort={data.sort === t.key
								? data.dir === 'asc'
									? 'ascending'
									: 'descending'
								: undefined}
						>
							<a
								href={sortHref(t.key)}
								class="inline-flex items-center gap-1 uppercase hover:text-ink-900 {data.sort ===
								t.key
									? 'text-ink-900'
									: ''}"
								>{t.label}{#if data.sort === t.key}{#if data.dir === 'asc'}<ArrowUp
											class="size-3"
										/>{:else}<ArrowDown class="size-3" />{/if}{/if}</a
							>
						</th>
					{/each}
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
								{m.memberNumber}{m.mustChangePassword ? ' · hasn’t signed in yet' : ''}
							</p>
						</td>
						<td class="px-4 py-4">
							<form method="POST" action="?/hub" use:enhance>
								<input type="hidden" name="id" value={m.id} />
								<select
									name="hub"
									aria-label="Hub for {m.name}"
									onchange={(e) => e.currentTarget.form?.requestSubmit()}
									class="rounded-md border-ink-900/15 py-1.5 pr-8 text-sm"
								>
									{#each hubs as h (h)}<option selected={m.hub === h}>{h}</option>{/each}
								</select>
							</form>
						</td>
						<td class="px-4 py-4"
							>{m.business}<span class="block text-xs text-stone-muted">{m.industry}</span></td
						>
						<td class="px-4 py-4">
							{#if isPhoneLogin(m.email)}
								<span class="block text-stone-muted">No email · signs in with mobile</span>
							{:else}
								<a href="mailto:{m.email}" class="block hover:text-brass-600">{m.email}</a>
							{/if}
							<a href="tel:{m.phone}" class="text-xs text-stone-muted hover:text-brass-600"
								>{m.phone}</a
							>
						</td>
						<td class="px-4 py-4">
							<span class="rounded-full px-2 py-0.5 text-xs font-semibold {badge[s.state]}"
								>{label[s.state]}</span
							>
							<span class="mt-1 block text-xs text-stone-muted"
								>Since {eventShortDate(m.joinedAt)} · {isLifetimeMember(m.expiresAt)
									? 'Lifetime'
									: `till ${eventShortDate(m.expiresAt)}`}</span
							>
						</td>
						<td class="px-4 py-4">
							<div class="flex flex-wrap justify-end gap-2">
								<a href="/admin/members/{m.id}/poster" class="btn-quiet !px-3 !py-1.5">Poster</a>
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
	<Pagination pager={data.pager} />
{:else}
	<p
		class="mt-6 rounded-lg border border-dashed border-ink-900/20 bg-white px-6 py-12 text-center text-sm text-stone-muted"
	>
		{filtered
			? 'No members match.'
			: 'No members yet — use Add member or Bulk upload, or approve an application.'}
	</p>
{/if}
