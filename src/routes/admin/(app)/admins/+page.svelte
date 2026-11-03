<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';
	import { eventShortDate } from '#lib/events.ts';

	let { data, form }: PageProps = $props();
	let confirming = $state<string | null>(null);
</script>

<p class="eyebrow text-brass-600">Admins & account</p>
<h1 class="display mt-2 text-4xl">Who can manage the site</h1>

<div class="mt-8 grid gap-8 xl:grid-cols-[1fr_24rem]">
	<section class="rounded-lg border border-ink-900/10 bg-white">
		<h2 class="border-b border-ink-900/10 px-5 py-4 font-semibold">Admins</h2>
		{#if form?.remove && 'error' in form.remove}<p class="field-error px-5 pt-4" role="alert">
				{form.remove.error}
			</p>{/if}
		<ul class="divide-y divide-ink-900/10">
			{#each data.admins as a (a.id)}
				<li class="flex flex-wrap items-center gap-3 px-5 py-4">
					<div class="min-w-0 flex-1">
						<p class="font-medium">{a.name}{a.id === data.me.id ? ' (you)' : ''}</p>
						<p class="truncate text-sm text-stone-muted">
							{a.email} · since {eventShortDate(a.createdAt)}
						</p>
					</div>
					{#if a.id !== data.me.id}
						{#if confirming === a.id}
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
								<input type="hidden" name="id" value={a.id} />
								<button class="btn-danger !px-3 !py-1.5">Remove access</button>
								<button
									type="button"
									onclick={() => (confirming = null)}
									class="btn-quiet !px-3 !py-1.5">Cancel</button
								>
							</form>
						{:else}
							<button onclick={() => (confirming = a.id)} class="btn-quiet !px-3 !py-1.5"
								>Remove</button
							>
						{/if}
					{/if}
				</li>
			{/each}
		</ul>
	</section>

	<div class="space-y-8">
		<form
			method="POST"
			action="?/add"
			use:enhance
			class="space-y-4 rounded-lg border border-ink-900/10 bg-white p-5"
		>
			<h2 class="font-semibold">Add an admin</h2>
			<label class="block">
				<span class="field-label">Name</span>
				<input
					name="name"
					required
					value={form?.add && 'name' in form.add ? form.add.name : ''}
					class="field-input"
				/>
			</label>
			<label class="block">
				<span class="field-label">Email</span>
				<input
					name="email"
					type="email"
					required
					value={form?.add && 'error' in form.add ? form.add.email : ''}
					class="field-input"
				/>
			</label>
			<label class="block">
				<span class="field-label">Temporary password</span>
				<input
					name="password"
					type="text"
					autocomplete="off"
					required
					minlength="8"
					class="field-input"
				/>
				<span class="mt-1.5 block text-xs text-stone-muted"
					>Share it with them privately; they can change it here after signing in.</span
				>
			</label>
			{#if form?.add && 'error' in form.add}<p class="field-error" role="alert">
					{form.add.error}
				</p>{/if}
			{#if form?.add && 'ok' in form.add}<p class="text-sm text-emerald-800" role="status">
					{form.add.email} can now sign in at /admin.
				</p>{/if}
			<button class="btn-primary w-full">Add admin</button>
		</form>

		<form
			method="POST"
			action="?/password"
			use:enhance
			class="space-y-4 rounded-lg border border-ink-900/10 bg-white p-5"
		>
			<h2 class="font-semibold">Change your password</h2>
			<input type="hidden" name="username" autocomplete="username" value={data.me.email} />
			<label class="block">
				<span class="field-label">Current password</span>
				<input
					name="current"
					type="password"
					autocomplete="current-password"
					required
					class="field-input"
				/>
			</label>
			<label class="block">
				<span class="field-label">New password</span>
				<input
					name="new"
					type="password"
					autocomplete="new-password"
					required
					minlength="8"
					class="field-input"
				/>
			</label>
			<label class="block">
				<span class="field-label">Confirm new password</span>
				<input
					name="confirm"
					type="password"
					autocomplete="new-password"
					required
					minlength="8"
					class="field-input"
				/>
			</label>
			{#if form?.password && 'error' in form.password}<p class="field-error" role="alert">
					{form.password.error}
				</p>{/if}
			{#if form?.password && 'ok' in form.password}<p
					class="text-sm text-emerald-800"
					role="status"
				>
					Password changed. Other devices were signed out.
				</p>{/if}
			<button class="btn-primary w-full">Change password</button>
		</form>
	</div>
</div>
