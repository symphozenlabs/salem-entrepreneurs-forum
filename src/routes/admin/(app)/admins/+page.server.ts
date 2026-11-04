import { fail } from '@sveltejs/kit';
import { and, asc, eq } from 'drizzle-orm';
import { APIError } from 'better-auth/api';
import type { Actions, PageServerLoad } from './$types';
import { db } from '#lib/server/db/index.ts';
import { user } from '#lib/server/db/schema.ts';
import { auth, createAccount, MAX_PASSWORD, MIN_PASSWORD } from '#lib/server/auth.ts';
import { adminCount, isEmail } from '#lib/server/admin.ts';

export const load: PageServerLoad = async () => ({
	admins: await db
		.select({ id: user.id, name: user.name, email: user.email, createdAt: user.createdAt })
		.from(user)
		.where(eq(user.role, 'admin'))
		.orderBy(asc(user.createdAt))
});

const field = (data: FormData, key: string) => String(data.get(key) ?? '').trim();

export const actions: Actions = {
	add: async ({ request }) => {
		const data = await request.formData();
		const name = field(data, 'name');
		const email = field(data, 'email').toLowerCase();
		const password = String(data.get('password') ?? '');
		const values = { name, email };

		if (!name) return fail(400, { add: { ...values, error: 'Enter their name.' } });
		if (!isEmail(email))
			return fail(400, { add: { ...values, error: 'Enter a valid email address.' } });
		if (password.length < MIN_PASSWORD)
			return fail(400, {
				add: { ...values, error: `Use a password of at least ${MIN_PASSWORD} characters.` }
			});

		const [existing] = await db.select({ role: user.role }).from(user).where(eq(user.email, email));
		if (existing?.role === 'admin')
			return fail(400, { add: { ...values, error: 'That person is already an admin.' } });
		if (existing)
			return fail(400, {
				add: {
					...values,
					error: 'That email belongs to a member. Use a different email for their admin login.'
				}
			});
		await createAccount({ name, email, password, role: 'admin' });
		return { add: { ok: true, email } };
	},

	remove: async ({ request, locals }) => {
		const id = field(await request.formData(), 'id');
		if (id === locals.user!.id)
			return fail(400, { remove: { error: 'You can’t remove yourself.' } });
		if ((await adminCount()) <= 1)
			return fail(400, { remove: { error: 'There must always be at least one admin.' } });
		// Deleting the user also signs them out (sessions and logins cascade).
		const removed = await db
			.delete(user)
			.where(and(eq(user.id, id), eq(user.role, 'admin')))
			.returning({ id: user.id });
		if (!removed.length) return fail(404, { remove: { error: 'That admin no longer exists.' } });
		return { remove: { ok: true } };
	},

	password: async ({ request }) => {
		const data = await request.formData();
		const currentPassword = String(data.get('current') ?? '');
		const newPassword = String(data.get('new') ?? '');
		if (newPassword.length < MIN_PASSWORD)
			return fail(400, {
				password: { error: `Use a password of at least ${MIN_PASSWORD} characters.` }
			});
		if (newPassword.length > MAX_PASSWORD)
			return fail(400, { password: { error: `Keep it under ${MAX_PASSWORD} characters.` } });
		if (newPassword !== String(data.get('confirm') ?? ''))
			return fail(400, { password: { error: 'The two new passwords don’t match.' } });
		try {
			await auth.api.changePassword({
				body: { currentPassword, newPassword, revokeOtherSessions: true },
				headers: request.headers
			});
		} catch (e) {
			if (e instanceof APIError)
				return fail(400, { password: { error: 'Your current password is wrong.' } });
			throw e;
		}
		return { password: { ok: true } };
	}
};
