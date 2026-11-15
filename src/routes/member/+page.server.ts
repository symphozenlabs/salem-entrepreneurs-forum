import type { PageServerLoad } from './$types';
import { myTransactions, performance } from '#lib/server/network.ts';
import { pointsSummary, syncAutoPoints } from '#lib/server/loyalty.ts';

export const load: PageServerLoad = async ({ locals }) => {
	const me = locals.user!.id;
	const [perf, txns] = await Promise.all([
		performance(me),
		myTransactions(me, { from: null, to: null })
	]);
	// The overview must still open if points can't be read (e.g. before `db:push` adds the tables).
	const points = await syncAutoPoints()
		.then(() => pointsSummary(me))
		.catch((e) => {
			console.error('[overview] loyalty points unavailable:', e);
			return null;
		});
	return { perf, points, awaiting: txns.filter((t) => t.awaitingMe).slice(0, 5) };
};
