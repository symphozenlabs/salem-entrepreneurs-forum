import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { directory, directoryStats } from '#lib/server/network.ts';
import { getCategories } from '#lib/server/categories.ts';

/** Members per page in each view. */
const PER_PAGE = { grid: 12, list: 25 } as const;

export const load: PageServerLoad = async ({ locals, url }) => {
	const q = (url.searchParams.get('q') ?? '').trim().slice(0, 80);
	const industry = url.searchParams.get('industry') ?? '';
	const hub = url.searchParams.get('hub') ?? '';
	const all = url.searchParams.has('all');
	const view = url.searchParams.get('view') === 'list' ? 'list' : 'grid';
	const perPage = PER_PAGE[view];
	const requested = Math.max(1, Math.floor(Number(url.searchParams.get('page')) || 1));
	// Members are listed only once the visitor searches (an empty search lists everyone),
	// filters, or asks to browse all; the bare page shows just the numbers and the search.
	const searched = all || url.searchParams.has('q') || !!industry || !!hub;
	const categories = await getCategories();
	const [result, stats] = await Promise.all([
		searched
			? directory(
					locals.user!.id,
					{ q, industry, hub, listed: categories },
					{ limit: perPage, offset: (requested - 1) * perPage }
				)
			: null,
		directoryStats()
	]);
	const members = result?.members ?? [];
	const total = result?.total ?? 0;
	const pages = Math.max(1, Math.ceil(total / perPage));
	// Past the end (an old link, or fewer results now): go to the last page.
	if (requested > pages) {
		const to = new URL(url);
		if (pages > 1) to.searchParams.set('page', String(pages));
		else to.searchParams.delete('page');
		redirect(303, to.pathname + to.search);
	}
	return {
		members,
		total,
		page: requested,
		pages,
		perPage,
		view,
		searched,
		stats,
		industries: [...categories, 'Other'],
		q,
		industry,
		hub
	};
};
