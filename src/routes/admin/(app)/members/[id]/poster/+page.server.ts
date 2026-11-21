import { error, fail } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '#lib/server/db/index.ts';
import { memberPhoto, memberPoster, memberProfile, user } from '#lib/server/db/schema.ts';
import { getPosterCount, savePosterCount } from '#lib/server/settings.ts';
import { readImage } from '#lib/server/uploads.ts';
import { hubForum, photoUrl } from '#lib/network.ts';

export const load: PageServerLoad = async ({ params }) => {
	const [m] = await db
		.select({
			id: user.id,
			name: user.name,
			memberNumber: memberProfile.memberNumber,
			business: memberProfile.business,
			designation: memberProfile.designation,
			hub: memberProfile.hub,
			photoVersion: sql<number | null>`floor(extract(epoch from ${memberPhoto.updatedAt}))::int`,
			hasPoster: sql<boolean>`${memberPoster.userId} is not null`
		})
		.from(memberProfile)
		.innerJoin(user, eq(user.id, memberProfile.userId))
		.leftJoin(memberPhoto, eq(memberPhoto.userId, memberProfile.userId))
		.leftJoin(memberPoster, eq(memberPoster.userId, memberProfile.userId))
		.where(eq(memberProfile.userId, params.id));
	if (!m) error(404, 'That member no longer exists.');
	return {
		member: { ...m, photo: photoUrl(m) },
		forumId: hubForum(m.hub),
		count: await getPosterCount()
	};
};

export const actions: Actions = {
	save: async ({ request, params }) => {
		const data = await request.formData();
		const poster = await readImage(data, 'poster', 4);
		if (!poster) return fail(400, { error: 'The poster didn’t arrive. Please try again.' });
		if ('error' in poster) return fail(400, { error: poster.error });
		const [m] = await db
			.select({ id: memberProfile.userId })
			.from(memberProfile)
			.where(eq(memberProfile.userId, params.id));
		if (!m) return fail(404, { error: 'That member no longer exists.' });
		const row = { userId: m.id, ...poster, updatedAt: new Date() };
		await db
			.insert(memberPoster)
			.values(row)
			.onConflictDoUpdate({
				target: memberPoster.userId,
				set: { mime: row.mime, data: row.data, updatedAt: row.updatedAt }
			});
		return { saved: true };
	},

	count: async ({ request }) => {
		const count = String((await request.formData()).get('count') ?? '').trim();
		if (!/^\d{1,6}\+?$/.test(count))
			return fail(400, { error: 'Enter the member count like 130+.' });
		await savePosterCount(count);
		return { countSaved: true };
	}
};
