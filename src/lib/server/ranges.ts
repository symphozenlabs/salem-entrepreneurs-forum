import { fromLocalInput } from '#lib/events.ts';
import type { DateRange } from '#lib/server/network.ts';

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** ?from=YYYY-MM-DD&to=YYYY-MM-DD, read as whole days in India time. */
export function rangeFrom(url: URL): DateRange & { fromValue: string; toValue: string } {
	const f = url.searchParams.get('from') ?? '';
	const t = url.searchParams.get('to') ?? '';
	return {
		from: DAY.test(f) ? fromLocalInput(`${f}T00:00`) : null,
		to: DAY.test(t) ? new Date(fromLocalInput(`${t}T23:59`)!.getTime() + 59_999) : null,
		fromValue: DAY.test(f) ? f : '',
		toValue: DAY.test(t) ? t : ''
	};
}
