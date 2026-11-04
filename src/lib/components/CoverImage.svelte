<script lang="ts">
	// Shows a cover in full, whatever its shape: the image is fitted inside the frame
	// (never cropped or stretched) and a blurred copy of it fills the space around it.
	type Props = {
		src: string;
		alt?: string;
		class?: string;
		imgClass?: string;
		loading?: 'lazy' | 'eager';
	};
	let { src, alt = '', class: klass = '', imgClass = '', loading }: Props = $props();
</script>

<div class="relative overflow-hidden bg-ink-900 {klass}">
	<img
		{src}
		alt=""
		aria-hidden="true"
		{loading}
		class="absolute inset-0 h-full w-full scale-125 object-cover opacity-60 blur-2xl"
	/>
	<img {src} {alt} {loading} class="relative h-full w-full object-contain {imgClass}" />
</div>
