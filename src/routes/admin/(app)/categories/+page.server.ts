import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	approveCategories,
	getCategories,
	moveCategory,
	pendingCategories
} from '#lib/server/categories.ts';
import { categories as builtIn } from '#lib/categories.ts';

export const load: PageServerLoad = async () => {
	const [list, pending] = await Promise.all([getCategories(), pendingCategories()]);
	const standard = new Set<string>(builtIn);
	return { list, pending, added: list.filter((c) => !standard.has(c)) };
};

export const actions: Actions = {
	approve: async ({ request }) => {
		const name = String((await request.formData()).get('name') ?? '');
		if (!(await pendingCategories()).some((p) => p.name === name))
			return fail(400, { error: 'That category is no longer waiting.' });
		await approveCategories([name]);
		return { done: `“${name}” is now on the category list.` };
	},

	approveAll: async () => {
		const pending = await pendingCategories();
		await approveCategories(pending.map((p) => p.name));
		return { done: `${pending.length} categories added to the list.` };
	},

	move: async ({ request }) => {
		const data = await request.formData();
		const name = String(data.get('name') ?? '');
		const to = String(data.get('to') ?? '');
		if (!(await getCategories()).includes(to)) return fail(400, { error: 'Choose a category.' });
		if (!(await pendingCategories()).some((p) => p.name === name))
			return fail(400, { error: 'That category is no longer waiting.' });
		await moveCategory(name, to);
		return { done: `Moved “${name}” to “${to}”.` };
	}
};
