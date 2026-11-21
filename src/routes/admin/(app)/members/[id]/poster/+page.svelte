<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { ArrowLeft, Download, ImagePlus, Save } from '@lucide/svelte';
	import type { PageProps } from './$types';
	import { forums, type ForumId } from '#lib/forums.ts';
	import {
		cutOutPerson,
		drawPoster,
		loadImage,
		loadPosterAssets,
		POSTER,
		type PhotoStyle,
		type PosterImages
	} from '#lib/poster.ts';

	let { data }: PageProps = $props();

	const initial = untrack(() => data);
	const forum = forums[initial.forumId as ForumId];
	let name = $state(initial.member.name);
	let business = $state(initial.member.business);
	let designation = $state(initial.member.designation ?? '');
	let count = $state(initial.count);
	let style = $state<PhotoStyle>('framed');
	let zoom = $state(100);
	let moveX = $state(0);
	let moveY = $state(0);

	let canvas: HTMLCanvasElement;
	let images = $state.raw<PosterImages | null>(null);
	let cutoutState = $state<'none' | 'working' | 'ready' | 'failed'>('none');
	let message = $state('');
	let problem = $state('');
	let busy = $state(false);

	async function usePhoto(src: string) {
		if (!images) return;
		problem = '';
		cutoutState = 'working';
		try {
			const img = await loadImage(src);
			const size = { width: img.naturalWidth, height: img.naturalHeight };
			images = { ...images, photo: img, photoSize: size, cutout: null };
			zoom = 100;
			moveX = moveY = 0;
			const cutout = await cutOutPerson(img, size.width, size.height);
			images = { ...images, cutout };
			cutoutState = cutout ? 'ready' : 'failed';
			style = cutout ? 'cutout' : 'framed';
		} catch (e) {
			console.error('[poster] photo failed:', e);
			cutoutState = images?.photo ? 'failed' : 'none';
			style = 'framed';
			if (!images?.photo) problem = 'That photo couldn’t be opened. Try a JPEG or PNG.';
		}
	}

	function choosePhoto(e: Event & { currentTarget: HTMLInputElement }) {
		const file = e.currentTarget.files?.[0];
		if (file) usePhoto(URL.createObjectURL(file));
	}

	onMount(async () => {
		try {
			const assets = await loadPosterAssets(`/poster/${forum.id}.jpg`, forum.logo?.light ?? null);
			images = { ...assets, photo: null, photoSize: null, cutout: null };
			if (initial.member.photo) await usePhoto(initial.member.photo);
		} catch (e) {
			console.error('[poster] assets failed:', e);
			problem = 'The poster artwork couldn’t load. Please refresh the page.';
		}
	});

	$effect(() => {
		if (!images || !canvas) return;
		drawPoster(
			canvas,
			{
				forumName: forum.brand.name,
				place: forum.brand.place,
				name,
				business,
				designation,
				count,
				style,
				zoom,
				moveX,
				moveY
			},
			images
		);
	});

	const fileName = () => `${initial.member.memberNumber}-new-member-poster`;

	function download() {
		canvas.toBlob((blob) => {
			if (!blob) return;
			const url = URL.createObjectURL(blob);
			const a = Object.assign(document.createElement('a'), {
				href: url,
				download: `${fileName()}.png`
			});
			a.click();
			setTimeout(() => URL.revokeObjectURL(url), 2000);
		}, 'image/png');
	}

	async function post(action: string, body: FormData) {
		busy = true;
		message = problem = '';
		try {
			const res = await fetch(`?/${action}`, {
				method: 'POST',
				body,
				headers: { 'x-sveltekit-action': 'true' }
			});
			const result = deserialize(await res.text());
			if (result.type === 'success') {
				message =
					action === 'save'
						? 'Saved. The member can now download it.'
						: 'Count saved for all posters.';
				await invalidateAll();
			} else
				problem =
					result.type === 'failure' && typeof result.data?.error === 'string'
						? result.data.error
						: 'Couldn’t save. Please try again.';
		} catch {
			problem = 'Couldn’t save. Check your connection and try again.';
		}
		busy = false;
	}

	function saveForMember() {
		canvas.toBlob(
			(blob) => {
				if (!blob) return;
				const body = new FormData();
				body.set('poster', new File([blob], `${fileName()}.jpg`, { type: 'image/jpeg' }));
				post('save', body);
			},
			'image/jpeg',
			0.92
		);
	}

	function saveCount() {
		const body = new FormData();
		body.set('count', count);
		post('count', body);
	}
</script>

