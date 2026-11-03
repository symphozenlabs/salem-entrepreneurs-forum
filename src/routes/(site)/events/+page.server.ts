import type { PageServerLoad } from './$types';
import { pastEvents, upcomingEvents } from '#lib/server/events.ts';

export const load: PageServerLoad = async () => {
	try {
		const [upcoming, past] = await Promise.all([upcomingEvents(), pastEvents(12)]);
		return { upcoming, past, unavailable: false };
	} catch (e) {
		console.error('[events] unavailable:', e);
		return { upcoming: [], past: [], unavailable: true };
	}
};
