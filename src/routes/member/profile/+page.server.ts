import { fail } from '@sveltejs/kit';
import { and, eq, ne, sql } from 'drizzle-orm';
import type { Actions } from './$types';
import { db } from '#lib/server/db/index.ts';
import { memberPhoto, memberProfile, user } from '#lib/server/db/schema.ts';
import { readImage } from '#lib/server/uploads.ts';
import { isEmail, safeUrl } from '#lib/server/admin.ts';
import {
	industryFrom,
	instagramUrl,
	isPhoneLogin,
	phoneDigits,
	phoneLoginEmail
} from '#lib/membership.ts';

const FIELDS = [
	'name',
	'email',
	'phone',
	'business',
	'industry',
	'designation',
	'city',
	'website',
	'instagram',
	'about',
	'offerings',
	'lookingFor',
	'address',
	'mapUrl'
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
		const digits = phoneDigits(v.phone);
		if (!digits) errors.phone = 'Enter a 10-digit mobile number.';
		v.email = v.email.toLowerCase();
		if (v.email && (!isEmail(v.email) || isPhoneLogin(v.email)))
			errors.email = 'Enter a valid email, or leave it blank to sign in with your mobile number.';
		v.industry = industryFrom(data);
		const instagram = v.instagram ? instagramUrl(v.instagram) : null;
		if (v.instagram && !instagram)
			errors.instagram = 'Enter your Instagram handle or profile link.';
		// Email and mobile number both sign people in, so each can belong to only one account.
		const login = v.email || (digits ? phoneLoginEmail(digits) : '');
		if (login) {
			const [taken] = await db
				.select({ id: user.id })
				.from(user)
				.where(and(eq(user.email, login), ne(user.id, me)));
			if (taken)
				errors[v.email ? 'email' : 'phone'] = v.email
					? 'Another account already uses this email.'
					: 'Another account already signs in with this number.';
		}
		if (digits) {
			const [taken] = await db
				.select({ id: memberProfile.userId })
				.from(memberProfile)
				.where(
					and(
						ne(memberProfile.userId, me),
						sql`right(regexp_replace(${memberProfile.phone}, '[^0-9]', '', 'g'), 10) = ${digits}`
					)
				)
				.limit(1);
			if (taken) errors.phone = 'Another member already uses this mobile number.';
		}
		const website = safeUrl(v.website);
		const mapUrl = safeUrl(v.mapUrl);
		if (mapUrl === undefined) errors.mapUrl = 'Paste the full Google Maps link (https://…).';
		if (v.address.length > 300) errors.address = 'Keep the address under 300 characters.';
		if (website === undefined) errors.website = 'Enter a full link starting with https://';
		for (const k of ['about', 'offerings', 'lookingFor'] as const)
			if (v[k].length > 1500) errors[k] = 'Keep this under 1500 characters.';
		const upload = await readImage(data, 'photo', 3);
		if (upload && 'error' in upload) errors.photo = upload.error;
		const photo = upload && !('error' in upload) ? upload : null;
		if (Object.keys(errors).length) return fail(400, { errors, values: v });

		await db.update(user).set({ name: v.name, email: login }).where(eq(user.id, me));
		await db
			.update(memberProfile)
			.set({
				phone: v.phone,
				business: v.business,
				industry: v.industry,
				designation: v.designation || null,
				city: v.city || null,
				website: website ?? null,
				instagram,
				about: v.about || null,
				offerings: v.offerings || null,
				lookingFor: v.lookingFor || null,
				address: v.address || null,
				mapUrl: mapUrl ?? null,
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