<a href="/admin/members" class="inline-flex items-center gap-1 text-sm text-brass-600">
	<ArrowLeft class="size-4" /> All members
</a>
<p class="eyebrow mt-4 text-brass-600">New member poster</p>
<h1 class="display mt-2 text-4xl">{initial.member.name}</h1>
<p class="mt-1 text-sm text-stone-muted">
	{initial.member.memberNumber} · {forum.brand.name} · {POSTER.width} × {POSTER.height} Instagram post
</p>

<div class="mt-8 grid items-start gap-8 xl:grid-cols-[minmax(0,34rem)_1fr]">
	<div class="overflow-hidden rounded-lg border border-ink-900/10 bg-ink-950 shadow-sm">
		<canvas
			bind:this={canvas}
			width={POSTER.width}
			height={POSTER.height}
			class="block h-auto w-full"
			aria-label="Poster preview"
		></canvas>
	</div>

	<div class="space-y-5 rounded-lg border border-ink-900/10 bg-white p-5 sm:p-7">
		<label class="block">
			<span class="field-label">Name</span>
			<input bind:value={name} maxlength="60" class="field-input" />
		</label>
		<label class="block">
			<span class="field-label">Business name</span>
			<input bind:value={business} maxlength="90" class="field-input" />
		</label>
		<label class="block">
			<span class="field-label">Designation</span>
			<input
				bind:value={designation}
				maxlength="50"
				placeholder="e.g. Chairman"
				class="field-input"
			/>
		</label>
		<div>
			<label class="block">
				<span class="field-label">Members count (all posters)</span>
				<span class="mt-1 flex gap-2">
					<input bind:value={count} maxlength="7" class="field-input !mt-0 w-32" />
					<button type="button" disabled={busy} onclick={saveCount} class="btn-quiet"
						>Save count</button
					>
				</span>
			</label>
		</div>

		<div class="border-t border-ink-900/10 pt-5">
			<span class="field-label">Photo</span>
			<label class="btn-quiet mt-2 cursor-pointer">
				<ImagePlus class="size-4" />
				{images?.photo ? 'Change photo' : 'Add photo'}
				<input
					type="file"
					accept="image/jpeg,image/png,image/webp"
					onchange={choosePhoto}
					class="sr-only"
				/>
			</label>
			{#if cutoutState === 'working'}
				<p class="mt-2 text-sm text-stone-muted" role="status">Removing the background…</p>
			{:else if cutoutState === 'failed'}
				<p class="mt-2 text-sm text-stone-muted" role="status">
					The background couldn’t be removed cleanly, so this uses the gold frame.
				</p>
			{/if}
			{#if images?.photo}
				<div class="mt-4 flex gap-2" role="group" aria-label="Photo style">
					<button
						type="button"
						disabled={cutoutState !== 'ready'}
						onclick={() => (style = 'cutout')}
						aria-pressed={style === 'cutout'}
						class={style === 'cutout' ? 'btn-primary' : 'btn-quiet'}>Background removed</button
					>
					<button
						type="button"
						onclick={() => (style = 'framed')}
						aria-pressed={style === 'framed'}
						class={style === 'framed' ? 'btn-primary' : 'btn-quiet'}>Gold frame</button
					>
				</div>
				<div class="mt-4 grid gap-4 sm:grid-cols-3">
					<label class="block text-sm"
						>Size <input
							type="range"
							min="60"
							max="180"
							bind:value={zoom}
							class="mt-1 w-full"
						/></label
					>
					<label class="block text-sm"
						>Left / right
						<input
							type="range"
							min="-220"
							max="220"
							bind:value={moveX}
							class="mt-1 w-full"
						/></label
					>
					<label class="block text-sm"
						>Up / down
						<input
							type="range"
							min="-260"
							max="260"
							bind:value={moveY}
							class="mt-1 w-full"
						/></label
					>
				</div>
			{/if}
		</div>

		{#if message}<p
				class="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
				role="status"
			>
				{message}
			</p>{/if}
		{#if problem}<p class="field-error" role="alert">{problem}</p>{/if}

		<div class="flex flex-wrap gap-2 border-t border-ink-900/10 pt-5">
			<button type="button" disabled={!images} onclick={download} class="btn-primary">
				<Download class="size-4" /> Download poster
			</button>
			<button type="button" disabled={!images || busy} onclick={saveForMember} class="btn-quiet">
				<Save class="size-4" />
				{busy ? 'Saving…' : data.member.hasPoster ? 'Update member’s copy' : 'Share with member'}
			</button>
		</div>
	</div>
</div>
