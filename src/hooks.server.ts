import type { Handle } from '@sveltejs/kit/hooks';
import { building } from '$app/env';
import { svelteKitHandler } from 'better-auth/svelte-kit';

type Auth = (typeof import('#lib/server/auth.ts'))['auth'];

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	// Imported lazily: a missing DATABASE_URL or BETTER_AUTH_SECRET should break
	// sign-in, not take the whole public site down with it.
	let auth: Auth;
	try {
		({ auth } = await import('#lib/server/auth.ts'));
	} catch (error) {
		console.error('[auth] unavailable:', error);
		return resolve(event);
	}

	try {
		const session = await auth.api.getSession({ headers: event.request.headers });
		if (session) {
			event.locals.session = session.session;
			event.locals.user = session.user;
		}
	} catch (error) {
		console.error('[auth] session lookup failed:', error);
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

export const handle: Handle = handleBetterAuth;
