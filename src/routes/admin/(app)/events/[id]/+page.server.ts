import { error, fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '#lib/server/db/index.ts';
import { event } from '#lib/server/db/schema.ts';
import { eventById, parseEventForm, saveCover } from '#lib/server/events.ts';
import { toLocalInput } from '#lib/events.ts';

const idOf = (param: string) => {
	const id = Number(param);
	if (!Number.isInteger(id) || id < 1) error(404, 'No such event.');
	return id;
};

export const load: PageServerLoad = async ({ params }) => {
	const e = await eventById(idOf(params.id));
	if (!e) error(404, 'No such event.');

	// The form works on strings, the same shape it gets back after a failed save.
	const values: Record<string, string> = {
		title: e.title,
		category: e.category,
		summary: e.summary,
		description: e.description ?? '',
		startsAt: toLocalInput(e.startsAt),
		endsAt: toLocalInput(e.endsAt),
		venue: e.venue,
		address: e.address ?? '',
		mapUrl: e.mapUrl ?? '',
		price: e.price ?? '',
		seats: e.seats?.toString() ?? '',
		registrationUrl: e.registrationUrl ?? '',
		registration: e.registration,
		fee: String(e.fee),
		memberFee: e.memberFee?.toString() ?? '',
		registrationClosesAt: toLocalInput(e.registrationClosesAt),
		formFields: JSON.stringify(e.formFields ?? []),
		published: e.published ? 'on' : ''
	};
	return { event: e, values };
};

export const actions: Actions = {
	default: async ({ request, params }) => {
		const id = idOf(params.id);
		const parsed = await parseEventForm(await request.formData());
		if (!parsed.ok) return fail(400, { errors: parsed.errors, values: parsed.values });

		const updated = await db
			.update(event)
			.set(parsed.values)
			.where(eq(event.id, id))
			.returning({ id: event.id });
		if (!updated.length) error(404, 'No such event.');
		await saveCover(id, parsed.cover);
		return { saved: true };
	}
};
