import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { pointsSummary, requestRedemption, syncAutoPoints } from '#lib/server/loyalty.ts';

export const load: PageServerLoad = async ({ locals }) => {
	await syncAutoPoints();
	return { summary: await pointsSummary(locals.user!.id) };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const data = await request.formData();
		const reward = String(data.get('reward') ?? '');
		const note = String(data.get('note') ?? '')
			.trim()
			.slice(0, 500);
		const r = await requestRedemption(locals.user!.id, reward, note);
		if ('error' in r) return fail(400, { error: r.error, reward });
		return { done: r.reward };
	}
};
