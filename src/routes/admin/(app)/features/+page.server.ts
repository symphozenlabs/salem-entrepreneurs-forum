import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getFeatures, setFeature } from '#lib/server/settings.ts';

export const load: PageServerLoad = async () => ({ features: await getFeatures() });

export const actions: Actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const feature = data.get('feature');
		if (feature !== 'connects' && feature !== 'transactions')
			return fail(400, { error: 'Choose a feature.' });
		await setFeature(feature, data.get('on') === 'true');
	}
};
