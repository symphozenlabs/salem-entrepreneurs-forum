import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { db } from '#lib/server/db/index.ts';
import { memberPhoto } from '#lib/server/db/schema.ts';
import { imageResponse } from '#lib/server/uploads.ts';

/** Member photos: only for signed-in members and admins. */
export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) error(401);
	const [photo] = await db
		.select({ mime: memberPhoto.mime, data: memberPhoto.data })
		.from(memberPhoto)
		.where(eq(memberPhoto.userId, params.id));
	if (!photo) error(404);
	return imageResponse(photo, 'private, max-age=31536000, immutable');
};
