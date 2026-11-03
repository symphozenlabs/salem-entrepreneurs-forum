import { count, desc, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '#lib/server/db/index.ts';
import { contactMessage, event } from '#lib/server/db/schema.ts';
import { upcomingEvents } from '#lib/server/events.ts';
import { adminCount } from '#lib/server/admin.ts';

export const load: PageServerLoad = async () => {
	const [upcoming, [drafts], recent, admins] = await Promise.all([
		upcomingEvents(5),
		db.select({ n: count() }).from(event).where(eq(event.published, false)),
		db.select().from(contactMessage).orderBy(desc(contactMessage.createdAt)).limit(5),
		adminCount()
	]);
	return { upcoming, drafts: drafts.n, recent, admins };
};
