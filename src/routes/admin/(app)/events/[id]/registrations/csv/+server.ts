import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { eventById } from '#lib/server/events.ts';
import { registrationsFor } from '#lib/server/registrations.ts';
import { cleanFields, type Answer } from '#lib/forms.ts';
import { eventShortDate, eventTime } from '#lib/events.ts';

/** Every registration for an event as a spreadsheet (opens in Excel or Google Sheets). */
export const GET: RequestHandler = async ({ params }) => {
	const id = Number(params.id);
	const ev = Number.isInteger(id) && id > 0 ? await eventById(id) : undefined;
	if (!ev) error(404);
	const rows = await registrationsFor(ev.id);

	// One column per question, matched by the question's id so a renamed question keeps
	// one column: the event's current questions first, then any removed ones.
	const fields = cleanFields(ev.formFields).fields;
	const columns = fields.map((f) => ({ key: f.id, label: f.label }));
	const keyOf = (a: Answer) =>
		a.id ?? fields.find((f) => f.label === a.label)?.id ?? `label:${a.label}`;
	for (const r of rows)
		for (const a of r.answers as Answer[])
			if (!columns.some((c) => c.key === keyOf(a))) columns.push({ key: keyOf(a), label: a.label });

	const header = [
		'Reference',
		'Status',
		'Name',
		'Email',
		'Phone',
		'Member',
		'Amount (₹)',
		'UTR',
		'Registered',
		...columns.map((c) => c.label)
	];
	const lines = rows.map((r) => {
		const answers = new Map((r.answers as Answer[]).map((a) => [keyOf(a), a.value]));
		return [
			r.code,
			r.status,
			r.name,
			r.email,
			r.phone,
			r.isMember ? 'Yes' : 'No',
			String(r.amount),
			r.utr ?? '',
			`${eventShortDate(r.createdAt)} ${eventTime(r.createdAt)}`,
			...columns.map((c) => answers.get(c.key) ?? '')
		];
	});

	// Quote every cell; neutralise leading = + - @ so spreadsheets don't run them as formulas.
	const cell = (v: string) => `"${(/^[=+\-@]/.test(v) ? `'${v}` : v).replace(/"/g, '""')}"`;
	const csv = '﻿' + [header, ...lines].map((row) => row.map(cell).join(',')).join('\r\n');
	return new Response(csv, {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': `attachment; filename="${ev.slug}-registrations.csv"`,
			'cache-control': 'private, no-store'
		}
	});
};
