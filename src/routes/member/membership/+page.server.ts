import { fail } from '@sveltejs/kit';
import { and, desc, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '#lib/server/db/index.ts';
import { payment, paymentProof } from '#lib/server/db/schema.ts';
import { getMembership, getPayment } from '#lib/server/settings.ts';
import { upiQrSvg } from '#lib/server/qr.ts';
import { utrInUse } from '#lib/server/members.ts';
import { readImage } from '#lib/server/uploads.ts';
import { cleanUtr, isUtr } from '#lib/membership.ts';

const myPayments = (userId: string) =>
	db
		.select({
			id: payment.id,
			purpose: payment.purpose,
			amount: payment.amount,
			utr: payment.utr,
			status: payment.status,
			note: payment.note,
			createdAt: payment.createdAt
		})
		.from(payment)
		.where(eq(payment.userId, userId))
		.orderBy(desc(payment.createdAt));

export const load: PageServerLoad = async ({ locals, parent }) => {
	const [membership, paymentInfo, payments] = await Promise.all([
		getMembership(),
		getPayment(),
		myPayments(locals.user!.id)
	]);
	const note = `SEF membership renewal ${(await parent()).me.memberNumber}`;
	return {
		membership,
		payment: paymentInfo,
		payments,
		note,
		qrSvg: await upiQrSvg(paymentInfo, membership.fee, note)
	};
};

export const actions: Actions = {
	renew: async ({ request, locals }) => {
		const me = locals.user!.id;
		const data = await request.formData();
		const utr = cleanUtr(String(data.get('utr') ?? ''));
		if (!isUtr(utr))
			return fail(400, { utr, error: 'Enter the UPI transaction ID (UTR) — usually 12 digits.' });
		const proof = await readImage(data, 'proof', 4);
		if (proof && 'error' in proof) return fail(400, { utr, error: proof.error });

		const [pending] = await db
			.select({ id: payment.id })
			.from(payment)
			.where(
				and(eq(payment.userId, me), eq(payment.purpose, 'renewal'), eq(payment.status, 'pending'))
			);
		if (pending)
			return fail(400, { utr, error: 'You already have a renewal waiting for verification.' });
		if (await utrInUse(utr))
			return fail(400, { utr, error: 'This transaction ID has already been submitted.' });

		const { fee } = await getMembership();
		const [row] = await db
			.insert(payment)
			.values({ userId: me, purpose: 'renewal', amount: fee, utr })
			.returning({ id: payment.id });
		if (proof) await db.insert(paymentProof).values({ paymentId: row.id, ...proof });
		return { ok: true };
	}
};
