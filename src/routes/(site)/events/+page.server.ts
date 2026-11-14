import type { PageServerLoad } from './$types';
import { pastEvents, upcomingEvents } from '#lib/server/events.ts';

export const load: PageServerLoad = async ({ locals }) => {
	try {
		const [upcoming, past] = await Promise.all([
			upcomingEvents(50, locals.forum),
			pastEvents(12, locals.forum)
		]);
		return { upcoming, past, unavailable: false };
	} catch (e) {
		console.error('[events] unavailable:', e);
		return { upcoming: [], past: [], unavailable: true };
	}
};
