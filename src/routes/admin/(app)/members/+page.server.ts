import { fail } from '@sveltejs/kit';
import { and, eq, ilike, or } from 'drizzle-orm';
import { paginate } from '#lib/paging.ts';
import type { Actions, PageServerLoad } from './$types';
import { db } from '#lib/server/db/index.ts';
import { memberProfile, user } from '#lib/server/db/schema.ts';
import { addMember, emailLogin, resetMemberPassword } from '#lib/server/members.ts';
import { checkMember, readMembersCsv, type Raw } from '#lib/server/member-import.ts';
import { industryFrom, RENEWAL_WINDOW_DAYS } from '#lib/membership.ts';
import { firstImportAt, markFirstImport } from '#lib/server/settings.ts';
import { isHub } from '#lib/network.ts';

const SORTS = ['number', 'name', 'hub', 'business', 'contact', 'joined', 'expires'] as const;
type Sort = (typeof SORTS)[number];
const STATUSES = ['active', 'expiring', 'expired'] as const;

export const load: PageServerLoad = async ({ url }) => {
	const p = url.searchParams;
	const q = (p.get('q') ?? '').trim().slice(0, 80);
	const term = q ? `%${q.replace(/[%_\\]/g, '\\$&')}%` : null;
	const all = await db
		.select({
			id: user.id,
			name: user.name,
			email: user.email,
			mustChangePassword: user.mustChangePassword,
			phone: memberProfile.phone,
			memberNumber: memberProfile.memberNumber,
			business: memberProfile.business,
			industry: memberProfile.industry,
			hub: memberProfile.hub,
			joinedAt: memberProfile.joinedAt,
			expiresAt: memberProfile.expiresAt
		})
		.from(memberProfile)
		.innerJoin(user, eq(user.id, memberProfile.userId))
		.where(
			and(
				eq(user.role, 'member'),
				term
					? or(
							ilike(user.name, term),
							ilike(user.email, term),
							ilike(memberProfile.business, term),
							ilike(memberProfile.memberNumber, term),
							ilike(memberProfile.phone, term)
						)
					: undefined
			)
		)
		.limit(5000);

	// Filters, from the dropdowns above the list.
	const hub = isHub(p.get('hub')) ? p.get('hub')! : '';
	const category = (p.get('category') ?? '').slice(0, 60);
	const status = STATUSES.find((s) => s === p.get('status')) ?? '';
	const signin = p.get('signin') === 'yes' || p.get('signin') === 'no' ? p.get('signin')! : '';
	const now = Date.now();
	const stateOf = (d: Date) => {
		const days = (d.getTime() - now) / 86_400_000;
		return days <= 0 ? 'expired' : days <= RENEWAL_WINDOW_DAYS ? 'expiring' : 'active';
	};
	const rows = all.filter(
		(m) =>
			(!hub || m.hub === hub) &&
			(!category || (category === '—' ? !m.industry : m.industry === category)) &&
			(!status || stateOf(m.expiresAt) === status) &&
			(!signin || (signin === 'no') === m.mustChangePassword)
	);

	// Sorting, from the column titles: member number (ascending) unless chosen otherwise.
	const sort: Sort = SORTS.find((s) => s === p.get('sort')) ?? 'number';
	const dir = p.get('dir') === 'desc' ? -1 : 1;
	const text = (a: string, b: string) =>
		a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' });
	const key: Record<Sort, (a: (typeof all)[number], b: (typeof all)[number]) => number> = {
		number: (a, b) => text(a.memberNumber, b.memberNumber),
		name: (a, b) => text(a.name, b.name),
		hub: (a, b) => text(a.hub, b.hub) || text(a.memberNumber, b.memberNumber),
		business: (a, b) => text(a.business || '~', b.business || '~'),
		contact: (a, b) => text(a.email, b.email),
		joined: (a, b) => a.joinedAt.getTime() - b.joinedAt.getTime(),
		expires: (a, b) => a.expiresAt.getTime() - b.expiresAt.getTime()
	};
	rows.sort((a, b) => key[sort](a, b) * dir || text(a.memberNumber, b.memberNumber));

	const categories = [...new Set(all.map((m) => m.industry).filter(Boolean))].sort(text);
	const { items, pager } = paginate(rows, url, 25);
	return {
		members: items,
		pager,
		q,
		filters: { hub, category, status, signin },
		sort,
		dir: dir === 1 ? ('asc' as const) : ('desc' as const),
		categories,
		hasBlankCategory: all.some((m) => !m.industry),
		totalMembers: all.length,
		firstImportDone: !!(await firstImportAt())
	};
};

