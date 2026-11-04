import { fail } from '@sveltejs/kit';
import { and, asc, eq, ilike, or } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '#lib/server/db/index.ts';
import { memberProfile, user } from '#lib/server/db/schema.ts';
import { resetMemberPassword } from '#lib/server/members.ts';

export const load: PageServerLoad = async ({ url }) => {
	const q = (url.searchParams.get('q') ?? '').trim().slice(0, 80);
	const term = q ? `%${q.replace(/[%_\\]/g, '\\$&')}%` : null;
	const members = await db
		.select({
			id: user.id,
			name: user.name,
			email: user.email,
			mustChangePassword: user.mustChangePassword,
			phone: memberProfile.phone,
			memberNumber: memberProfile.memberNumber,
			business: memberProfile.business,
			industry: memberProfile.industry,
			joinedAt: memberProfile.joinedAt,
			expiresAt: memberProfile.expiresAt
		})
		.from(memberProfile)
		.innerJoin(user, eq(user.id, memberProfile.userId))
		.where(
			and(
				eq(user.role, 'member'),
				term
					? or(
							ilike(user.name, term),
							ilike(user.email, term),
							ilike(memberProfile.business, term),
							ilike(memberProfile.memberNumber, term),
							ilike(memberProfile.phone, term)
						)
					: undefined
			)
		)
		.orderBy(asc(user.name))
		.limit(500);
	return { members, q };
};

export const actions: Actions = {
	reset: async ({ request }) => {
		const id = String((await request.formData()).get('id') ?? '');
		const result = await resetMemberPassword(id);
		if ('error' in result) return fail(400, { error: result.error });
		const [m] = await db
			.select({ phone: memberProfile.phone })
			.from(memberProfile)
			.where(eq(memberProfile.userId, id));
		return { reset: { ...result.credentials, phone: m?.phone } };
	},
	remove: async ({ request }) => {
		const id = String((await request.formData()).get('id') ?? '');
		// Deleting the user removes their profile, sessions, connects and transactions (cascade).
		const removed = await db
			.delete(user)
			.where(and(eq(user.id, id), eq(user.role, 'member')))
			.returning({ name: user.name });
		if (!removed.length) return fail(404, { error: 'That member no longer exists.' });
		return { removed: removed[0].name };
	}
};
