import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { paginate } from '#lib/paging.ts';
import {
	cancelRedemption,
	myRedemptions,
	pointsHistory,
	pointsSummary,
	syncAutoPoints
} from '#lib/server/loyalty.ts';

export const load: PageServerLoad = async ({ locals, url }) => {
	const me = locals.user!.id;
	await syncAutoPoints();
	const [summary, history, requests] = await Promise.all([
		pointsSummary(me),
		pointsHistory(me),
		myRedemptions(me)
	]);
	const { items, pager } = paginate(history, url, 15);
	return { summary, history: items, pager, requests };
};

export const actions: Actions = {
	cancel: async ({ request, locals }) => {
		const data = await request.formData();
		const r = await cancelRedemption(locals.user!.id, Number(data.get('id')));
		if ('error' in r) return fail(400, { error: r.error });
		return { done: 'Request withdrawn — those points are free to use again.' };
	}
};
