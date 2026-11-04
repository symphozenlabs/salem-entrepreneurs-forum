import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { eventById } from '#lib/server/events.ts';
import { registrationsFor } from '#lib/server/registrations.ts';
import { cleanFields, type Answer } from '#lib/forms.ts';
import { eventShortDate, eventTime } from '#lib/events.ts';

/** Every registration for an event as a spreadsheet (opens in Excel or Google Sheets). */
export const GET: RequestHandler = async ({ params }) => {
	const ev = await eventById(Number(params.id));
	if (!ev) error(404);
	const rows = await registrationsFor(ev.id);

	// One column per question: the event's current questions first, then any older ones
	// that were answered before the form changed.
	const labels = cleanFields(ev.formFields).fields.map((f) => f.label);
	for (const r of rows)
		for (const a of r.answers as Answer[]) if (!labels.includes(a.label)) labels.push(a.label);

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
		...labels
	];
	const lines = rows.map((r) => {
		const answers = new Map((r.answers as Answer[]).map((a) => [a.label, a.value]));
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
			...labels.map((l) => answers.get(l) ?? '')
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
