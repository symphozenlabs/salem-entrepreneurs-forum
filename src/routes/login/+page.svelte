<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';
	import { brand, contact } from '#lib/content.ts';

	let { form }: PageProps = $props();
	let busy = $state(false);
</script>

<svelte:head>
	<title>Member login — {brand.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="grid min-h-svh bg-ink-950 lg:grid-cols-2">
	<div class="relative hidden overflow-hidden lg:block">
		<img
			src="/story/stills/desktop/k6.webp"
			alt=""
			class="absolute inset-0 h-full w-full object-cover opacity-70"
		/>
		<div class="absolute inset-0 bg-gradient-to-r from-ink-950/40 to-ink-950"></div>
		<p class="display absolute bottom-16 left-14 max-w-md text-5xl text-ivory-50">
			Your seat is waiting.
		</p>
	</div>

	<div class="flex items-center justify-center px-6 py-16">
		<div class="w-full max-w-sm">
			<a href="/" aria-label="{brand.name} — home"
				><img src="/brand/logo-light.png" alt={brand.name} class="w-48" /></a
			>
			<form
				method="POST"
				use:enhance={() => {
					busy = true;
					return async ({ update }) => {
						await update();
						busy = false;
					};
				}}
				class="mt-12 space-y-5"
			>
				<div>
					<h1 class="display text-4xl text-ivory-50">Member login</h1>
					<p class="mt-2 text-sm text-ivory-200/60">
						Your login was emailed when your membership was approved.
					</p>
				</div>
				<label class="block">
					<span class="field-label !text-ivory-200/80">Email</span>
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
					<span class="field-label !text-ivory-200/80">Password</span>
					<input
						name="password"
						type="password"
						autocomplete="current-password"
						required
						class="field-input"
					/>
				</label>
				{#if form?.error}<p class="text-sm text-laterite-400" role="alert">{form.error}</p>{/if}
				<button
					disabled={busy}
					class="w-full rounded-full bg-brass-400 py-3.5 text-sm font-semibold text-ink-950 transition-colors hover:bg-brass-300 disabled:opacity-60"
				>
					{busy ? 'Signing in…' : 'Sign in'}
				</button>
			</form>
			<div class="mt-8 space-y-2 border-t border-ivory-100/10 pt-6 text-sm text-ivory-200/60">
				<p>
					Forgot your password? <a
						href={contact.whatsapp}
						target="_blank"
						rel="noopener"
						class="text-brass-300">WhatsApp the secretariat</a
					> for a new one.
				</p>
				<p>Not a member yet? <a href="/join" class="text-brass-300">Apply for membership</a></p>
			</div>
		</div>
	</div>
</main>
