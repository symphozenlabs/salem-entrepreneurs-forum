import { fail } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '#lib/server/db/index.ts';
import { membershipApplication, payment, paymentProof, user } from '#lib/server/db/schema.ts';
import { getMembership, getPayment } from '#lib/server/settings.ts';
import { upiQrSvg } from '#lib/server/qr.ts';
import { utrInUse } from '#lib/server/members.ts';
import { readImage } from '#lib/server/uploads.ts';
import { isEmail, safeUrl } from '#lib/server/admin.ts';
import { cleanUtr, industryFrom, isUtr } from '#lib/membership.ts';

export const load: PageServerLoad = async () => {
	const [membership, paymentInfo] = await Promise.all([getMembership(), getPayment()]);
	const note = 'SEF membership';
	return {
		membership,
		payment: paymentInfo,
		note,
		qrSvg: await upiQrSvg(paymentInfo, membership.fee, note)
	};
};

const FIELDS = [
	'name',
	'email',
	'phone',
	'business',
	'industry',
	'designation',
	'city',
	'website',
	'about',
	'referredBy',
	'utr'
] as const;

export const actions: Actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const v = Object.fromEntries(
			FIELDS.map((k) => [k, String(data.get(k) ?? '').trim()])
		) as Record<(typeof FIELDS)[number], string>;
		v.email = v.email.toLowerCase();
		v.utr = cleanUtr(v.utr);
		const errors: Record<string, string> = {};

		// Bots fill every field, including this one that people never see.
		if (String(data.get('company_url') ?? '')) return { ok: true };

		if (!v.name) errors.name = 'Enter your full name.';
		if (!isEmail(v.email)) errors.email = 'Enter a valid email — your login is sent here.';
		if (v.phone.replace(/\D/g, '').length < 10) errors.phone = 'Enter a 10-digit mobile number.';
		if (!v.business) errors.business = 'Enter your business name.';
		v.industry = industryFrom(data);
		if (!v.industry)
			errors.industry =
				data.get('industry') === 'Other' ? 'Type your industry.' : 'Choose your industry.';
		if (v.about.length > 1000) errors.about = 'Keep this under 1000 characters.';
		const website = safeUrl(v.website);
		if (website === undefined) errors.website = 'Enter a full link, e.g. https://example.com';
		if (!isUtr(v.utr))
			errors.utr = 'Enter the UPI transaction ID (UTR) from your payment app — usually 12 digits.';
		if (data.get('consent') !== 'on') errors.consent = 'Please confirm the details are correct.';

		const upload = await readImage(data, 'proof', 4);
		if (upload && 'error' in upload) errors.proof = upload.error;
		const proof = upload && !('error' in upload) ? upload : null;

		if (Object.keys(errors).length) return fail(400, { errors, values: v });

		try {
			const [[member], [pending], usedUtr] = await Promise.all([
				db.select({ id: user.id }).from(user).where(eq(user.email, v.email)),
				db
					.select({ id: membershipApplication.id })
					.from(membershipApplication)
					.where(
						and(
							eq(membershipApplication.email, v.email),
							eq(membershipApplication.status, 'pending')
						)
					),
				utrInUse(v.utr)
			]);
			if (member)
				return fail(400, {
					values: v,
					errors: { email: 'This email already has a member account — sign in instead.' }
				});
			if (pending)
				return fail(400, {
					values: v,
					errors: { email: 'We already have an application from this email; it’s being reviewed.' }
				});
			if (usedUtr)
				return fail(400, {
					values: v,
					errors: {
						utr: 'This transaction ID has already been submitted. Check it in your UPI app.'
					}
				});

			const { fee } = await getMembership();
			const [app] = await db
				.insert(membershipApplication)
				.values({
					name: v.name,
					email: v.email,
					phone: v.phone,
					business: v.business,
					industry: v.industry,
					designation: v.designation || null,
					city: v.city || null,
					website: website ?? null,
					about: v.about || null,
					referredBy: v.referredBy || null
				})
				.returning({ id: membershipApplication.id });
			const [pay] = await db
				.insert(payment)
				.values({ applicationId: app.id, purpose: 'joining', amount: fee, utr: v.utr })
				.returning({ id: payment.id });
			if (proof) await db.insert(paymentProof).values({ paymentId: pay.id, ...proof });
		} catch (e) {
			console.error('[join] application failed:', e);
			return fail(500, {
				values: v,
				errors: {
					form: 'We couldn’t submit that just now. Please try again, or WhatsApp the secretariat.'
				}
			});
		}
		return { ok: true, email: v.email };
	}
};
