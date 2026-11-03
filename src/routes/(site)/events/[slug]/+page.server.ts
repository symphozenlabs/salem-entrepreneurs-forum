import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { eventBySlug } from '#lib/server/events.ts';

export const load: PageServerLoad = async ({ params, locals }) => {
	const admin = locals.user?.role === 'admin';
	const event = await eventBySlug(params.slug, admin).catch((e) => {
		console.error('[event] unavailable:', e);
		error(503, 'Events can’t be loaded right now.');
	});
	if (!event) error(404, 'That event doesn’t exist or is no longer listed.');
	return { event, admin };
};
