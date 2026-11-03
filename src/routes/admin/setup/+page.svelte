<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	let busy = $state(false);
</script>

<main class="grid min-h-svh place-items-center bg-ink-950 px-6 py-16">
	<div class="w-full max-w-md">
		<img src="/brand/logo-light.png" alt="Salem Entrepreneurs Forum" class="mx-auto w-48" />
		<form
			method="POST"
			use:enhance={() => {
				busy = true;
				return async ({ update }) => {
					await update({ reset: false });
					busy = false;
				};
			}}
			class="mt-12 space-y-5 rounded-xl bg-ivory-50 p-8 shadow-2xl"
		>
			<div>
				<h1 class="display text-3xl">Create the first admin</h1>
				<p class="mt-2 text-sm text-stone-muted">
					This page works once. After the first admin exists, more admins are added from inside the
					admin.
				</p>
			</div>
			<label class="block">
				<span class="field-label">Setup key</span>
				<input name="key" type="password" autocomplete="off" required class="field-input" />
				<span class="mt-1.5 block text-xs text-stone-muted"
					>The value of <code>BETTER_AUTH_SECRET</code> in your Vercel environment variables.</span
				>
			</label>
			<label class="block">
				<span class="field-label">Your name</span>
				<input
					name="name"
					autocomplete="name"
					required
					value={form?.name ?? ''}
					class="field-input"
				/>
			</label>
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
			<div class="grid gap-5 sm:grid-cols-2">
				<label class="block">
					<span class="field-label">Password</span>
					<input
						name="password"
						type="password"
						autocomplete="new-password"
						minlength="8"
						required
						class="field-input"
					/>
				</label>
				<label class="block">
					<span class="field-label">Confirm password</span>
					<input
						name="confirm"
						type="password"
						autocomplete="new-password"
						minlength="8"
						required
						class="field-input"
					/>
				</label>
			</div>
			{#if form?.error}<p class="field-error" role="alert">{form.error}</p>{/if}
			<button disabled={busy} class="btn-primary w-full"
				>{busy ? 'Creating…' : 'Create admin and sign in'}</button
			>
		</form>
	</div>
</main>
