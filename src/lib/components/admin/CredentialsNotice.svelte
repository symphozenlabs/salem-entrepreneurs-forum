<script lang="ts">
	import { page } from '$app/state';

	type Props = { name: string; email: string; password: string; emailed: boolean; phone?: string };
	let { name, email, password, emailed, phone }: Props = $props();
	let copied = $state(false);

	const message = $derived(
		`Hello ${name}, your SEF member login:\n${page.url.origin}/login\nEmail: ${email}\nTemporary password: ${password}\nYou'll choose your own password when you first sign in.`
	);
	const wa = $derived(
		phone
			? `https://wa.me/${phone.replace(/\D/g, '').replace(/^(\d{10})$/, '91$1')}?text=${encodeURIComponent(message)}`
			: null
	);

	async function copy() {
		try {
			await navigator.clipboard.writeText(message);
			copied = true;
		} catch {
			/* select the text by hand */
		}
	}
</script>

<div
	class="rounded-lg border p-5 {emailed
		? 'border-emerald-300 bg-emerald-50'
		: 'border-brass-400 bg-brass-200/30'}"
	role="status"
>
	{#if emailed}
		<p class="font-semibold text-emerald-900">Login emailed to {email}.</p>
		<p class="mt-1 text-sm text-emerald-900/80">
			They’ll set their own password when they first sign in.
		</p>
	{:else}
		<p class="font-semibold">
			Email isn’t set up (or didn’t send) — share this login with {name} yourself.
		</p>
		<p class="mt-1 text-sm text-stone-muted">
			It’s shown only now. If you lose it, use “Reset password” in Members.
		</p>
		<pre class="mt-4 rounded bg-white p-4 font-mono text-sm whitespace-pre-wrap">{message}</pre>
		<div class="mt-3 flex flex-wrap gap-2">
			<button type="button" onclick={copy} class="btn-quiet !py-2"
				>{copied ? 'Copied' : 'Copy message'}</button
			>
			{#if wa}<a href={wa} target="_blank" rel="noopener" class="btn-quiet !py-2"
					>Send on WhatsApp</a
				>{/if}
		</div>
	{/if}
</div>
