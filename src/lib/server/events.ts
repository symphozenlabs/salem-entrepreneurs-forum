import { and, asc, desc, eq, gte, lt, sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { event, eventCover } from '#lib/server/db/schema.ts';
import { categories, fromLocalInput, registrationModes, type PublicEvent } from '#lib/events.ts';
import { cleanFields } from '#lib/forms.ts';
import { readImage } from '#lib/server/uploads.ts';

const endOf = sql`coalesce(${event.endsAt}, ${event.startsAt})`;

/** Event columns plus a cache-busting cover version (null when there's no cover). */
const columns = {
	id: event.id,
	slug: event.slug,
	title: event.title,
	category: event.category,
	summary: event.summary,
	description: event.description,
	startsAt: event.startsAt,
	endsAt: event.endsAt,
	venue: event.venue,
	address: event.address,
	mapUrl: event.mapUrl,
	price: event.price,
	seats: event.seats,
	registrationUrl: event.registrationUrl,
	registration: event.registration,
	fee: event.fee,
	memberFee: event.memberFee,
	registrationClosesAt: event.registrationClosesAt,
	coverVersion: sql<number | null>`floor(extract(epoch from ${eventCover.updatedAt}))::int`
};

const withCover = () =>
	db.select(columns).from(event).leftJoin(eventCover, eq(eventCover.eventId, event.id));

export async function upcomingEvents(limit = 50): Promise<PublicEvent[]> {
	return withCover()
		.where(and(eq(event.published, true), gte(endOf, new Date())))
		.orderBy(asc(event.startsAt))
		.limit(limit);
}

export async function pastEvents(limit = 50): Promise<PublicEvent[]> {
	return withCover()
		.where(and(eq(event.published, true), lt(endOf, new Date())))
		.orderBy(desc(event.startsAt))
		.limit(limit);
}

/** A published event by slug; `drafts` also finds unpublished ones (admin preview). */
export async function eventBySlug(slug: string, drafts = false) {
	const [row] = await db
		.select({ ...columns, published: event.published, formFields: event.formFields })
		.from(event)
		.leftJoin(eventCover, eq(eventCover.eventId, event.id))
		.where(drafts ? eq(event.slug, slug) : and(eq(event.published, true), eq(event.slug, slug)));
	return row;
}

/** Every event, newest first, for the admin. */
export async function allEvents() {
	return db
		.select({ ...columns, published: event.published, updatedAt: event.updatedAt })
		.from(event)
		.leftJoin(eventCover, eq(eventCover.eventId, event.id))
		.orderBy(desc(event.startsAt));
}

export async function eventById(id: number) {
	const [row] = await db
		.select({ ...columns, published: event.published, formFields: event.formFields })
		.from(event)
		.leftJoin(eventCover, eq(eventCover.eventId, event.id))
		.where(eq(event.id, id));
	return row;
}

/** A slug that no other event uses yet: "monthly-conclave", "monthly-conclave-2", … */
export async function uniqueSlug(base: string) {
	const taken = new Set(
		(
			await db
				.select({ slug: event.slug })
				.from(event)
				.where(sql`${event.slug} = ${base} or ${event.slug} like ${base + '-%'}`)
		).map((r) => r.slug)
	);
	if (!taken.has(base)) return base;
	for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
}

// ---- Admin form ------------------------------------------------------------

const str = (data: FormData, key: string) => String(data.get(key) ?? '').trim();
const optional = (data: FormData, key: string) => str(data, key) || null;

function url(value: string | null) {
	if (!value) return null;
	try {
		const u = new URL(value);
		return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : undefined;
	} catch {
		return undefined;
	}
}

export type EventInput = Omit<typeof event.$inferInsert, 'id' | 'slug' | 'createdAt' | 'updatedAt'>;
export type CoverChange = { mime: string; data: string } | 'remove' | null;

/**
 * Reads and validates the admin event form. On failure returns the field errors and
 * the raw values so the form can be shown again without losing what was typed.
 */
export async function parseEventForm(data: FormData) {
	const errors: Record<string, string> = {};
	const raw = Object.fromEntries(
		[...data.entries()].filter(([, v]) => typeof v === 'string') as [string, string][]
	);

	const title = str(data, 'title');
	// "Other" saves what the admin typed instead, e.g. "Member meetup".
	const picked = str(data, 'category');
	const category = picked === 'Other' ? str(data, 'categoryOther').slice(0, 40) : picked;
	const summary = str(data, 'summary');
	const venue = str(data, 'venue');
	const startsAt = fromLocalInput(str(data, 'startsAt'));
	const endsAtRaw = str(data, 'endsAt');
	const endsAt = endsAtRaw ? fromLocalInput(endsAtRaw) : null;
	const seatsRaw = str(data, 'seats');
	const seats = seatsRaw ? Number(seatsRaw) : null;
	const mapUrl = url(optional(data, 'mapUrl'));
	const registrationUrl = url(optional(data, 'registrationUrl'));

	if (!title) errors.title = 'Give the event a title.';
	else if (title.length > 120) errors.title = 'Keep the title under 120 characters.';
	if (picked === 'Other' && !category) errors.category = 'Say what kind of event this is.';
	else if (picked !== 'Other' && !(categories as readonly string[]).includes(category))
		errors.category = 'Choose a category.';
	if (!summary) errors.summary = 'Add a one-line summary for the event cards.';
	else if (summary.length > 240) errors.summary = 'Keep the summary under 240 characters.';
	if (!venue) errors.venue = 'Where is it happening?';
	if (!startsAt) errors.startsAt = 'Pick the start date and time.';
	if (endsAtRaw && !endsAt) errors.endsAt = 'That end time isn’t valid.';
	else if (startsAt && endsAt && endsAt <= startsAt)
		errors.endsAt = 'The end must be after the start.';
	if (seats !== null && (!Number.isInteger(seats) || seats < 1 || seats > 100000))
		errors.seats = 'Seats must be a whole number.';
	if (mapUrl === undefined) errors.mapUrl = 'Paste a full link starting with https://';
	if (registrationUrl === undefined)
		errors.registrationUrl = 'Paste a full link starting with https://';

	// Registration: how people sign up, and for our own form its fee, deadline and questions.
	const registration = str(data, 'registration') || 'whatsapp';
	const money = (key: string) => {
		const v = str(data, key).replace(/[₹,\s]/g, '');
		return v === '' ? null : Number(v);
	};
	const fee = money('fee') ?? 0;
	const memberFee = money('memberFee');
	const closesRaw = str(data, 'registrationClosesAt');
	const registrationClosesAt = closesRaw ? fromLocalInput(closesRaw) : null;
	let formFields: ReturnType<typeof cleanFields>['fields'] = [];
	if (!(registration in registrationModes)) errors.registration = 'Choose how people register.';
	if (registration === 'link' && !registrationUrl)
		errors.registrationUrl = 'Paste the registration link, or choose another way to register.';
	if (registration === 'form') {
		if (!Number.isInteger(fee) || fee < 0 || fee > 10_000_000)
			errors.fee = 'Enter the fee in whole rupees (0 for free).';
		if (memberFee !== null && (!Number.isInteger(memberFee) || memberFee < 0 || memberFee > fee))
			errors.memberFee = 'The member fee must be a whole number, no more than the fee.';
		if (closesRaw && !registrationClosesAt) errors.registrationClosesAt = 'That date isn’t valid.';
		let parsed: unknown = [];
		try {
			parsed = JSON.parse(str(data, 'formFields') || '[]');
		} catch {
			errors.formFields = 'The form couldn’t be read. Please try again.';
		}
		const cleaned = cleanFields(parsed);
		if (cleaned.error) errors.formFields = cleaned.error;
		formFields = cleaned.fields;
	}

	let cover: CoverChange = null;
	const image = await readImage(data, 'cover');
	if (image && 'error' in image) errors.cover = image.error;
	else if (image) cover = image;
	else if (data.get('removeCover') === 'on') {
		cover = 'remove';
	}

	if (Object.keys(errors).length) return { ok: false as const, errors, values: raw };

	const values: EventInput = {
		title,
		category,
		summary,
		description: optional(data, 'description'),
		startsAt: startsAt!,
		endsAt,
		venue,
		address: optional(data, 'address'),
		mapUrl: mapUrl ?? null,
		price: optional(data, 'price'),
		seats,
		registrationUrl: registration === 'link' ? (registrationUrl ?? null) : null,
		registration,
		fee: registration === 'form' ? fee : 0,
		memberFee: registration === 'form' ? memberFee : null,
		registrationClosesAt: registration === 'form' ? registrationClosesAt : null,
		formFields,
		published: data.get('published') === 'on'
	};
	return { ok: true as const, values, cover };
}

export async function saveCover(eventId: number, cover: CoverChange) {
	if (!cover) return;
	if (cover === 'remove') {
		await db.delete(eventCover).where(eq(eventCover.eventId, eventId));
		return;
	}
	const row = { eventId, ...cover, updatedAt: new Date() };
	await db
		.insert(eventCover)
		.values(row)
		.onConflictDoUpdate({
			target: eventCover.eventId,
			set: { mime: row.mime, data: row.data, updatedAt: row.updatedAt }
		});
}

/** How many published events are still to come (the dashboard figure). */
export async function upcomingCount() {
	const [row] = await db
		.select({ n: sql<number>`count(*)::int` })
		.from(event)
		.where(and(eq(event.published, true), gte(endOf, new Date())));
	return row.n;
}
