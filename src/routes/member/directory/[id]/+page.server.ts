import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { memberById } from '#lib/server/network.ts';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (params.id === locals.user!.id) return { member: null, self: true };
	const member = await memberById(params.id);
	if (!member) error(404, 'That member isn’t in the directory.');
	return { member, self: false };
};
