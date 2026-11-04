import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { Actions } from './$types';
import { db } from '#lib/server/db/index.ts';
import { memberPhoto, memberProfile, user } from '#lib/server/db/schema.ts';
import { readImage } from '#lib/server/uploads.ts';
import { safeUrl } from '#lib/server/admin.ts';
import { industryFrom } from '#lib/membership.ts';

const FIELDS = [
	'name',
	'phone',
	'business',
	'industry',
	'designation',
	'city',
	'website',
	'about',
	'offerings',
	'lookingFor'
] as const;

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const me = locals.user!.id;
		const data = await request.formData();
		const v = Object.fromEntries(
			FIELDS.map((k) => [k, String(data.get(k) ?? '').trim()])
		) as Record<(typeof FIELDS)[number], string>;
		const errors: Record<string, string> = {};
		if (!v.name) errors.name = 'Enter your name.';
		if (v.phone.replace(/\D/g, '').length < 10) errors.phone = 'Enter a 10-digit mobile number.';
		if (!v.business) errors.business = 'Enter your business name.';
		v.industry = industryFrom(data);
		if (!v.industry)
			errors.industry =
				data.get('industry') === 'Other' ? 'Type your industry.' : 'Choose your industry.';
		const website = safeUrl(v.website);
		if (website === undefined) errors.website = 'Enter a full link starting with https://';
		for (const k of ['about', 'offerings', 'lookingFor'] as const)
			if (v[k].length > 1500) errors[k] = 'Keep this under 1500 characters.';
		const upload = await readImage(data, 'photo', 3);
		if (upload && 'error' in upload) errors.photo = upload.error;
		const photo = upload && !('error' in upload) ? upload : null;
		if (Object.keys(errors).length) return fail(400, { errors, values: v });

		await db.update(user).set({ name: v.name }).where(eq(user.id, me));
		await db
			.update(memberProfile)
			.set({
				phone: v.phone,
				business: v.business,
				industry: v.industry,
				designation: v.designation || null,
				city: v.city || null,
				website: website ?? null,
				about: v.about || null,
				offerings: v.offerings || null,
				lookingFor: v.lookingFor || null,
				showInDirectory: data.get('showInDirectory') === 'on'
			})
			.where(eq(memberProfile.userId, me));

		if (photo) {
			const row = { userId: me, ...photo, updatedAt: new Date() };
			await db
				.insert(memberPhoto)
				.values(row)
				.onConflictDoUpdate({
					target: memberPhoto.userId,
					set: { mime: row.mime, data: row.data, updatedAt: row.updatedAt }
				});
		} else if (data.get('removePhoto') === 'on') {
			await db.delete(memberPhoto).where(eq(memberPhoto.userId, me));
		}
		return { saved: true };
	}
};
