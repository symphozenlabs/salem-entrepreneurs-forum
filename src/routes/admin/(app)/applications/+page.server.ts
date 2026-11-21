import { fail } from '@sveltejs/kit';
import { and, desc, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { paginate } from '#lib/paging.ts';
import type { Actions, PageServerLoad } from './$types';
import { db } from '#lib/server/db/index.ts';
import {
	applicationPhoto,
	memberProfile,
	membershipApplication,
	payment,
	paymentProof,
	user
} from '#lib/server/db/schema.ts';
import { memberChoices } from '#lib/server/loyalty.ts';
import { approveApplication, rejectApplication } from '#lib/server/members.ts';

const TABS = ['pending', 'approved', 'rejected'] as const;
type Tab = (typeof TABS)[number];

const referrer = alias(user, 'referrer');
const referrerProfile = alias(memberProfile, 'referrer_profile');

export const load: PageServerLoad = async ({ url }) => {
	const param = url.searchParams.get('show');
	const show: Tab = TABS.includes(param as Tab) ? (param as Tab) : 'pending';
	const applications = await db
		.select({
			app: membershipApplication,
			paymentId: payment.id,
			amount: payment.amount,
			utr: payment.utr,
			hasProof: sql<boolean>`${paymentProof.paymentId} is not null`,
			hasPhoto: sql<boolean>`${applicationPhoto.applicationId} is not null`,
			/** The member picked as referrer, who earns introduction points on approval. */
			referrerName: referrer.name,
			referrerNumber: referrerProfile.memberNumber
		})
		.from(membershipApplication)
		.leftJoin(referrer, eq(referrer.id, membershipApplication.referredById))
		.leftJoin(referrerProfile, eq(referrerProfile.userId, membershipApplication.referredById))
		.leftJoin(payment, eq(payment.applicationId, membershipApplication.id))
		.leftJoin(paymentProof, eq(paymentProof.paymentId, payment.id))
		.leftJoin(applicationPhoto, eq(applicationPhoto.applicationId, membershipApplication.id))
		.where(eq(membershipApplication.status, show))
		.orderBy(
			show === 'pending' ? membershipApplication.createdAt : desc(membershipApplication.createdAt)
		)
		.limit(5000);
	const { items, pager } = paginate(applications, url, 20);
	// Members to choose from when setting a pending application's referrer.
	const members = show === 'pending' ? await memberChoices() : [];
	return { applications: items, pager, show, members };
};

export const actions: Actions = {
	approve: async ({ request, locals }) => {
		const id = Number((await request.formData()).get('id'));
		const result = await approveApplication(id, locals.user!.id);
		if ('error' in result) return fail(400, { error: result.error });
		const [app] = await db
			.select({ phone: membershipApplication.phone, userId: membershipApplication.userId })
			.from(membershipApplication)
			.where(eq(membershipApplication.id, id));
		return {
			approved: {
				...result.credentials,
				phone: app?.phone,
				memberNumber: result.memberNumber,
				memberId: app?.userId
			}
		};
	},
	referrer: async ({ request }) => {
		const data = await request.formData();
		const memberId = String(data.get('referredById') ?? '') || null;
		if (memberId) {
			const [m] = await db
				.select({ id: memberProfile.userId })
				.from(memberProfile)
				.where(eq(memberProfile.userId, memberId));
			if (!m) return fail(400, { error: 'That member no longer exists.' });
		}
		const updated = await db
			.update(membershipApplication)
			.set({ referredById: memberId })
			.where(
				and(
					eq(membershipApplication.id, Number(data.get('id'))),
					eq(membershipApplication.status, 'pending')
				)
			)
			.returning({ id: membershipApplication.id });
		if (!updated.length) return fail(400, { error: 'That application was already reviewed.' });
		return { referrerSaved: true };
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
