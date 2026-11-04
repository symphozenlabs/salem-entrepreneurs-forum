import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	memberOptions,
	myTransactions,
	recordTransaction,
	respondToTransaction,
	withdrawTransaction
} from '#lib/server/network.ts';
import { rangeFrom } from '#lib/server/ranges.ts';

export const load: PageServerLoad = async ({ locals, url }) => {
	const me = locals.user!.id;
	const range = rangeFrom(url);
	const view = url.searchParams.get('view') === 'record' ? 'record' : 'list';
	const [options, transactions] = await Promise.all([memberOptions(me), myTransactions(me, range)]);
	return {
		options,
		transactions,
		view,
		with: url.searchParams.get('with') ?? '',
		range: { from: range.fromValue, to: range.toValue }
	};
};

const field = (data: FormData, key: string) => String(data.get(key) ?? '').trim();

export const actions: Actions = {
	record: async ({ request, locals }) => {
		const data = await request.formData();
		const values = {
			otherId: field(data, 'otherId'),
			direction: field(data, 'direction'),
			kind: field(data, 'kind'),
			amount: field(data, 'amount'),
			description: field(data, 'description').slice(0, 500)
		};
		if (!values.otherId) return fail(400, { record: { error: 'Choose the member.', values } });
		const result = await recordTransaction(locals.user!.id, {
			...values,
			amount: Number(values.amount.replace(/[₹,\s]/g, '')),
			connectId: null
		});
		if ('error' in result) return fail(400, { record: { error: result.error, values } });
		return { record: { ok: true } };
	},
	confirm: async ({ request, locals }) => {
		const result = await respondToTransaction(
			locals.user!.id,
			Number((await request.formData()).get('id')),
			true,
			''
		);
		if ('error' in result) return fail(400, { respond: { error: result.error } });
	},
	decline: async ({ request, locals }) => {
		const data = await request.formData();
		const result = await respondToTransaction(
			locals.user!.id,
			Number(data.get('id')),
			false,
			field(data, 'reason').slice(0, 300)
		);
		if ('error' in result) return fail(400, { respond: { error: result.error } });
	},
	withdraw: async ({ request, locals }) => {
		const result = await withdrawTransaction(
			locals.user!.id,
			Number((await request.formData()).get('id'))
		);
		if ('error' in result) return fail(400, { respond: { error: result.error } });
	}
};
