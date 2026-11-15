import { json } from '@sveltejs/kit';
import { and, asc, eq, gt, ilike, type SQL } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { db } from '#lib/server/db/index.ts';
import { memberProfile, user } from '#lib/server/db/schema.ts';

/**
 * Finds the member an applicant names as their referrer on the public join form.
 * The page is open to anyone, so it needs at least two letters, returns at most a few
 * matches, and only lists active members who show themselves in the directory. Each
 * match carries what an applicant needs to recognise the person (name, business, hub)
 * plus the member ID the form sends back, which the page doesn't display.
 */

const MAX_RESULTS = 8;

/** "  G. Moulishwar " → "g moulishwar": lower case, letters and digits, single spaces. */
const normalise = (s: string) =>
	s
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^\p{L}\p{N}]+/gu, ' ')
		.trim();

const escapeLike = (s: string) => s.replace(/[%_\\]/g, '\\$&');

/** Edit distance, for tolerating a small typo in a name. */
function distance(a: string, b: string) {
	if (Math.abs(a.length - b.length) > 2) return 99;
	const row = Array.from({ length: b.length + 1 }, (_, i) => i);
	for (let i = 1; i <= a.length; i++) {
		let prev = row[0];
		row[0] = i;
		for (let j = 1; j <= b.length; j++) {
			const cur = row[j];
			row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
			prev = cur;
		}
	}
	return row[b.length];
}

/** How closely a name matches the search; lower is better, null is no match. */
function score(name: string, q: string, words: string[]): number | null {
	const n = normalise(name);
	const nameWords = n.split(' ');
	if (n === q) return 0;
	if (n.startsWith(q)) return 1;
	// Every word typed starts one of the name's words, in any order: "kumar as" → Asha Kumar.
	if (words.every((w) => nameWords.some((nw) => nw.startsWith(w)))) return 2;
	if (words.every((w) => n.includes(w))) return 3;
	// A small typo in each word: "moulishwer" → Moulishwar. Short words must match exactly.
	const close = words.every((w) =>
		nameWords.some(
			(nw) =>
				nw.startsWith(w) ||
				(w.length >= 4 &&
					// The whole word, or the same number of letters if they've only typed part of it.
					Math.min(distance(w, nw), distance(w, nw.slice(0, w.length))) <= (w.length >= 7 ? 2 : 1))
		)
	);
	return close ? 4 : null;
}

const listed = () =>
	and(eq(memberProfile.showInDirectory, true), gt(memberProfile.expiresAt, new Date()));

const candidates = (where?: SQL) =>
	db
		.select({
			ref: memberProfile.memberNumber,
			name: user.name,
			business: memberProfile.business,
			hub: memberProfile.hub
		})
		.from(memberProfile)
		.innerJoin(user, eq(user.id, memberProfile.userId))
		.where(and(listed(), where))
		.orderBy(asc(user.name))
		.limit(where ? 200 : 2000);

export const GET: RequestHandler = async ({ url, setHeaders }) => {
	setHeaders({ 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' });
	const q = normalise((url.searchParams.get('q') ?? '').slice(0, 60));
	if (q.replace(/ /g, '').length < 2) return json([]);
	const words = q.split(' ').slice(0, 5);

	// Names containing every typed word; if a typo leaves none, look at every listed member.
	let rows = await candidates(and(...words.map((w) => ilike(user.name, `%${escapeLike(w)}%`))));
	if (!rows.length) rows = await candidates();

	const ranked = rows
		.map((r) => ({ r, s: score(r.name, q, words) }))
		.filter((x): x is { r: (typeof rows)[number]; s: number } => x.s !== null)
		.sort((a, b) => a.s - b.s || a.r.name.localeCompare(b.r.name))
		.slice(0, MAX_RESULTS)
		.map(({ r }) => r);
	return json(ranked);
};
