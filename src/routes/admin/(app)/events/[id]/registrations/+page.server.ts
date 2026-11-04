import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { eventById } from '#lib/server/events.ts';
import {
	cancelRegistration,
	confirmRegistration,
	registrationsFor,
	rejectRegistration
} from '#lib/server/registrations.ts';

const TABS = ['pending', 'confirmed', 'rejected', 'all'] as const;
type Tab = (typeof TABS)[number];

export const load: PageServerLoad = async ({ params, url }) => {
	const id = Number(params.id);
	const ev = Number.isInteger(id) && id > 0 ? await eventById(id) : undefined;
	if (!ev) error(404, 'No such event.');
	const all = await registrationsFor(ev.id);
	const param = url.searchParams.get('show') as Tab;
	// Open on whatever needs attention: payments to verify, else the confirmed list.
	const show: Tab = TABS.includes(param)
		? param
		: all.some((r) => r.status === 'pending')
			? 'pending'
			: 'confirmed';
	const count = (s: string) => all.filter((r) => r.status === s).length;
	return {
		event: ev,
		show,
		registrations: show === 'all' ? all : all.filter((r) => r.status === show),
		counts: {
			pending: count('pending'),
			confirmed: count('confirmed'),
			rejected: count('rejected')
		},
		collected: all.filter((r) => r.status === 'confirmed').reduce((sum, r) => sum + r.amount, 0)
	};
};

const idOf = async (request: Request) => {
	const data = await request.formData();
	return {
		id: Number(data.get('id')),
		note: String(data.get('note') ?? '')
			.trim()
			.slice(0, 500)
	};
};

export const actions: Actions = {
	confirm: async ({ request, locals }) => {
		const { id } = await idOf(request);
		const r = await confirmRegistration(id, locals.user!.id);
		if ('error' in r) return fail(400, { error: r.error });
		return { done: `${r.name} is confirmed${r.emailed ? ' and was emailed' : ''}.` };
	},
	reject: async ({ request, locals }) => {
		const { id, note } = await idOf(request);
		const r = await rejectRegistration(id, locals.user!.id, note);
		if ('error' in r) return fail(400, { error: r.error });
		return {
			done: `${r.name}’s registration was rejected${r.emailed ? ' and they were emailed' : ''}.`
		};
	},
	cancel: async ({ request, locals }) => {
		const { id } = await idOf(request);
		const r = await cancelRegistration(id, locals.user!.id);
		if ('error' in r) return fail(400, { error: r.error });
		return { done: `${r.name}’s seat was cancelled and is free again.` };
	}
};
