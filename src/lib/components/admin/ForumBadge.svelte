<script lang="ts">
	import { forums, isForumId } from '#lib/forums.ts';

	let { forum }: { forum: string } = $props();
	const label = $derived(isForumId(forum) ? forums[forum].brand.short : 'All forums');
	const title = $derived(isForumId(forum) ? forums[forum].brand.name : 'Listed on every forum');
</script>

<span
	{title}
	class="rounded-full bg-ink-900/5 px-2 py-0.5 text-[0.7rem] font-semibold tracking-wide text-ink-700"
	>{label}</span
>