const FIELDS = [
	'name',
	'email',
	'phone',
	'business',
	'hub',
	'joinedOn',
	'designation',
	'city',
	'instagram',
	'website'
] as const;

export const actions: Actions = {
	add: async ({ request }) => {
		const data = await request.formData();
		const raw = Object.fromEntries(
			FIELDS.map((k) => [k, String(data.get(k) ?? '')])
		) as Partial<Raw>;
		raw.industry = industryFrom(data);
		const checked = checkMember(raw);
		if (!checked.ok)
			return fail(400, {
				add: { errors: checked.errors, values: { ...raw, industry: raw.industry } }
			});
		const r = await addMember(checked.member);
		if ('error' in r) return fail(400, { add: { errors: { email: r.error }, values: raw } });
		return {
			added: { ...r.credentials, phone: checked.member.phone, memberNumber: r.memberNumber }
		};
	},

	import: async ({ request }) => {
		const form = await request.formData();
		const file = form.get('file');
		const skipProblems = form.get('skipProblems') === 'on';
		if (!(file instanceof File) || !file.size)
			return fail(400, { imported: { error: 'Choose the CSV file to upload.' } });
		if (file.size > 1_000_000)
			return fail(400, { imported: { error: 'That file is too large — keep it under 1 MB.' } });
		if (!/\.csv$/i.test(file.name) && !file.type.includes('csv'))
			return fail(400, {
				imported: {
					error: 'Upload a CSV file. In Excel or Google Sheets: File → Save as / Download → CSV.'
				}
			});
		const taken = new Set(
			(await db.select({ email: user.email }).from(user)).map((u) => u.email.toLowerCase())
		);
		const first = !(await firstImportAt());
		const read = readMembersCsv(await file.text(), taken, { byJoiningDate: first, skipProblems });
		if ('error' in read) return fail(400, { imported: { error: read.error } });
		if ('problems' in read) return fail(400, { imported: { problems: read.problems } });

		// One at a time, so member numbers follow the order above; emails go out afterwards.
		const added = [];
		const failed: string[] = [];
		for (const m of read.members) {
			const r = await addMember(m, { email: false });
			if (r.error !== undefined) failed.push(r.error);
			else added.push({ ...r.credentials, phone: m.phone, memberNumber: r.memberNumber });
		}
		for (let i = 0; i < added.length; i += 5) {
			const batch = added.slice(i, i + 5);
			const sent = await Promise.all(batch.map((a) => emailLogin(a)));
			sent.forEach((ok, j) => (batch[j].emailed = ok));
		}
		if (first && added.length) await markFirstImport();
		return { imported: { added, failed, skipped: read.skipped, byJoiningDate: first } };
	},

	hub: async ({ request }) => {
		const data = await request.formData();
		const hub = String(data.get('hub') ?? '');
		if (!isHub(hub)) return fail(400, { error: 'Choose Salem, Coimbatore or Tamil Nadu.' });
		const updated = await db
			.update(memberProfile)
			.set({ hub })
			.where(eq(memberProfile.userId, String(data.get('id') ?? '')))
			.returning({ id: memberProfile.userId });
		if (!updated.length) return fail(404, { error: 'That member no longer exists.' });
	},
	reset: async ({ request }) => {
		const id = String((await request.formData()).get('id') ?? '');
		const result = await resetMemberPassword(id);
		if ('error' in result) return fail(400, { error: result.error });
		const [m] = await db
			.select({ phone: memberProfile.phone })
			.from(memberProfile)
			.where(eq(memberProfile.userId, id));
		return { reset: { ...result.credentials, phone: m?.phone } };
	},
	remove: async ({ request }) => {
		const id = String((await request.formData()).get('id') ?? '');
		// Deleting the user removes their profile, sessions, connects and transactions (cascade).
		const removed = await db
			.delete(user)
			.where(and(eq(user.id, id), eq(user.role, 'member')))
			.returning({ name: user.name });
		if (!removed.length) return fail(404, { error: 'That member no longer exists.' });
		return { removed: removed[0].name };
	}
};
