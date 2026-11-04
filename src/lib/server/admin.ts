import { count, eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { user } from '#lib/server/db/schema.ts';

export async function adminCount() {
	const [row] = await db.select({ n: count() }).from(user).where(eq(user.role, 'admin'));
	return row.n;
}

/** Only ever send people back to an admin page, never to another site. */
export function safeNext(next: string | null) {
	return next && /^\/admin(\/|\?|$)/.test(next) && !next.startsWith('//') ? next : '/admin';
}

export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

/** null for blank, undefined for anything but an http(s) link, else the normalised URL. */
export function safeUrl(value: string) {
	if (!value) return null;
	try {
		const u = new URL(/^[a-z]+:/i.test(value) ? value : `https://${value}`);
		return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : undefined;
	} catch {
		return undefined;
	}
}
