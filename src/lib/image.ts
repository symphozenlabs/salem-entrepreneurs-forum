/**
 * Shrinks the image chosen in a file input, in the browser, before it's uploaded
 * (phone photos are 5–10 MB). Replaces the input's file with a WebP no larger than
 * `maxEdge` on its longest side and returns a preview URL plus a short size note.
 */
export async function shrinkImageInput(input: HTMLInputElement, maxEdge: number) {
	const file = input.files?.[0];
	if (!file) return null;
	try {
		const bitmap = await createImageBitmap(file);
		const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
		const canvas = document.createElement('canvas');
		canvas.width = Math.round(bitmap.width * scale);
		canvas.height = Math.round(bitmap.height * scale);
		canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
		const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', 0.82));
		if (blob && blob.size < file.size) {
			const dt = new DataTransfer();
			dt.items.add(
				new File([blob], file.name.replace(/\.\w+$/, '') + '.webp', { type: 'image/webp' })
			);
			input.files = dt.files;
		}
		const final = input.files![0];
		return {
			preview: URL.createObjectURL(final),
			note: `${canvas.width}×${canvas.height}, ${Math.round(final.size / 1024)} KB`
		};
	} catch {
		return { preview: URL.createObjectURL(file), note: '' };
	}
}
