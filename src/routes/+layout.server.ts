import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => ({
	forum: locals.forum,
	forumChosen: locals.forumChosen
});
