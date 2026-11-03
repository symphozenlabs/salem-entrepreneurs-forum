import { ORIGIN, BETTER_AUTH_SECRET } from '$app/env/private';
import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { db } from '#lib/server/db/index.ts';

export const auth = betterAuth({
	baseURL: ORIGIN,
	secret: BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'pg' }),
	// Accounts are created by admins (see createAccount), never by public sign-up.
	emailAndPassword: { enabled: true, disableSignUp: true },
	user: {
		additionalFields: {
			role: { type: 'string', defaultValue: 'member', input: false }
		}
	},
	plugins: [
		sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
	]
});

export type AuthUser = typeof auth.$Infer.Session.user;
export type AuthSession = typeof auth.$Infer.Session.session;

/** Creates a user with an email/password login, bypassing the disabled public sign-up. */
export async function createAccount(input: {
	name: string;
	email: string;
	password: string;
	role: 'admin' | 'member';
}) {
	const ctx = await auth.$context;
	const user = await ctx.internalAdapter.createUser(
		{
			name: input.name,
			email: input.email.toLowerCase(),
			emailVerified: true,
			role: input.role
		},
		{ method: 'admin' }
	);
	await ctx.internalAdapter.linkAccount({
		userId: user.id,
		providerId: 'credential',
		accountId: user.id,
		password: await ctx.password.hash(input.password)
	});
	return user;
}

export const MIN_PASSWORD = 8;
