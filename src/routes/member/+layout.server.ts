import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { getMe, performance } from '#lib/server/network.ts';
import { openMemberEventCount } from '#lib/server/events.ts';
import { membershipStatus } from '#lib/membership.ts';

// Access (signed in, member role, password changed) is enforced in hooks.server.ts.
export const load: LayoutServerLoad = async ({ locals }) => {
	const [me, perf, openEvents] = await Promise.all([
		getMe(locals.user!.id),
		performance(locals.user!.id),
		openMemberEventCount(locals.user!.id)
	]);
	if (!me) error(500, 'Your member profile is missing. Please contact the secretariat.');
	return { me, awaitingMe: perf.awaitingMe, openEvents, status: membershipStatus(me.expiresAt) };
};
