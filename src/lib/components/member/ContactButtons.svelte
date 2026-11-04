<script lang="ts">
	import { Mail, MessageCircle, Phone } from '@lucide/svelte';

	let { phone, email }: { phone: string; email: string } = $props();

	const digits = $derived(phone.replace(/\D/g, '').replace(/^(\d{10})$/, '91$1'));
	const cls =
		'inline-flex items-center gap-1.5 rounded-md border border-ink-900/15 px-2.5 py-1.5 text-xs font-semibold text-ink-900 hover:border-brass-500 hover:text-brass-600';
</script>

<div class="flex flex-wrap gap-2">
	<a href="tel:+{digits}" class={cls}><Phone class="size-3.5" /> Call</a>
	<a href="https://wa.me/{digits}" target="_blank" rel="noopener" class={cls}
		><MessageCircle class="size-3.5" /> WhatsApp</a
	>
	<a href="mailto:{email}" class={cls}><Mail class="size-3.5" /> Email</a>
</div>
