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
