import type { Handle } from '@sveltejs/kit/hooks';
import { sequence } from '@sveltejs/kit/hooks';
import { building, dev } from '$app/env';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { resolveForum } from '#lib/server/forum.ts';
import { DEFAULT_FORUM } from '#lib/forums.ts';

type Auth = (typeof import('#lib/server/auth.ts'))['auth'];

// Admin pages reachable without being signed in as an admin.
const OPEN_ADMIN_PATHS = new Set(['/admin/login', '/admin/setup', '/admin/logout']);
// The one member page open to someone still holding a temporary password.
const PASSWORD_PAGE = '/member/password';

const under = (path: string, root: string) => path === root || path.startsWith(root + '/');

const redirect = (location: string) => new Response(null, { status: 303, headers: { location } });

/**
 * The path as the router matches it. Routes are matched on the decoded path, so
 * "/%61dmin" reaches /admin: guarding the raw path would let it straight through.
 */
function routedPath(pathname: string) {
	try {
		return pathname.split('%25').map(decodeURI).join('%25');
	} catch {
		return null;
	}
}

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	const path = routedPath(event.url.pathname);
	if (path === null) return new Response('Bad request', { status: 400 });
	// Checked on the matched route too, so no spelling of the URL can dodge the guard.
	const route = event.route.id ?? '';
	const admin = under(path, '/admin') || under(route, '/admin');
	const member = under(path, '/member') || under(route, '/member');
	const guarded = admin || member;

	// Imported lazily: a missing DATABASE_URL or BETTER_AUTH_SECRET should break
	// sign-in, not take the whole public site down with it.
	let auth: Auth;
	try {
		({ auth } = await import('#lib/server/auth.ts'));
	} catch (error) {
		console.error('[auth] unavailable:', error);
		if (guarded) return unavailable(error);
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
		if (guarded) return unavailable(error);
	}

	// Guarded here rather than in layout loads, so form actions and endpoints are covered too.
	const user = event.locals.user;
	const next = encodeURIComponent(path + event.url.search);
	if (admin && !OPEN_ADMIN_PATHS.has(path)) {
		if (!user) return redirect(`/admin/login?next=${next}`);
		if (user.role !== 'admin') return new Response('Forbidden', { status: 403 });
	}
	if (member) {
		if (!user) return redirect(`/login?next=${next}`);
		if (user.role !== 'member') return redirect(user.role === 'admin' ? '/admin' : '/login');
		if (user.mustChangePassword && path !== PASSWORD_PAGE) return redirect(PASSWORD_PAGE);
		// Connects and Transactions are closed, form submissions included, while switched off.
		const connects = under(path, '/member/connects') || under(route, '/member/connects');
		const transactions =
			under(path, '/member/transactions') || under(route, '/member/transactions');
		if (connects || transactions) {
			const { getFeatures } = await import('#lib/server/settings.ts');
			const features = await getFeatures();
			if ((connects && !features.connects) || (transactions && !features.transactions))
				return redirect('/member');
		}
	}

	const response = await svelteKitHandler({ event, resolve, auth, building });
	if (guarded) response.headers.set('x-robots-tag', 'noindex, nofollow');
	return response;
};

/** 503 for the admin and member areas; in development it also says why. */
function unavailable(error: unknown) {
	let body = 'This area is unavailable: the database or sign-in is not configured.';
	if (dev)
		body += '\n\n' + (error instanceof Error ? (error.stack ?? error.message) : String(error));
	return new Response(body, {
		status: 503,
		headers: { 'content-type': 'text/plain; charset=utf-8' }
	});
}

/** Which of the three forums this request is for (subdomain, ?forum=, or cookie). */
const handleForum: Handle = async ({ event, resolve }) => {
	if (building) {
		event.locals.forum = DEFAULT_FORUM;
		return resolve(event);
	}
	const r = resolveForum(event);
	if ('redirect' in r) {
		const res = redirect(r.redirect.toString());
		if (r.setCookie) res.headers.append('set-cookie', r.setCookie);
		return res;
	}
	event.locals.forum = r.forum;
	return resolve(event);
};

export const handle: Handle = sequence(handleForum, handleBetterAuth);
