// Event helpers shared by the public pages and the admin. Everything is shown in
// Salem's time zone, whatever the server's or visitor's clock says.
import { contact } from '#lib/content.ts';

export const TIME_ZONE = 'Asia/Kolkata';
const IST_OFFSET = '+05:30';

export const categories = [
	'Conclave',
	'Masterclass',
	'Networking dinner',
	'Workshop',
	'Industrial visit',
	'Roundtable',
	'Other'
] as const;

/** The fields public pages need (the row minus admin-only columns). */
export type PublicEvent = {
	id: number;
	slug: string;
	title: string;
	category: string;
	summary: string;
	description: string | null;
	startsAt: Date;
	endsAt: Date | null;
	venue: string;
	address: string | null;
	mapUrl: string | null;
	price: string | null;
	seats: number | null;
	registrationUrl: string | null;
	coverVersion: number | null;
};

const fmt = (opts: Intl.DateTimeFormatOptions) =>
	new Intl.DateTimeFormat('en-IN', { timeZone: TIME_ZONE, ...opts });

const dayFmt = fmt({ day: 'numeric' });
const monthFmt = fmt({ month: 'short' });
const longDateFmt = fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const shortDateFmt = fmt({ day: 'numeric', month: 'short', year: 'numeric' });
const timeFmt = fmt({ hour: 'numeric', minute: '2-digit', hour12: true });

export const eventDay = (d: Date) => dayFmt.format(d);
export const eventMonth = (d: Date) => monthFmt.format(d);
export const eventDate = (d: Date) => longDateFmt.format(d);
export const eventShortDate = (d: Date) => shortDateFmt.format(d);
export const eventTime = (d: Date) => timeFmt.format(d).toLowerCase();

/** "6:30 pm – 9:30 pm", or just the start time. Multi-day ends show their date. */
export function eventTimeRange(start: Date, end: Date | null) {
	if (!end) return eventTime(start);
	const sameDay = shortDateFmt.format(start) === shortDateFmt.format(end);
	return `${eventTime(start)} – ${sameDay ? '' : eventShortDate(end) + ', '}${eventTime(end)}`;
}

export const isPast = (e: { startsAt: Date; endsAt: Date | null }, now = new Date()) =>
	(e.endsAt ?? e.startsAt) < now;

export const coverUrl = (e: Pick<PublicEvent, 'id' | 'coverVersion'>) =>
	e.coverVersion ? `/media/events/${e.id}?v=${e.coverVersion}` : null;

/** Where the "Reserve" button goes: the event's own link, or WhatsApp with a ready-made message. */
export function reserveUrl(e: Pick<PublicEvent, 'title' | 'startsAt' | 'registrationUrl'>) {
	if (e.registrationUrl) return e.registrationUrl;
	const text = `Hello SEF secretariat, I'd like to reserve a seat for "${e.title}" on ${eventShortDate(e.startsAt)}.`;
	return `${contact.whatsapp}?text=${encodeURIComponent(text)}`;
}

/** Date → the value a <input type="datetime-local"> expects, in Salem time. */
export function toLocalInput(d: Date | null) {
	if (!d) return '';
	const parts = Object.fromEntries(
		new Intl.DateTimeFormat('en-GB', {
			timeZone: TIME_ZONE,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			hourCycle: 'h23'
		})
			.formatToParts(d)
			.map((p) => [p.type, p.value])
	);
	return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/** A datetime-local value, read as Salem time. Returns null for blank or malformed input. */
export function fromLocalInput(value: string) {
	if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
	const d = new Date(`${value}:00${IST_OFFSET}`);
	return Number.isNaN(d.getTime()) ? null : d;
}

export function slugify(text: string) {
	return (
		text
			.toLowerCase()
			.normalize('NFKD')
			.replace(/[̀-ͯ]/g, '')
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 60) || 'event'
	);
}

/** Blank-line separated paragraphs. */
export const paragraphs = (text: string | null) =>
	(text ?? '')
		.split(/\n\s*\n/)
		.map((p) => p.trim())
		.filter(Boolean);
