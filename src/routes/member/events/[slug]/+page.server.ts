import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad, RequestEvent } from './$types';
import { memberEventBySlug } from '#lib/server/events.ts';
import { getMe } from '#lib/server/network.ts';
import { myRegistration, signup, signupPageData, submitSignup } from '#lib/server/eventSignup.ts';

async function context({ params, locals }: Pick<RequestEvent, 'params' | 'locals'>) {
	const [ev, me] = await Promise.all([memberEventBySlug(params.slug), getMe(locals.user!.id)]);
	if (!ev) error(404, 'This event isn’t open to members here.');
	if (!me) error(500, 'Your member profile is missing. Please contact the secretariat.');
	return { me, s: signup(ev, me) };
}

export const load: PageServerLoad = async (event) => {
	const { me, s } = await context(event);
	const [page, mine] = await Promise.all([signupPageData(s), myRegistration(s.ev.id, me.id)]);
	return {
		...page,
		// Shown even when the membership has expired (they then pay the regular fee).
		prefill: { name: me.name, email: me.email, phone: me.phone },
		mine: mine ?? null
	};
};

export const actions: Actions = {
	// Members register as themselves: name, email and phone come from their profile.
	default: async (event) => {
		const { me, s } = await context(event);
		return submitSignup(s, event.request, {
			userId: me.id,
			name: me.name,
			email: me.email,
			phone: me.phone
		});
	}
};
