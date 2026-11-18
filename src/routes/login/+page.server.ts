import { fail, redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import type { Actions, PageServerLoad } from './$types';
import { and, eq, sql } from 'drizzle-orm';
import { auth } from '#lib/server/auth.ts';
import { db } from '#lib/server/db/index.ts';
import { memberProfile, user } from '#lib/server/db/schema.ts';
import { phoneDigits, phoneLoginEmail } from '#lib/membership.ts';

/**
 * The account's email for what someone typed: an email as it is; a mobile number for a
 * member without email (their stand-in address), else the one member with that number.
 */
async function accountEmail(typed: string) {
	if (typed.includes('@')) return typed;
	const digits = phoneDigits(typed);
	if (!digits) return typed;
	const own = phoneLoginEmail(digits);
	const [direct] = await db.select({ email: user.email }).from(user).where(eq(user.email, own));
	if (direct) return direct.email;
	const matches = await db
		.select({ email: user.email })
		.from(memberProfile)
		.innerJoin(user, eq(user.id, memberProfile.userId))
		.where(
			and(
				eq(user.role, 'member'),
				sql`right(regexp_replace(${memberProfile.phone}, '[^0-9]', '', 'g'), 10) = ${digits}`
			)
		)
		.limit(2);
	return matches.length === 1 ? matches[0].email : typed;
}

/** Only ever send people back to a member page or an event registration, never to another site. */
const safeNext = (next: string | null) =>
	next && /^\/(member(\/|\?|$)|events\/[a-z0-9-]+\/register$)/.test(next) ? next : '/member';

export const load: PageServerLoad = async ({ locals, url }) => {
	// An admin signed in on this browser still gets the member login (with a note), so the
	// "Member login" link never lands them in the admin area.
	if (locals.user?.role === 'member') redirect(303, safeNext(url.searchParams.get('next')));
	return { signedInAdmin: locals.user?.role === 'admin' ? locals.user.email : null };
};

export const actions: Actions = {
	default: async ({ request, url }) => {
		const data = await request.formData();
		const email = String(data.get('email') ?? '')
			.trim()
			.toLowerCase();
		const password = String(data.get('password') ?? '');
		if (!email || !password)
			return fail(400, { email, error: 'Enter your email (or mobile number) and password.' });

		let role: unknown;
		try {
			const result = await auth.api.signInEmail({
				body: { email: await accountEmail(email), password, rememberMe: true },
				headers: request.headers
			});
			role = result.user.role;
		} catch (e) {
			if (e instanceof APIError)
				return fail(400, { email, error: 'Wrong email / mobile number or password.' });
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
