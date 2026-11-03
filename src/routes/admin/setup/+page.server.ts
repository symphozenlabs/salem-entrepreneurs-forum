import { fail, redirect } from '@sveltejs/kit';
import { timingSafeEqual } from 'node:crypto';
import type { Actions, PageServerLoad } from './$types';
import { BETTER_AUTH_SECRET } from '$app/env/private';
import { auth, createAccount, MIN_PASSWORD } from '#lib/server/auth.ts';
import { adminCount, isEmail } from '#lib/server/admin.ts';

// First-run only: creates the first admin while none exist. Whoever runs it must
// prove they control the deployment by entering its BETTER_AUTH_SECRET.

export const load: PageServerLoad = async () => {
	// Without a working database the login page explains what's missing.
	const admins = await adminCount().catch(() => null);
	if (admins === null || admins > 0) redirect(303, '/admin/login');
};

function sameSecret(given: string) {
	const a = Buffer.from(given);
	const b = Buffer.from(BETTER_AUTH_SECRET ?? '');
	return b.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}

export const actions: Actions = {
	default: async ({ request }) => {
		if ((await adminCount()) > 0) redirect(303, '/admin/login');

		const data = await request.formData();
		const name = String(data.get('name') ?? '').trim();
		const email = String(data.get('email') ?? '')
			.trim()
			.toLowerCase();
		const password = String(data.get('password') ?? '');
		const confirm = String(data.get('confirm') ?? '');
		const key = String(data.get('key') ?? '').trim();
		const values = { name, email };

		if (!sameSecret(key)) return fail(403, { ...values, error: 'That setup key doesn’t match.' });
		if (!name) return fail(400, { ...values, error: 'Enter your name.' });
		if (!isEmail(email)) return fail(400, { ...values, error: 'Enter a valid email address.' });
		if (password.length < MIN_PASSWORD)
			return fail(400, {
				...values,
				error: `Use a password of at least ${MIN_PASSWORD} characters.`
			});
		if (password !== confirm)
			return fail(400, { ...values, error: 'The two passwords don’t match.' });

		await createAccount({ name, email, password, role: 'admin' });
		await auth.api.signInEmail({
			body: { email, password, rememberMe: true },
			headers: request.headers
		});
		redirect(303, '/admin');
	}
};
