/** Where a list is up to: shown by the Pagination component. */
export type Pager = { page: number; pages: number; total: number; perPage: number };

/** The current page (`?page=`) of an already-loaded list. Out-of-range pages snap to the nearest one. */
export function paginate<T>(rows: T[], url: URL, perPage = 20): { items: T[]; pager: Pager } {
	const total = rows.length;
	const pages = Math.max(1, Math.ceil(total / perPage));
	const page = Math.min(pages, Math.max(1, Math.floor(Number(url.searchParams.get('page')) || 1)));
	return {
		items: rows.slice((page - 1) * perPage, page * perPage),
		pager: { page, pages, total, perPage }
	};
}
