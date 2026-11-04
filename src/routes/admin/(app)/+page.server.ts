import { count, desc, eq, gt, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '#lib/server/db/index.ts';
import { contactMessage, event, eventRegistration, memberProfile } from '#lib/server/db/schema.ts';
import { upcomingCount, upcomingEvents } from '#lib/server/events.ts';
import { networkTotals } from '#lib/server/network.ts';

export const load: PageServerLoad = async () => {
	const [upcoming, upcomingTotal, [drafts], recent, [members], network, [events]] =
		await Promise.all([
			upcomingEvents(5),
			upcomingCount(),
			db.select({ n: count() }).from(event).where(eq(event.published, false)),
			db.select().from(contactMessage).orderBy(desc(contactMessage.createdAt)).limit(5),
			db
				.select({ n: count() })
				.from(memberProfile)
				.where(gt(memberProfile.expiresAt, new Date()))
				.catch(() => [{ n: 0 }]),
			networkTotals().catch(() => ({ connects: 0, business: 0 })),
			// Money from event seats that are confirmed now (same figure as each event's page;
			// a cancelled seat drops out).
			db
				.select({ collected: sql<number>`coalesce(sum(${eventRegistration.amount}), 0)::int` })
				.from(eventRegistration)
				.where(eq(eventRegistration.status, 'confirmed'))
				.catch(() => [{ collected: 0 }])
		]);
	return {
		upcoming,
		upcomingTotal,
		drafts: drafts.n,
		recent,
		activeMembers: members.n,
		network,
		eventsCollected: events.collected
	};
};
