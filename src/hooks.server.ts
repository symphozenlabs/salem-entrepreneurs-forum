import type { Handle } from '@sveltejs/kit/hooks';
import { building } from '$app/env';
import { svelteKitHandler } from 'better-auth/svelte-kit';

type Auth = (typeof import('#lib/server/auth.ts'))['auth'];

// Admin pages reachable without being signed in as an admin.
const OPEN_ADMIN_PATHS = new Set(['/admin/login', '/admin/setup']);

const isAdminPath = (path: string) => path === '/admin' || path.startsWith('/admin/');

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	const admin = isAdminPath(event.url.pathname);

	// Imported lazily: a missing DATABASE_URL or BETTER_AUTH_SECRET should break
	// sign-in, not take the whole public site down with it.
	let auth: Auth;
	try {
		({ auth } = await import('#lib/server/auth.ts'));
	} catch (error) {
		console.error('[auth] unavailable:', error);
		if (admin) return unavailable();
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
		if (admin) return unavailable();
	}

	// Guarded here rather than in a layout load, so form actions and endpoints are covered too.
	if (admin && !OPEN_ADMIN_PATHS.has(event.url.pathname)) {
		const user = event.locals.user;
		if (!user) {
			const next = encodeURIComponent(event.url.pathname + event.url.search);
			return new Response(null, {
				status: 303,
				headers: { location: `/admin/login?next=${next}` }
			});
		}
		if (user.role !== 'admin') return new Response('Forbidden', { status: 403 });
	}

	const response = await svelteKitHandler({ event, resolve, auth, building });
	if (admin) response.headers.set('x-robots-tag', 'noindex, nofollow');
	return response;
};

const unavailable = () =>
	new Response('The admin is unavailable: the database or sign-in is not configured.', {
		status: 503,
		headers: { 'content-type': 'text/plain; charset=utf-8' }
	});

export const handle: Handle = handleBetterAuth;
