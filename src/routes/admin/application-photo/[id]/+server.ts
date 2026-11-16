import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { db } from '#lib/server/db/index.ts';
import { applicationPhoto } from '#lib/server/db/schema.ts';
import { imageResponse } from '#lib/server/uploads.ts';

/** Photos sent with membership applications. Under /admin, so only admins get here. */
export const GET: RequestHandler = async ({ params }) => {
	const id = Number(params.id);
	if (!Number.isInteger(id)) error(404);
	const [photo] = await db
		.select({ mime: applicationPhoto.mime, data: applicationPhoto.data })
		.from(applicationPhoto)
		.where(eq(applicationPhoto.applicationId, id));
	if (!photo) error(404);
	return imageResponse(photo, 'private, no-store');
};
