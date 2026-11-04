import { count, eq } from 'drizzle-orm';
import type { LayoutServerLoad } from './$types';
import { db } from '#lib/server/db/index.ts';
import { contactMessage, membershipApplication, payment } from '#lib/server/db/schema.ts';

/** A count that reads 0 instead of failing, e.g. before `db:push` adds a new table. */
const safeCount = (q: Promise<{ n: number }[]>) => q.then(([r]) => r.n).catch(() => 0);

// Access is enforced in hooks.server.ts; this only feeds the shell.
export const load: LayoutServerLoad = async ({ locals }) => {
	const [openEnquiries, pendingApplications, pendingPayments] = await Promise.all([
		safeCount(
			db.select({ n: count() }).from(contactMessage).where(eq(contactMessage.handled, false))
		),
		safeCount(
			db
				.select({ n: count() })
				.from(membershipApplication)
				.where(eq(membershipApplication.status, 'pending'))
		),
		// Every UPI payment waiting to be checked: event, joining and renewal.
		safeCount(db.select({ n: count() }).from(payment).where(eq(payment.status, 'pending')))
	]);
	return {
		me: { id: locals.user!.id, name: locals.user!.name, email: locals.user!.email },
		openEnquiries,
		pendingApplications,
		pendingPayments
	};
};
