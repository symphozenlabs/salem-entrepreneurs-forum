import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { paginate } from '#lib/paging.ts';
import {
	allEntries,
	approveRedemption,
	awardPoints,
	eventAttendees,
	memberBalances,
	memberChoices,
	redemptionCounts,
	redemptions,
	rejectRedemption,
	restoreEntry,
	setLevel,
	syncAutoPoints,
	voidEntry
} from '#lib/server/loyalty.ts';

import { MAX_ACTIVITY_POINTS, standardActivities } from '#lib/loyalty.ts';
import { getActivityPoints, saveActivityPoints } from '#lib/server/settings.ts';

const VIEWS = ['requests', 'members', 'log', 'award'] as const;
type View = (typeof VIEWS)[number];
const STATUSES = ['pending', 'approved', 'rejected', 'cancelled'] as const;

export const load: PageServerLoad = async ({ url }) => {
	const param = url.searchParams.get('view');
	const view: View = VIEWS.includes(param as View) ? (param as View) : 'requests';
	await syncAutoPoints();
	const [counts, activityPoints] = await Promise.all([redemptionCounts(), getActivityPoints()]);

	if (view === 'requests') {
		const s = url.searchParams.get('show');
		const show = STATUSES.includes(s as (typeof STATUSES)[number]) ? s! : 'pending';
		const { items, pager } = paginate(await redemptions(show), url, 20);
		return { view: 'requests' as const, counts, activityPoints, show, requests: items, pager };
	}
	if (view === 'members') {
		const q = (url.searchParams.get('q') ?? '').trim().slice(0, 80);
		const rows = await memberBalances(q);
		const totals = rows.reduce(
			(t, m) => ({
				balance: t.balance + m.balance,
				earned: t.earned + m.earned,
				redeemed: t.redeemed + m.redeemed
			}),
			{ balance: 0, earned: 0, redeemed: 0 }
		);
		const { items, pager } = paginate(rows, url, 25);
		return { view: 'members' as const, counts, activityPoints, q, balances: items, totals, pager };
	}
	if (view === 'log') {
		const member = url.searchParams.get('member') || null;
		const [entries, members] = await Promise.all([allEntries(member), memberChoices()]);
		const { items, pager } = paginate(entries, url, 30);
		return { view: 'log' as const, counts, activityPoints, member, entries: items, members, pager };
	}
	const [members, events] = await Promise.all([memberChoices(), eventAttendees()]);
	return { view: 'award' as const, counts, activityPoints, members, events };
};

const id = (data: FormData) => Number(data.get('id'));
const note = (data: FormData) =>
	String(data.get('note') ?? '')
		.trim()
		.slice(0, 500);

export const actions: Actions = {
	rates: async ({ request }) => {
		const data = await request.formData();
		const rates = Object.fromEntries(
			standardActivities.map((k) => [k, Number(data.get(`rate-${k}`))])
		);
		if (Object.values(rates).some((n) => !Number.isInteger(n) || n < 1 || n > MAX_ACTIVITY_POINTS))
			return fail(400, {
				error: `Enter each activity’s points as a whole number from 1 to ${MAX_ACTIVITY_POINTS.toLocaleString('en-IN')}.`
			});
		await saveActivityPoints(rates);
		return { done: 'Activity points updated. Points already given stay the same.' };
	},

	approve: async ({ request, locals }) => {
		const data = await request.formData();
		const r = await approveRedemption(id(data), locals.user!.id, note(data));
		if ('error' in r) return fail(400, { error: r.error });
		return { done: 'Approved — the points have been taken off the member’s balance.' };
	},

	reject: async ({ request, locals }) => {
		const data = await request.formData();
		const r = await rejectRedemption(id(data), locals.user!.id, note(data));
		if ('error' in r) return fail(400, { error: r.error });
		return { done: 'Request declined — the member keeps their points.' };
	},

	award: async ({ request, locals }) => {
		const data = await request.formData();
		const date = String(data.get('date') ?? '');
		// The date picker gives a calendar day; read it as midday in India.
		const occurredAt = /^\d{4}-\d{2}-\d{2}$/.test(date)
			? new Date(`${date}T12:00:00+05:30`)
			: new Date(NaN);
		const r = await awardPoints(locals.user!.id, {
			memberIds: data.getAll('member').map(String),
			kind: String(data.get('kind') ?? ''),
			points: Number(data.get('points')),
			note: note(data),
			occurredAt
		});
		if ('error' in r) return fail(400, { error: r.error });
		return { done: `Points saved for ${r.count} member${r.count === 1 ? '' : 's'}.` };
	},

	level: async ({ request }) => {
		const data = await request.formData();
		const level = String(data.get('level') ?? '');
		const r = await setLevel(String(data.get('member') ?? ''), level || null);
		if ('error' in r) return fail(400, { error: r.error });
		return { done: level ? 'Level set by hand.' : 'Level now follows the member’s points.' };
	},

	void: async ({ request, locals }) => {
		const r = await voidEntry(id(await request.formData()), locals.user!.id);
		if ('error' in r) return fail(400, { error: r.error });
		return { done: 'Entry cancelled — it no longer counts towards the balance.' };
	},

	restore: async ({ request }) => {
		const r = await restoreEntry(id(await request.formData()));
		if ('error' in r) return fail(400, { error: r.error });
		return { done: 'Entry restored.' };
	}
};
