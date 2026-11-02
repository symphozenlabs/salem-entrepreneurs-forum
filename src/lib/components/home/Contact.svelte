<script lang="ts">
	import { enhance } from '$app/forms';
	import { contact } from '#lib/content.ts';
	import { reveal } from '#lib/motion.ts';

	type Props = { form?: { ok?: boolean; error?: string } | null };
	let { form }: Props = $props();
	let sending = $state(false);

	const fields = [
		{ name: 'name', label: 'Full name', type: 'text', autocomplete: 'name', required: true },
		{ name: 'phone', label: 'Phone / WhatsApp', type: 'tel', autocomplete: 'tel', required: true },
		{ name: 'email', label: 'Email', type: 'email', autocomplete: 'email', required: true },
		{ name: 'business', label: 'Business name', type: 'text', autocomplete: 'organization', required: false }
	] as const;
</script>

<section id="contact" data-nav="light" class="bg-ivory-100 py-32 sm:py-44">
	<div class="mx-auto grid max-w-7xl gap-20 px-6 sm:px-10 lg:grid-cols-[5fr_7fr]">
		<div>
			<p class="eyebrow text-brass-600">Club secretariat</p>
			<h2 use:reveal class="display mt-6 text-[clamp(2.75rem,5vw,4.75rem)] text-ink-900">
				Get in touch.
			</h2>
			<p class="mt-6 max-w-sm text-stone-muted">
				Questions about membership, conclave sponsorship or chapter affiliation — we reply within a
				day.
			</p>

			<dl class="mt-14 space-y-8 text-ink-900">
				<div>
					<dt class="eyebrow text-stone-muted">Visit</dt>
					<dd class="mt-2 leading-relaxed">
						{#each contact.address as line (line)}{line}<br />{/each}
					</dd>
				</div>
				<div>
					<dt class="eyebrow text-stone-muted">Call</dt>
					<dd class="mt-2"><a href={contact.phoneHref} class="hover:text-brass-600">{contact.phone}</a></dd>
				</div>
				<div>
					<dt class="eyebrow text-stone-muted">Write</dt>
					<dd class="mt-2"><a href="mailto:{contact.email}" class="hover:text-brass-600">{contact.email}</a></dd>
				</div>
			</dl>

			<a
				href={contact.whatsapp}
				target="_blank"
				rel="noopener"
				class="mt-12 inline-flex items-center gap-3 rounded-full border border-ink-900/15 px-6 py-3.5 text-sm font-semibold text-ink-900 transition-colors hover:border-brass-500 hover:text-brass-600"
			>
				<span class="size-2 rounded-full bg-[#25D366]"></span> Message us on WhatsApp
			</a>
		</div>

		<form
			method="POST"
			action="?/contact"
			use:enhance={() => {
				sending = true;
				return async ({ update }) => {
					await update();
					sending = false;
				};
			}}
			class="grid content-start gap-x-8 gap-y-2 sm:grid-cols-2"
		>
			{#each fields as f (f.name)}
				<label class="group relative block pt-6">
					<input
						name={f.name}
						type={f.type}
						autocomplete={f.autocomplete}
						required={f.required}
						placeholder=" "
						class="peer w-full border-0 border-b border-ink-900/20 bg-transparent px-0 py-3 text-lg text-ink-900 focus:border-brass-500 focus:ring-0 focus-visible:outline-none"
					/>
					<span
						class="pointer-events-none absolute top-9 left-0 text-stone-muted transition-all duration-300 peer-focus:top-0 peer-focus:text-xs peer-focus:tracking-widest peer-focus:text-brass-600 peer-focus:uppercase peer-not-placeholder-shown:top-0 peer-not-placeholder-shown:text-xs peer-not-placeholder-shown:tracking-widest peer-not-placeholder-shown:uppercase"
						>{f.label}{f.required ? '' : ' (optional)'}</span
					>
				</label>
			{/each}
			<label class="relative block pt-6 sm:col-span-2">
				<textarea
					name="message"
					required
					rows="4"
					placeholder=" "
					class="peer w-full resize-none border-0 border-b border-ink-900/20 bg-transparent px-0 py-3 text-lg text-ink-900 focus:border-brass-500 focus:ring-0 focus-visible:outline-none"
				></textarea>
				<span
					class="pointer-events-none absolute top-9 left-0 text-stone-muted transition-all duration-300 peer-focus:top-0 peer-focus:text-xs peer-focus:tracking-widest peer-focus:text-brass-600 peer-focus:uppercase peer-not-placeholder-shown:top-0 peer-not-placeholder-shown:text-xs peer-not-placeholder-shown:tracking-widest peer-not-placeholder-shown:uppercase"
					>Your message</span
				>
			</label>

			<div class="mt-8 flex flex-wrap items-center gap-6 sm:col-span-2">
				<button
					disabled={sending}
					class="rounded-full bg-ink-900 px-10 py-4 text-sm font-semibold tracking-wide text-ivory-100 transition-colors hover:bg-ink-700 disabled:opacity-60"
				>
					{sending ? 'Sending…' : 'Send message'}
				</button>
				<p aria-live="polite" class="text-sm">
					{#if form?.ok}
						<span class="text-brass-600">Thank you — the secretariat will be in touch shortly.</span>
					{:else if form?.error}
						<span class="text-laterite-500">{form.error}</span>
					{/if}
				</p>
			</div>
		</form>
	</div>
</section>
