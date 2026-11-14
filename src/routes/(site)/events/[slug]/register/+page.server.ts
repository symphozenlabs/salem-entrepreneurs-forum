import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad, RequestEvent } from './$types';
import { eventBySlug } from '#lib/server/events.ts';
import { getMe } from '#lib/server/network.ts';
import { signup, signupPageData, submitSignup } from '#lib/server/eventSignup.ts';

/** The event, its form, and who is registering (an active member pays the member fee). */
async function context({ params, locals }: Pick<RequestEvent, 'params' | 'locals'>) {
	const ev = await eventBySlug(params.slug, locals.user?.role === 'admin');
	if (!ev || ev.registration !== 'form')
		error(404, 'Registration for this event isn’t on this site.');
	const member =
		locals.user?.role === 'member' ? await getMe(locals.user.id).catch(() => undefined) : undefined;
	return signup(ev, member);
}

export const load: PageServerLoad = async (event) => signupPageData(await context(event));

export const actions: Actions = {
	default: async (event) => submitSignup(await context(event), event.request)
};
