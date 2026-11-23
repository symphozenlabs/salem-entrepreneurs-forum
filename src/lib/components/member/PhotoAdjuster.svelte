<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import {
		ArrowDown,
		ArrowLeft,
		ArrowRight,
		ArrowUp,
		RotateCcw,
		ZoomIn,
		ZoomOut
	} from '@lucide/svelte';

	/** The member's round photo: choose one, then move and zoom it. Sends the framed result. */
	let {
		current,
		removed = false,
		onchosen
	}: { current: string | null; removed?: boolean; onchosen?: () => void } = $props();

	const OUTPUT = 600;
	const MIN_ZOOM = 1;
	const MAX_ZOOM = 3;

	let preview: HTMLCanvasElement;
	let output: HTMLInputElement;
	let img = $state.raw<HTMLImageElement | null>(null);
	let zoom = $state(1);
	let offsetX = $state(0);
	let offsetY = $state(0);
	let problem = $state('');
	let run = 0;

	const fit = () => {
		if (!img) return { width: 1, height: 1 };
		const s = Math.max(1 / img.naturalWidth, 1 / img.naturalHeight) * zoom;
		return { width: img.naturalWidth * s, height: img.naturalHeight * s };
	};
	const room = () => {
		const f = fit();
		return { x: Math.max(0, (f.width - 1) / 2), y: Math.max(0, (f.height - 1) / 2) };
	};
	const clampOffsets = () => {
		const r = room();
		offsetX = Math.max(-r.x, Math.min(r.x, offsetX));
		offsetY = Math.max(-r.y, Math.min(r.y, offsetY));
	};

	function paint(canvas: HTMLCanvasElement, size: number) {
		if (!img) return;
		canvas.width = canvas.height = size;
		const c = canvas.getContext('2d')!;
		const f = fit();
		c.imageSmoothingQuality = 'high';
		c.drawImage(
			img,
			(size - f.width * size) / 2 + offsetX * size,
			(size - f.height * size) / 2 + offsetY * size,
			f.width * size,
			f.height * size
		);
	}

	function sendFramed() {
		const mine = ++run;
		const canvas = document.createElement('canvas');
		paint(canvas, OUTPUT);
		canvas.toBlob(
			(blob) => {
				if (!blob || mine !== run) return;
				const dt = new DataTransfer();
				dt.items.add(new File([blob], 'profile.webp', { type: 'image/webp' }));
				output.files = dt.files;
				onchosen?.();
			},
			'image/webp',
			0.9
		);
	}

	async function open(src: string) {
		problem = '';
		const next = new Image();
		await new Promise<void>((resolve, reject) => {
			next.onload = () => resolve();
			next.onerror = () => reject(new Error('bad image'));
			next.src = src;
		});
		img = next;
		zoom = 1;
		offsetX = offsetY = 0;
	}

	async function choose(e: Event & { currentTarget: HTMLInputElement }) {
		const file = e.currentTarget.files?.[0];
		if (!file) return;
		try {
			await open(URL.createObjectURL(file));
			sendFramed();
		} catch {
			problem = 'That photo couldn’t be opened. Try a JPEG or PNG.';
		}
	}

	function move(dx: number, dy: number) {
		offsetX += dx * 0.06;
		offsetY += dy * 0.06;
		clampOffsets();
		sendFramed();
	}
	function changeZoom(by: number) {
		zoom = Math.round(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + by)) * 10) / 10;
		clampOffsets();
		sendFramed();
	}
	function reset() {
		zoom = 1;
		offsetX = offsetY = 0;
		sendFramed();
	}

	onMount(() => {
		const src = untrack(() => current);
		if (src) open(src).catch(() => (problem = 'Your photo couldn’t be loaded.'));
	});

	$effect(() => {
		void [img, zoom, offsetX, offsetY];
		if (img && preview) paint(preview, 288);
	});

	$effect(() => {
		if (removed && output) {
			run++;
			output.value = '';
		}
	});

	const controlClass =
		'grid size-9 place-items-center rounded-md border border-ink-900/15 bg-white text-ink-900 transition-colors hover:border-brass-500 hover:text-brass-600 disabled:opacity-40';
</script>

<div class="mx-auto mt-3 size-36 overflow-hidden rounded-full bg-ink-900">
	<canvas bind:this={preview} class="h-full w-full {img && !removed ? '' : 'hidden'}"></canvas>
</div>

{#if img && !removed}
	<div class="mt-4 flex items-center justify-center gap-4">
		<div class="grid grid-cols-3 gap-1" role="group" aria-label="Move photo">
			<span></span>
			<button type="button" class={controlClass} onclick={() => move(0, -1)} aria-label="Move up"
				><ArrowUp class="size-4" /></button
			>
			<span></span>
			<button type="button" class={controlClass} onclick={() => move(-1, 0)} aria-label="Move left"
				><ArrowLeft class="size-4" /></button
			>
			<button type="button" class={controlClass} onclick={reset} aria-label="Reset photo position"
				><RotateCcw class="size-4" /></button
			>
			<button type="button" class={controlClass} onclick={() => move(1, 0)} aria-label="Move right"
				><ArrowRight class="size-4" /></button
			>
			<span></span>
			<button type="button" class={controlClass} onclick={() => move(0, 1)} aria-label="Move down"
				><ArrowDown class="size-4" /></button
			>
			<span></span>
		</div>
		<div class="flex flex-col gap-1" role="group" aria-label="Zoom photo">
			<button
				type="button"
				class={controlClass}
				disabled={zoom >= MAX_ZOOM}
				onclick={() => changeZoom(0.1)}
				aria-label="Zoom in"><ZoomIn class="size-4" /></button
			>
			<button
				type="button"
				class={controlClass}
				disabled={zoom <= MIN_ZOOM}
				onclick={() => changeZoom(-0.1)}
				aria-label="Zoom out"><ZoomOut class="size-4" /></button
			>
		</div>
	</div>
{/if}

<input
	bind:this={output}
	name="photo"
	type="file"
	class="hidden"
	tabindex="-1"
	aria-hidden="true"
/>
<input
	type="file"
	accept="image/jpeg,image/png,image/webp"
	aria-label="Choose a profile photo"
	onchange={choose}
	class="mt-4 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-ink-900 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-ivory-50"
/>
{#if problem}<p class="field-error">{problem}</p>{/if}
