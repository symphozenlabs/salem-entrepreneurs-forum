import { count, desc, eq, gt } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '#lib/server/db/index.ts';
import { contactMessage, event, memberProfile } from '#lib/server/db/schema.ts';
import { upcomingCount, upcomingEvents } from '#lib/server/events.ts';
import { networkTotals } from '#lib/server/network.ts';

export const load: PageServerLoad = async () => {
	const [upcoming, upcomingTotal, [drafts], recent, [members], network] = await Promise.all([
		upcomingEvents(5),
		upcomingCount(),
		db.select({ n: count() }).from(event).where(eq(event.published, false)),
		db.select().from(contactMessage).orderBy(desc(contactMessage.createdAt)).limit(5),
		db
			.select({ n: count() })
			.from(memberProfile)
			.where(gt(memberProfile.expiresAt, new Date()))
			.catch(() => [{ n: 0 }]),
		networkTotals().catch(() => ({ connects: 0, business: 0 }))
	]);
	return { upcoming, upcomingTotal, drafts: drafts.n, recent, activeMembers: members.n, network };
};
