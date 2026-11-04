const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export type StoredImage = { mime: string; data: string };

/**
 * Reads an optional uploaded image from a form field.
 * Returns null when nothing was chosen, or an error message for a bad file.
 */
export async function readImage(
	data: FormData,
	field: string,
	maxMb = 3
): Promise<StoredImage | { error: string } | null> {
	const file = data.get(field);
	if (!(file instanceof File) || file.size === 0) return null;
	if (!IMAGE_TYPES.has(file.type)) return { error: 'Use a JPEG, PNG or WebP image.' };
	if (file.size > maxMb * 1024 * 1024)
		return { error: `That image is over ${maxMb} MB — try a smaller one.` };
	return { mime: file.type, data: Buffer.from(await file.arrayBuffer()).toString('base64') };
}

export function imageResponse(img: { mime: string; data: string }, cache: string) {
	return new Response(Buffer.from(img.data, 'base64'), {
		headers: {
			'content-type': img.mime,
			'cache-control': cache,
			'x-content-type-options': 'nosniff'
		}
	});
}
