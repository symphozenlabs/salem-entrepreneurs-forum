import type { PageServerLoad } from './$types';
import { memberEvents } from '#lib/server/events.ts';
import { registrationsOf } from '#lib/server/registrations.ts';
import { registrationState } from '#lib/events.ts';

export const load: PageServerLoad = async ({ locals, parent }) => {
	const [events, registrations, { status }] = await Promise.all([
		memberEvents(),
		registrationsOf(locals.user!.id),
		parent()
	]);
	// The registration that still stands for each event (a rejected one lets them try again).
	const mine = new Map(
		registrations.filter((r) => r.status !== 'rejected').map((r) => [r.eventId, r])
	);
	return {
		events: events.map((e) => ({
			...e,
			state: registrationState(e, e.taken),
			seatsLeft: e.seats ? Math.max(0, e.seats - e.taken) : null,
			mine: mine.get(e.id) ?? null
		})),
		registrations,
		// Expired members see the events but pay the regular fee until they renew.
		memberPrice: status.state !== 'expired'
	};
};
