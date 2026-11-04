import type { PageServerLoad } from './$types';
import { myTransactions, performance } from '#lib/server/network.ts';

export const load: PageServerLoad = async ({ locals }) => {
	const me = locals.user!.id;
	const [perf, txns] = await Promise.all([
		performance(me),
		myTransactions(me, { from: null, to: null })
	]);
	return { perf, awaiting: txns.filter((t) => t.awaitingMe).slice(0, 5) };
};
