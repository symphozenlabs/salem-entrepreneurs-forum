<script lang="ts">
	import type { PageProps } from './$types';
	import { photoUrl } from '#lib/network.ts';
	import ContactButtons from '#lib/components/member/ContactButtons.svelte';

	let { data }: PageProps = $props();
	const m = $derived(data.member);
</script>

<a href="/member/directory" class="text-sm text-stone-muted hover:text-ink-900">← Directory</a>

{#if data.self || !m}
	<p class="mt-6 text-stone-muted">
		This is you. <a href="/member/profile" class="font-semibold text-brass-600"
			>Edit your profile →</a
		>
	</p>
{:else}
	{@const photo = photoUrl(m)}
	<div class="mt-6 grid gap-8 xl:grid-cols-[1fr_20rem]">
		<section class="rounded-lg border border-ink-900/10 bg-white p-6 sm:p-8">
			<div class="flex flex-wrap items-center gap-5">
				{#if photo}
					<img src={photo} alt="" class="size-24 rounded-full object-cover" />
				{:else}
					<span
						class="display grid size-24 place-items-center rounded-full bg-ink-900 text-3xl text-brass-300"
						>{m.name[0]}</span
					>
				{/if}
				<div>
					<h1 class="display text-4xl">{m.name}</h1>
					<p class="mt-1 text-ink-700">{m.designation ? `${m.designation}, ` : ''}{m.business}</p>
					<p class="text-sm text-stone-muted">
						{m.industry}{m.city ? ` · ${m.city}` : ''} · {m.memberNumber}
					</p>
				</div>
			</div>
			<dl class="mt-8 space-y-6">
				{#each [['About', m.about], ['What we offer', m.offerings], ['Looking for', m.lookingFor]] as [label, text] (label)}
					{#if text}
						<div>
							<dt class="eyebrow text-brass-600">{label}</dt>
							<dd class="mt-2 whitespace-pre-line text-ink-800">{text}</dd>
						</div>
					{/if}
				{/each}
				{#if m.website}
					<div>
						<dt class="eyebrow text-brass-600">Website</dt>
						<dd class="mt-2">
							<a
								href={m.website}
								target="_blank"
								rel="noopener"
								class="text-brass-600 hover:underline">{m.website}</a
							>
						</dd>
					</div>
				{/if}
			</dl>
		</section>

		<aside class="h-fit space-y-4 rounded-lg border border-ink-900/10 bg-white p-5">
			<p class="text-sm"><span class="text-stone-muted">Phone</span><br />{m.phone}</p>
			<p class="text-sm"><span class="text-stone-muted">Email</span><br />{m.email}</p>
			<ContactButtons phone={m.phone} email={m.email} />
			<a href="/member/connects?view=give&to={m.id}" class="btn-primary w-full">Give a connect</a>
			<a href="/member/transactions?view=record&with={m.id}" class="btn-quiet w-full"
				>Record business</a
			>
		</aside>
	</div>
{/if}
