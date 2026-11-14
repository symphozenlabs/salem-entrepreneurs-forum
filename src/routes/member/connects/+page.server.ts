import { fail } from '@sveltejs/kit';
import { paginate } from '#lib/paging.ts';
import type { Actions, PageServerLoad } from './$types';
import {
	closeConnect,
	giveConnect,
	memberOptions,
	myConnects,
	respondToTransaction,
	setConnectStatus
} from '#lib/server/network.ts';
import { rangeFrom } from '#lib/server/ranges.ts';

const VIEWS = ['give', 'received', 'given'] as const;

export const load: PageServerLoad = async ({ locals, url }) => {
	const me = locals.user!.id;
	const range = rangeFrom(url);
	const param = url.searchParams.get('view');
	const view = VIEWS.includes(param as (typeof VIEWS)[number])
		? (param as (typeof VIEWS)[number])
		: 'give';
	const [options, connects] = await Promise.all([memberOptions(me), myConnects(me, range)]);
	const { items, pager } = paginate(
		view === 'received' ? connects.received : view === 'given' ? connects.given : [],
		url,
		20
	);
	return {
		options,
		rows: items,
		pager,
		counts: { received: connects.received.length, given: connects.given.length },
		view,
		to: url.searchParams.get('to') ?? '',
		range: { from: range.fromValue, to: range.toValue }
	};
};

const field = (data: FormData, key: string) => String(data.get(key) ?? '').trim();
/** "₹25,000" → "25000"; text with no digits is kept so it's reported as invalid. */
const rupeeText = (v: string) => v.replace(/[^\d.]/g, '') || v;

export const actions: Actions = {
	give: async ({ request, locals }) => {
		const data = await request.formData();
		const input = {
			toId: field(data, 'toId'),
			kind: field(data, 'kind'),
			contactName: field(data, 'contactName'),
			contactPhone: field(data, 'contactPhone'),
			value: rupeeText(field(data, 'value')),
			notes: field(data, 'notes').slice(0, 1000)
		};
		if (!input.toId)
			return fail(400, {
				give: { error: 'Choose the member you’re giving the connect to.', values: input }
			});
		const result = await giveConnect(locals.user!.id, {
			...input,
			value: input.value === '' ? null : Number(input.value)
		});
		if ('error' in result) return fail(400, { give: { error: result.error, values: input } });
		return { give: { ok: true, recorded: input.value !== '' } };
	},
	done: async ({ request, locals }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		const amount = Number(rupeeText(field(data, 'amount')));
		const result = await closeConnect(
			locals.user!.id,
			id,
			amount,
			field(data, 'description').slice(0, 500)
		);
		if ('error' in result) return fail(400, { done: { id, error: result.error } });
		return { done: { id, ok: true } };
	},
	approve: async ({ request, locals }) => {
		const data = await request.formData();
		const result = await respondToTransaction(locals.user!.id, Number(data.get('txn')), true, '');
		if ('error' in result) return fail(400, { status: { error: result.error } });
	},
	decline: async ({ request, locals }) => {
		const data = await request.formData();
		const result = await respondToTransaction(
			locals.user!.id,
			Number(data.get('txn')),
			false,
			field(data, 'reason').slice(0, 300)
		);
		if ('error' in result) return fail(400, { status: { error: result.error } });
	},
	status: async ({ request, locals }) => {
		const data = await request.formData();
		const result = await setConnectStatus(
			locals.user!.id,
			Number(data.get('id')),
			field(data, 'status')
		);
		if ('error' in result) return fail(400, { status: { error: result.error } });
	}
};
