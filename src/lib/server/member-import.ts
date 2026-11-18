// Checking member details an admin enters, one by one or from a spreadsheet (CSV).
import { isEmail, safeUrl } from '#lib/server/admin.ts';
import { hubs, isHub } from '#lib/network.ts';
import { instagramUrl } from '#lib/membership.ts';
import type { MemberDetails } from '#lib/server/members.ts';

/** The spreadsheet's columns, in the template's order. `*` marks the required ones. */
export const COLUMNS = [
	{ key: 'name', label: 'Name', required: true },
	{ key: 'email', label: 'Email', required: true },
	{ key: 'phone', label: 'Phone', required: true },
	{ key: 'business', label: 'Business', required: true },
	{ key: 'industry', label: 'Category', required: true },
	{ key: 'hub', label: 'Hub', required: true },
	{ key: 'joinedOn', label: 'Joining date', required: true },
	{ key: 'designation', label: 'Designation', required: false },
	{ key: 'city', label: 'City', required: false },
	{ key: 'instagram', label: 'Instagram', required: false },
	{ key: 'website', label: 'Website', required: false }
] as const;

export type Raw = Record<(typeof COLUMNS)[number]['key'], string>;

const clean = (s: string, max = 200) => s.trim().replace(/\s+/g, ' ').slice(0, max);

/** A calendar day read as midday in India, so it never slips a day either way. */
const indiaDay = (y: number, m: number, d: number) => {
	const t = new Date(Date.UTC(y, m - 1, d));
	if (t.getUTCFullYear() !== y || t.getUTCMonth() !== m - 1 || t.getUTCDate() !== d) return null;
	const pad = (n: number) => String(n).padStart(2, '0');
	return new Date(`${y}-${pad(m)}-${pad(d)}T12:00:00+05:30`);
};

const MONTHS = 'jan feb mar apr may jun jul aug sep oct nov dec'.split(' ');

/**
 * A joining date as people write it: 2024-03-15, 15-03-2024, 15/03/2024, 15.03.2024 or
 * 15 Mar 2024 (day before month, as in India). Null if it isn't a real date.
 */
export function parseDay(input: string): Date | null {
	const s = input.trim();
	let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
	if (m) return indiaDay(+m[1], +m[2], +m[3]);
	m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
	if (m) return indiaDay(+m[3], +m[2], +m[1]);
	m = s.match(/^(\d{1,2})[\s-]+([a-z]{3})[a-z]*[\s-,]+(\d{4})$/i);
	if (m) {
		const month = MONTHS.indexOf(m[2].toLowerCase()) + 1;
		return month ? indiaDay(+m[3], month, +m[1]) : null;
	}
	return null;
}

/** Checks one member's details. Returns what to save, or what to fix per field. */
export function checkMember(
	raw: Partial<Raw>
): { ok: true; member: MemberDetails } | { ok: false; errors: Partial<Record<keyof Raw, string>> } {
	const v = Object.fromEntries(COLUMNS.map((c) => [c.key, String(raw[c.key] ?? '')])) as Raw;
	const errors: Partial<Record<keyof Raw, string>> = {};

	const name = clean(v.name, 120);
	const email = v.email.trim().toLowerCase();
	const phone = clean(v.phone, 20);
	const business = clean(v.business, 120);
	const industry = clean(v.industry, 60);
	const hub = hubs.find((h) => h.toLowerCase() === clean(v.hub).toLowerCase()) ?? '';
	const joinedAt = v.joinedOn.trim() ? parseDay(v.joinedOn) : new Date();

	if (!name) errors.name = 'Enter the name.';
	if (!isEmail(email)) errors.email = 'Enter a valid email — the login is sent here.';
	if (phone.replace(/\D/g, '').length < 10) errors.phone = 'Enter a 10-digit mobile number.';
	if (!business) errors.business = 'Enter the business name.';
	if (!industry) errors.industry = 'Enter the category.';
	if (!isHub(hub)) errors.hub = `Hub must be ${hubs.join(', ')}.`;
	if (!joinedAt) errors.joinedOn = 'Enter the joining date as DD-MM-YYYY.';
	else if (joinedAt.getTime() > Date.now() + 86_400_000)
		errors.joinedOn = 'The joining date can’t be in the future.';
	const instagram = v.instagram.trim() ? instagramUrl(v.instagram) : null;
	if (v.instagram.trim() && !instagram)
		errors.instagram = 'Enter an Instagram handle or profile link.';
	const website = safeUrl(v.website.trim());
	if (website === undefined) errors.website = 'Enter a full link, e.g. https://example.com';

	if (Object.keys(errors).length) return { ok: false, errors };
	return {
		ok: true,
		member: {
			name,
			email,
			phone,
			business,
			industry,
			hub,
			designation: clean(v.designation, 80) || null,
			city: clean(v.city, 80) || null,
			instagram,
			website: website ?? null,
			joinedAt: joinedAt!
		}
	};
}

