import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { db } from '#lib/server/db/index.ts';
import { eventCover } from '#lib/server/db/schema.ts';

/** Event cover images. URLs carry ?v=<updated-at>, so responses can be cached forever. */
export const GET: RequestHandler = async ({ params }) => {
	const id = Number(params.id);
	if (!Number.isInteger(id)) error(404);
	const [cover] = await db
		.select({ mime: eventCover.mime, data: eventCover.data })
		.from(eventCover)
		.where(eq(eventCover.eventId, id));
	if (!cover) error(404);

	return new Response(Buffer.from(cover.data, 'base64'), {
		headers: {
			'content-type': cover.mime,
			'cache-control': 'public, max-age=31536000, immutable',
			'x-content-type-options': 'nosniff'
		}
	});
};
