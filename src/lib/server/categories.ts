// The one list of business categories: the built-in ones plus any an admin has approved.
// A category someone types under "Other" waits in Admin → Categories until it's approved
// or moved into a listed category.
import { and, eq, sql } from 'drizzle-orm';
import { categories as builtIn } from '#lib/categories.ts';
import { atomically, db } from '#lib/server/db/index.ts';
import { memberProfile, membershipApplication, siteSetting } from '#lib/server/db/schema.ts';

const KEY = 'approved-categories';
const sameName = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();
const alphabetical = (a: string, b: string) => a.localeCompare(b, 'en', { sensitivity: 'base' });

async function approved() {
	const [row] = await db
		.select({ value: siteSetting.value })
		.from(siteSetting)
		.where(eq(siteSetting.key, KEY));
	return Array.isArray(row?.value) ? (row.value as string[]) : [];
}

/** Every listed category, alphabetically. Falls back to the built-in list if it can't be read. */
export async function getCategories(): Promise<string[]> {
	const extra = await approved().catch((e) => {
		console.error('[categories] approved list unavailable:', e);
		return [] as string[];
	});
	return [...new Set([...builtIn, ...extra])].sort(alphabetical);
}

/** The listed spelling of a category, so "digital marketing agency" doesn't count as new. */
export function listedName(value: string, list: string[]) {
	const key = sameName(value);
	return list.find((c) => sameName(c) === key) ?? value.trim().replace(/\s+/g, ' ');
}

export type PendingCategory = { name: string; members: number; applications: number };

/** Categories in use that aren't on the list yet, with how many people use each. */
export async function pendingCategories(): Promise<PendingCategory[]> {
	const [list, used, applied] = await Promise.all([
		getCategories(),
		db
			.select({ name: memberProfile.industry, n: sql<number>`count(*)::int` })
			.from(memberProfile)
			.groupBy(memberProfile.industry),
		db
			.select({ name: membershipApplication.industry, n: sql<number>`count(*)::int` })
			.from(membershipApplication)
			.where(eq(membershipApplication.status, 'pending'))
			.groupBy(membershipApplication.industry)
	]);
	const listedKeys = new Set(list.map(sameName));
	const found = new Map<string, PendingCategory>();
	const entry = (name: string) => {
		const row = found.get(name) ?? { name, members: 0, applications: 0 };
		found.set(name, row);
		return row;
	};
	for (const r of used)
		if (r.name.trim() && !listedKeys.has(sameName(r.name))) entry(r.name).members += r.n;
	for (const r of applied)
		if (r.name.trim() && !listedKeys.has(sameName(r.name))) entry(r.name).applications += r.n;
	return [...found.values()].sort((a, b) => alphabetical(a.name, b.name));
}

/** Adds categories to the list in one statement, so two admins can't overwrite each other. */
export async function approveCategories(names: string[]) {
	const clean = [...new Set(names.map((n) => n.trim().replace(/\s+/g, ' ')).filter(Boolean))];
	if (!clean.length) return;
	const added = JSON.stringify(clean);
	await db
		.insert(siteSetting)
		.values({ key: KEY, value: clean, updatedAt: new Date() })
		.onConflictDoUpdate({
			target: siteSetting.key,
			set: {
				value: sql`(select jsonb_agg(distinct v) from jsonb_array_elements(${siteSetting.value} || ${added}::jsonb) as t(v))`,
				updatedAt: new Date()
			}
		});
}

/** Moves everyone using a category into a listed one, for typos and near-duplicates. */
export async function moveCategory(from: string, to: string) {
	await atomically((d) => [
		d.update(memberProfile).set({ industry: to }).where(eq(memberProfile.industry, from)),
		d
			.update(membershipApplication)
			.set({ industry: to })
			.where(
				and(eq(membershipApplication.industry, from), eq(membershipApplication.status, 'pending'))
			)
	]);
}