/** Rows of a CSV file (Excel / Google Sheets "Save as CSV"), quotes and all. */
export function parseCsv(text: string): string[][] {
	const rows: string[][] = [];
	let row: string[] = [];
	let field = '';
	let quoted = false;
	const s = text.replace(/^﻿/, '');
	for (let i = 0; i < s.length; i++) {
		const c = s[i];
		if (quoted) {
			if (c === '"' && s[i + 1] === '"') {
				field += '"';
				i++;
			} else if (c === '"') quoted = false;
			else field += c;
		} else if (c === '"') quoted = true;
		else if (c === ',') {
			row.push(field);
			field = '';
		} else if (c === '\n' || c === '\r') {
			if (c === '\r' && s[i + 1] === '\n') i++;
			row.push(field);
			rows.push(row);
			row = [];
			field = '';
		} else field += c;
	}
	if (field || row.length) {
		row.push(field);
		rows.push(row);
	}
	return rows.filter((r) => r.some((f) => f.trim()));
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
/** Header names people might use for each column. */
const ALIASES: Record<string, (typeof COLUMNS)[number]['key']> = {
	...Object.fromEntries(COLUMNS.map((c) => [norm(c.label), c.key])),
	fullname: 'name',
	membername: 'name',
	emailid: 'email',
	emailaddress: 'email',
	mobile: 'phone',
	mobilenumber: 'phone',
	phonenumber: 'phone',
	whatsapp: 'phone',
	businessname: 'business',
	company: 'business',
	industry: 'industry',
	dateofjoining: 'joinedOn',
	joiningdate: 'joinedOn',
	joinedon: 'joinedOn',
	joined: 'joinedOn',
	doj: 'joinedOn',
	instagramid: 'instagram',
	instagramurl: 'instagram'
};

export const MAX_ROWS = 200;

export type RowProblem = { row: number; name: string; problems: string[] };

/**
 * Reads and checks a whole spreadsheet. Every row must be right before anything is
 * added, so a fixed file can simply be uploaded again.
 */
export function readMembersCsv(
	text: string,
	takenEmails: Set<string>,
	{ byJoiningDate }: { byJoiningDate: boolean }
) {
	const rows = parseCsv(text);
	if (rows.length < 2)
		return { error: 'The file has no members in it — check it has a header row.' };
	const keys = rows[0].map((h) => ALIASES[norm(h)]);
	const missing = COLUMNS.filter((c) => c.required && !keys.includes(c.key)).map((c) => c.label);
	if (missing.length)
		return {
			error: `The file is missing these columns: ${missing.join(', ')}. Use the template’s header row.`
		};
	const body = rows.slice(1);
	if (body.length > MAX_ROWS)
		return {
			error: `Upload at most ${MAX_ROWS} members at a time — this file has ${body.length}.`
		};

	const label = Object.fromEntries(COLUMNS.map((c) => [c.key, c.label]));
	const seen = new Set<string>();
	const members: MemberDetails[] = [];
	const problems: RowProblem[] = [];
	body.forEach((cells, i) => {
		const raw: Partial<Raw> = {};
		keys.forEach((k, j) => k && (raw[k] = cells[j] ?? ''));
		const r = checkMember(raw);
		const issues = r.ok ? [] : Object.entries(r.errors).map(([k, e]) => `${label[k]}: ${e}`);
		const email = (raw.email ?? '').trim().toLowerCase();
		if (email && takenEmails.has(email))
			issues.push(`Email: ${email} is already a member or admin.`);
		else if (email && seen.has(email)) issues.push(`Email: ${email} appears twice in the file.`);
		seen.add(email);
		if (issues.length)
			problems.push({ row: i + 2, name: (raw.name ?? '').trim(), problems: issues });
		else if (r.ok) members.push(r.member);
	});
	if (problems.length) return { problems };
	// First upload: earlier joiners get the earlier member numbers. Later: the file's order.
	return {
		members: byJoiningDate
			? members.sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime())
			: members
	};
}

/** The template's contents: the header row and one example. */
export const templateCsv = () =>
	[
		COLUMNS.map((c) => c.label).join(','),
		'Priya Raman,priya@example.com,9876543210,Raman Textiles,Textile & Garments,Salem,15-03-2024,Founder,Salem,priyaraman,https://ramantextiles.in'
	].join('\r\n') + '\r\n';
