import { fail, redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '#lib/server/auth.ts';
import { adminCount, safeNext } from '#lib/server/admin.ts';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user?.role === 'admin') redirect(303, safeNext(url.searchParams.get('next')));
	try {
		return { needsSetup: (await adminCount()) === 0, dbError: false };
	} catch (e) {
		// Usually a fresh deployment whose tables haven't been created yet.
		console.error('[admin] database unavailable:', e);
		return { needsSetup: false, dbError: true };
	}
};

export const actions: Actions = {
	default: async ({ request, url }) => {
		const data = await request.formData();
		const email = String(data.get('email') ?? '')
			.trim()
			.toLowerCase();
		const password = String(data.get('password') ?? '');
		if (!email || !password) return fail(400, { email, error: 'Enter your email and password.' });

		let role: unknown;
		try {
			const result = await auth.api.signInEmail({
				body: { email, password, rememberMe: true },
				headers: request.headers
			});
			role = result.user.role;
		} catch (e) {
			if (e instanceof APIError) return fail(400, { email, error: 'Wrong email or password.' });
			throw e;
		}
		if (role !== 'admin')
			return fail(403, { email, error: 'This account doesn’t have admin access.' });

		redirect(303, safeNext(url.searchParams.get('next')));
	}
};
