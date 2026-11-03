import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { db } from '#lib/server/db/index.ts';
import { event } from '#lib/server/db/schema.ts';
import { parseEventForm, saveCover, uniqueSlug } from '#lib/server/events.ts';
import { slugify } from '#lib/events.ts';

export const actions: Actions = {
	default: async ({ request }) => {
		const parsed = await parseEventForm(await request.formData());
		if (!parsed.ok) return fail(400, { errors: parsed.errors, values: parsed.values });

		const [row] = await db
			.insert(event)
			.values({ ...parsed.values, slug: await uniqueSlug(slugify(parsed.values.title)) })
			.returning({ id: event.id });
		await saveCover(row.id, parsed.cover);
		redirect(303, `/admin/events/${row.id}?created=1`);
	}
};
