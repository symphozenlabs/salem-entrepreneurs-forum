import type { PageServerLoad } from './$types';
import { directory, directoryIndustries } from '#lib/server/network.ts';

export const load: PageServerLoad = async ({ locals, url }) => {
	const q = (url.searchParams.get('q') ?? '').trim().slice(0, 80);
	const industry = url.searchParams.get('industry') ?? '';
	const [members, industries] = await Promise.all([
		directory(locals.user!.id, q, industry),
		directoryIndustries()
	]);
	return { members, industries, q, industry };
};
