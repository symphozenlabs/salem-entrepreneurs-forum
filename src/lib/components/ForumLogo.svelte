<script lang="ts">
	import type { Forum } from '#lib/forums.ts';

	type Props = {
		forum: Forum;
		tone?: 'light' | 'ink';
		/** Classes for the image logo. */
		class?: string;
		/** Classes for the text wordmark (size, colour) used when the forum has no logo yet. */
		text?: string;
		alt?: string;
	};
	let {
		forum,
		tone = 'light',
		class: cls = '',
		text = '',
		alt = forum.brand.name
	}: Props = $props();
</script>

{#if forum.logo}
	<img src={tone === 'light' ? forum.logo.light : forum.logo.ink} {alt} class={cls} />
{:else}
	<!-- Text wordmark until the forum has its own logo; inherits the surrounding colour. -->
	<span
		class="inline-flex flex-col justify-center leading-none whitespace-nowrap {text}"
		role="img"
		aria-label={alt}
	>
		<span class="display text-[1.35em] tracking-tight">{forum.brand.place}</span>
		<span class="mt-[0.35em] text-[0.42em] font-semibold tracking-[0.32em] uppercase opacity-80"
			>Entrepreneurs Forum</span
		>
	</span>
{/if}
