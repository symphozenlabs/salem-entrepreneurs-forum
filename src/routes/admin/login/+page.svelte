<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let busy = $state(false);
</script>

<main class="grid min-h-svh place-items-center bg-ink-950 px-6 py-16">
	<div class="w-full max-w-sm">
		<img src="/brand/logo-light.png" alt="Salem Entrepreneurs Forum" class="mx-auto w-48" />
		<form
			method="POST"
			use:enhance={() => {
				busy = true;
				return async ({ update }) => {
					await update();
					busy = false;
				};
			}}
			class="mt-12 space-y-5 rounded-xl bg-ivory-50 p-8 shadow-2xl"
		>
			<div>
				<h1 class="display text-3xl">Admin sign in</h1>
				<p class="mt-2 text-sm text-stone-muted">Manage events, enquiries and admins.</p>
			</div>
			<label class="block">
				<span class="field-label">Email</span>
				<input
					name="email"
					type="email"
					autocomplete="username"
					required
					value={form?.email ?? ''}
					class="field-input"
				/>
			</label>
			<label class="block">
				<span class="field-label">Password</span>
				<input
					name="password"
					type="password"
					autocomplete="current-password"
					required
					class="field-input"
				/>
			</label>
			{#if data.dbError}
				<p class="rounded-md bg-laterite-500/10 px-3 py-2 text-sm text-laterite-500" role="alert">
					The database isn’t reachable or its tables haven’t been created yet. Run
					<code>npm run db:push</code> against the production database.
				</p>
			{/if}
			{#if form?.error}<p class="field-error" role="alert">{form.error}</p>{/if}
			<button disabled={busy} class="btn-primary w-full">{busy ? 'Signing in…' : 'Sign in'}</button>
			{#if data.needsSetup}
				<p class="border-t border-ink-900/10 pt-5 text-sm text-stone-muted">
					No admin account exists yet. <a href="/admin/setup" class="font-semibold text-brass-600"
						>Create the first one →</a
					>
				</p>
			{/if}
		</form>
		<p class="mt-8 text-center text-xs text-ivory-200/50">
			<a href="/" class="hover:text-ivory-100">← Back to the website</a>
		</p>
	</div>
</main>
