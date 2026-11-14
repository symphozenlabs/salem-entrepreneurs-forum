import type { Cookies, RequestEvent } from '@sveltejs/kit';
import { FORUM_BASE_DOMAIN } from '$app/env/private';
import { DEFAULT_FORUM, FORUM_COOKIE, forums, isForumId, type ForumId } from '#lib/forums.ts';

/**
 * The parent domain the forums live under as subdomains (salem.<base>, coimbatore.<base>, …).
 * Unset (e.g. on *.vercel.app, which can't have subdomains), the forum is chosen by cookie.
 */
export const baseDomain = () => (FORUM_BASE_DOMAIN || '').replace(/^\.+|\.+$/g, '').toLowerCase();

/** The forum a subdomain belongs to, if the host is one of them. */
function forumFromHost(host: string, base: string): ForumId | null {
	if (!base || !host.endsWith('.' + base)) return null;
	const sub = host.slice(0, -(base.length + 1));
	return Object.values(forums).find((f) => f.subdomain === sub)?.id ?? null;
}

export function forumUrl(url: URL, id: ForumId, base: string) {
	const next = new URL(url);
	next.searchParams.delete('forum');
	if (base) next.hostname = `${forums[id].subdomain}.${base}`;
	return next;
}

const cookieOptions = (base: string) => ({
	path: '/',
	maxAge: 60 * 60 * 24 * 365,
	httpOnly: false,
	sameSite: 'lax' as const,
	...(base ? { domain: '.' + base } : {})
});

function remember(cookies: Cookies, id: ForumId, base: string) {
	cookies.set(FORUM_COOKIE, id, cookieOptions(base));
}

export type ForumResolution =
	{ redirect: URL; setCookie?: string } | { forum: ForumId; chosen: boolean };

/**
 * Works out which forum a request is for:
 * 1. ?forum=<id> (the picker and switcher links) — remembered, then redirected to a clean URL
 *    (on the forum's subdomain when subdomains are in use);
 * 2. the subdomain;
 * 3. the remembered cookie — on the bare parent domain this redirects to the forum's subdomain;
 * 4. otherwise Salem, with `chosen: false` so the site asks the visitor to pick.
 */
export function resolveForum(event: RequestEvent): ForumResolution {
	const { url, cookies } = event;
	const base = baseDomain();
	const host = url.hostname.toLowerCase();

	const asked = url.searchParams.get('forum');
	if (isForumId(asked)) {
		// A redirect built in a hook doesn't carry event.cookies, so the header is set by hand.
		return {
			redirect: forumUrl(url, asked, base),
			setCookie: cookies.serialize(FORUM_COOKIE, asked, cookieOptions(base))
		};
	}

	const fromHost = forumFromHost(host, base);
	if (fromHost) {
		if (cookies.get(FORUM_COOKIE) !== fromHost) remember(cookies, fromHost, base);
		return { forum: fromHost, chosen: true };
	}

	const saved = cookies.get(FORUM_COOKIE);
	if (isForumId(saved)) {
		const bare = base && (host === base || host === 'www.' + base);
		if (bare && event.request.method === 'GET' && !url.pathname.startsWith('/api'))
			return { redirect: forumUrl(url, saved, base) };
		return { forum: saved, chosen: true };
	}

	return { forum: DEFAULT_FORUM, chosen: false };
}
