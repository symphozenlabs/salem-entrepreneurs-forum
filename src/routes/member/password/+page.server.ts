import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { APIError } from 'better-auth/api';
import type { Actions, PageServerLoad } from './$types';
import { auth, MAX_PASSWORD, MIN_PASSWORD } from '#lib/server/auth.ts';
import { db } from '#lib/server/db/index.ts';
import { user } from '#lib/server/db/schema.ts';

export const load: PageServerLoad = async ({ locals }) => ({
	firstTime: !!locals.user!.mustChangePassword
});

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const data = await request.formData();
		const currentPassword = String(data.get('current') ?? '');
		const newPassword = String(data.get('new') ?? '');
		if (newPassword.length < MIN_PASSWORD)
			return fail(400, { error: `Use at least ${MIN_PASSWORD} characters.` });
		if (newPassword.length > MAX_PASSWORD)
			return fail(400, { error: `Keep it under ${MAX_PASSWORD} characters.` });
		if (newPassword !== String(data.get('confirm') ?? ''))
			return fail(400, { error: 'The two new passwords don’t match.' });
		if (newPassword === currentPassword)
			return fail(400, { error: 'Choose a password different from the temporary one.' });
		try {
			await auth.api.changePassword({
				body: { currentPassword, newPassword, revokeOtherSessions: true },
				headers: request.headers
			});
		} catch (e) {
			if (e instanceof APIError) return fail(400, { error: 'Your current password is wrong.' });
			throw e;
		}
		await db.update(user).set({ mustChangePassword: false }).where(eq(user.id, locals.user!.id));
		redirect(303, '/member?welcome=1');
	}
};
