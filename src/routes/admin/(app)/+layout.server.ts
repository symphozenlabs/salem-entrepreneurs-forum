import { count, eq } from 'drizzle-orm';
import type { LayoutServerLoad } from './$types';
import { db } from '#lib/server/db/index.ts';
import { contactMessage } from '#lib/server/db/schema.ts';

// Access is enforced in hooks.server.ts; this only feeds the shell.
export const load: LayoutServerLoad = async ({ locals }) => {
	const [open] = await db
		.select({ n: count() })
		.from(contactMessage)
		.where(eq(contactMessage.handled, false));
	return {
		me: { id: locals.user!.id, name: locals.user!.name, email: locals.user!.email },
		openEnquiries: open.n
	};
};
