import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { giveConnect, memberOptions, myConnects, setConnectStatus } from '#lib/server/network.ts';
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
	return {
		options,
		connects,
		view,
		to: url.searchParams.get('to') ?? '',
		range: { from: range.fromValue, to: range.toValue }
	};
};

const field = (data: FormData, key: string) => String(data.get(key) ?? '').trim();

export const actions: Actions = {
	give: async ({ request, locals }) => {
		const data = await request.formData();
		const input = {
			toId: field(data, 'toId'),
			kind: field(data, 'kind'),
			contactName: field(data, 'contactName'),
			contactPhone: field(data, 'contactPhone'),
			notes: field(data, 'notes').slice(0, 1000)
		};
		if (!input.toId)
			return fail(400, {
				give: { error: 'Choose the member you’re giving the connect to.', values: input }
			});
		const result = await giveConnect(locals.user!.id, input);
		if ('error' in result) return fail(400, { give: { error: result.error, values: input } });
		return { give: { ok: true } };
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
