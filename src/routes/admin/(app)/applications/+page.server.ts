import { fail } from '@sveltejs/kit';
import { desc, eq, sql } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '#lib/server/db/index.ts';
import { membershipApplication, payment, paymentProof } from '#lib/server/db/schema.ts';
import { approveApplication, rejectApplication } from '#lib/server/members.ts';

const TABS = ['pending', 'approved', 'rejected'] as const;
type Tab = (typeof TABS)[number];

export const load: PageServerLoad = async ({ url }) => {
	const param = url.searchParams.get('show');
	const show: Tab = TABS.includes(param as Tab) ? (param as Tab) : 'pending';
	const applications = await db
		.select({
			app: membershipApplication,
			paymentId: payment.id,
			amount: payment.amount,
			utr: payment.utr,
			hasProof: sql<boolean>`${paymentProof.paymentId} is not null`
		})
		.from(membershipApplication)
		.leftJoin(payment, eq(payment.applicationId, membershipApplication.id))
		.leftJoin(paymentProof, eq(paymentProof.paymentId, payment.id))
		.where(eq(membershipApplication.status, show))
		.orderBy(
			show === 'pending' ? membershipApplication.createdAt : desc(membershipApplication.createdAt)
		)
		.limit(200);
	return { applications, show };
};

export const actions: Actions = {
	approve: async ({ request, locals }) => {
		const id = Number((await request.formData()).get('id'));
		const result = await approveApplication(id, locals.user!.id);
		if ('error' in result) return fail(400, { error: result.error });
		const [app] = await db
			.select({ phone: membershipApplication.phone })
			.from(membershipApplication)
			.where(eq(membershipApplication.id, id));
		return {
			approved: { ...result.credentials, phone: app?.phone, memberNumber: result.memberNumber }
		};
	},
	reject: async ({ request, locals }) => {
		const data = await request.formData();
		const note = String(data.get('note') ?? '')
			.trim()
			.slice(0, 500);
		const result = await rejectApplication(Number(data.get('id')), locals.user!.id, note);
		if ('error' in result) return fail(400, { error: result.error });
		return { rejected: { emailed: result.emailed } };
	}
};
