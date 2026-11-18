import type { RequestHandler } from './$types';
import { templateCsv } from '#lib/server/member-import.ts';

/** The bulk-upload template: open it in Excel or Google Sheets, fill it in, save as CSV. */
export const GET: RequestHandler = () =>
	new Response(templateCsv(), {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': 'attachment; filename="members-template.csv"'
		}
	});
