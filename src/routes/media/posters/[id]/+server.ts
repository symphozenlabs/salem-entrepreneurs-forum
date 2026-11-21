import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { db } from '#lib/server/db/index.ts';
import { memberPoster, memberProfile } from '#lib/server/db/schema.ts';
import { imageResponse } from '#lib/server/uploads.ts';

/** A member's poster: for that member and admins. `?download` saves it as a file. */
export const GET: RequestHandler = async ({ params, locals, url }) => {
	if (!locals.user) error(401);
	if (locals.user.role !== 'admin' && locals.user.id !== params.id) error(403);
	const [poster] = await db
		.select({
			mime: memberPoster.mime,
			data: memberPoster.data,
			memberNumber: memberProfile.memberNumber
		})
		.from(memberPoster)
		.innerJoin(memberProfile, eq(memberProfile.userId, memberPoster.userId))
		.where(eq(memberPoster.userId, params.id));
	if (!poster) error(404);
	const response = imageResponse(poster, 'private, no-cache');
	if (url.searchParams.has('download'))
		response.headers.set(
			'content-disposition',
			`attachment; filename="${poster.memberNumber}-new-member-poster.jpg"`
		);
	return response;
};
