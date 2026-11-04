import { fail, redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '#lib/server/auth.ts';

/** Only ever send people back to a member page or an event registration, never to another site. */
const safeNext = (next: string | null) =>
	next && /^\/(member(\/|\?|$)|events\/[a-z0-9-]+\/register$)/.test(next) ? next : '/member';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user?.role === 'admin') redirect(303, '/admin');
	if (locals.user?.role === 'member') redirect(303, safeNext(url.searchParams.get('next')));
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
			console.error('[login] sign-in failed:', e);
			return fail(503, {
				email,
				error: 'Sign-in isn’t available right now. Please try again shortly.'
			});
		}
		// The hook sends anyone with a temporary password to choose a new one first.
		redirect(303, role === 'admin' ? '/admin' : safeNext(url.searchParams.get('next')));
	}
};
