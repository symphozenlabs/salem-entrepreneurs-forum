<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let busy = $state(false);
</script>

<div class="max-w-md">
	<p class="eyebrow text-brass-600">{data.firstTime ? 'Welcome' : 'Security'}</p>
	<h1 class="display mt-2 text-4xl">
		{data.firstTime ? 'Choose your password' : 'Change your password'}
	</h1>
	{#if data.firstTime}
		<p class="mt-3 text-stone-muted">
			You signed in with the temporary password from your welcome email. Set your own before
			continuing.
		</p>
	{/if}

	<form
		method="POST"
		use:enhance={() => {
			busy = true;
			return async ({ update }) => {
				await update();
				busy = false;
			};
		}}
		class="mt-8 space-y-5 rounded-lg border border-ink-900/10 bg-white p-6"
	>
		<input type="hidden" name="username" autocomplete="username" value={data.me.email} />
		<label class="block">
			<span class="field-label">{data.firstTime ? 'Temporary password' : 'Current password'}</span>
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
				minlength="8"
				required
				class="field-input"
			/>
			<span class="mt-1.5 block text-xs text-stone-muted">At least 8 characters.</span>
		</label>
		<label class="block">
			<span class="field-label">Confirm new password</span>
			<input
				name="confirm"
				type="password"
				autocomplete="new-password"
				minlength="8"
				required
				class="field-input"
			/>
		</label>
		{#if form?.error}<p class="field-error" role="alert">{form.error}</p>{/if}
		<button disabled={busy} class="btn-primary w-full">{busy ? 'Saving…' : 'Save password'}</button>
	</form>
</div>
