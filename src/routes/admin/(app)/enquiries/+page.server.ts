import { fail } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '#lib/server/db/index.ts';
import { contactMessage } from '#lib/server/db/schema.ts';

const FILTERS = ['open', 'handled', 'all'] as const;
type Filter = (typeof FILTERS)[number];

export const load: PageServerLoad = async ({ url }) => {
	const param = url.searchParams.get('show');
	const show: Filter = FILTERS.includes(param as Filter) ? (param as Filter) : 'open';
	const messages = await db
		.select()
		.from(contactMessage)
		.where(show === 'all' ? undefined : eq(contactMessage.handled, show === 'handled'))
		.orderBy(desc(contactMessage.createdAt))
		.limit(200);
	return { messages, show };
};

const idOf = async (request: Request) => {
	const id = Number((await request.formData()).get('id'));
	return Number.isInteger(id) && id > 0 ? id : null;
};

export const actions: Actions = {
	handled: async ({ request }) => {
		const id = await idOf(request);
		if (!id) return fail(400);
		await db.update(contactMessage).set({ handled: true }).where(eq(contactMessage.id, id));
	},
	reopen: async ({ request }) => {
		const id = await idOf(request);
		if (!id) return fail(400);
		await db.update(contactMessage).set({ handled: false }).where(eq(contactMessage.id, id));
	},
	delete: async ({ request }) => {
		const id = await idOf(request);
		if (!id) return fail(400);
		await db.delete(contactMessage).where(eq(contactMessage.id, id));
	}
};
