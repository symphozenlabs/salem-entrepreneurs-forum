import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '#lib/server/db/index.ts';
import { event, eventCover } from '#lib/server/db/schema.ts';
import { allEvents, uniqueSlug } from '#lib/server/events.ts';

export const load: PageServerLoad = async () => ({ events: await allEvents() });

const idOf = async (request: Request) => {
	const id = Number((await request.formData()).get('id'));
	return Number.isInteger(id) && id > 0 ? id : null;
};

export const actions: Actions = {
	publish: async ({ request }) => {
		const id = await idOf(request);
		if (!id) return fail(400);
		await db.update(event).set({ published: true }).where(eq(event.id, id));
	},
	unpublish: async ({ request }) => {
		const id = await idOf(request);
		if (!id) return fail(400);
		await db.update(event).set({ published: false }).where(eq(event.id, id));
	},
	/** Copies an event (and its cover) as a draft — handy for the monthly conclave. */
	duplicate: async ({ request }) => {
		const id = await idOf(request);
		if (!id) return fail(400);
		const [src] = await db.select().from(event).where(eq(event.id, id));
		if (!src) return fail(404);
		const { id: _id, slug, createdAt: _c, updatedAt: _u, ...rest } = src;
		const [copy] = await db
			.insert(event)
			.values({
				...rest,
				title: `${src.title} (copy)`,
				slug: await uniqueSlug(slug),
				published: false
			})
			.returning({ id: event.id });
		const [cover] = await db.select().from(eventCover).where(eq(eventCover.eventId, id));
		if (cover)
			await db.insert(eventCover).values({ ...cover, eventId: copy.id, updatedAt: new Date() });
		redirect(303, `/admin/events/${copy.id}?copied=1`);
	},
	delete: async ({ request }) => {
		const id = await idOf(request);
		if (!id) return fail(400);
		await db.delete(event).where(eq(event.id, id));
		return { deleted: true };
	}
};
