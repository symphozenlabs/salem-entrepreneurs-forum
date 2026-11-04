import { fail } from '@sveltejs/kit';
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '#lib/server/db/index.ts';
import {
	event,
	eventRegistration,
	memberProfile,
	membershipApplication,
	payment,
	paymentProof,
	user
} from '#lib/server/db/schema.ts';
import {
	approveApplication,
	rejectApplication,
	rejectPayment,
	verifyRenewal
} from '#lib/server/members.ts';
import { confirmRegistration, rejectRegistration } from '#lib/server/registrations.ts';

const TABS = ['pending', 'verified', 'rejected'] as const;
type Tab = (typeof TABS)[number];

/** Event payments and membership payments (joining + renewal) are kept apart on the page. */
const KINDS = ['all', 'events', 'membership'] as const;
type Kind = (typeof KINDS)[number];
const isEvent = eq(payment.purpose, 'event');
const isMembership = sql`${payment.purpose} in ('joining', 'renewal')`;

// Every UPI payment in one place — joining fees, renewals and event registrations —
// so the admin can work down their bank statement by transaction ID.
const payer = sql<string>`coalesce(${user.name}, ${membershipApplication.name}, ${eventRegistration.name})`;

export const load: PageServerLoad = async ({ url }) => {
	const param = url.searchParams.get('show');
	const show: Tab = TABS.includes(param as Tab) ? (param as Tab) : 'pending';
	const kindParam = url.searchParams.get('type');
	const kind: Kind = KINDS.includes(kindParam as Kind) ? (kindParam as Kind) : 'all';
	const eventFilter = kind === 'events' ? Number(url.searchParams.get('event')) || null : null;
	const q = (url.searchParams.get('q') ?? '').trim().slice(0, 60);
	const term = q ? `%${q.replace(/[%_\\]/g, '\\$&')}%` : null;
	const payments = await db
		.select({
			id: payment.id,
			purpose: payment.purpose,
			amount: payment.amount,
			utr: payment.utr,
			status: payment.status,
			note: payment.note,
			createdAt: payment.createdAt,
			name: payer,
			phone: sql<
				string | null
			>`coalesce(${memberProfile.phone}, ${membershipApplication.phone}, ${eventRegistration.phone})`,
			memberNumber: memberProfile.memberNumber,
			expiresAt: memberProfile.expiresAt,
			applicationId: payment.applicationId,
			eventId: event.id,
			eventTitle: event.title,
			registrationCode: eventRegistration.code,
			hasProof: sql<boolean>`${paymentProof.paymentId} is not null`
		})
		.from(payment)
		.leftJoin(user, eq(user.id, payment.userId))
		.leftJoin(memberProfile, eq(memberProfile.userId, payment.userId))
		.leftJoin(membershipApplication, eq(membershipApplication.id, payment.applicationId))
		.leftJoin(eventRegistration, eq(eventRegistration.id, payment.registrationId))
		.leftJoin(event, eq(event.id, eventRegistration.eventId))
		.leftJoin(paymentProof, eq(paymentProof.paymentId, payment.id))
		.where(
			and(
				eq(payment.status, show),
				kind === 'events' ? isEvent : kind === 'membership' ? isMembership : undefined,
				eventFilter ? eq(event.id, eventFilter) : undefined,
				term ? or(ilike(payment.utr, term), ilike(payer, term)) : undefined
			)
		)
		.orderBy(show === 'pending' ? payment.createdAt : desc(payment.createdAt))
		.limit(300);
	const [[pending], events] = await Promise.all([
		// Waiting counts for the Events / Memberships switch.
		db
			.select({
				events: sql<number>`count(*) filter (where ${isEvent})::int`,
				membership: sql<number>`count(*) filter (where ${isMembership})::int`
			})
			.from(payment)
			.where(eq(payment.status, 'pending')),
		// Events that have payments, for the event filter.
		db
			.selectDistinct({ id: event.id, title: event.title, startsAt: event.startsAt })
			.from(payment)
			.innerJoin(eventRegistration, eq(eventRegistration.id, payment.registrationId))
			.innerJoin(event, eq(event.id, eventRegistration.eventId))
			.orderBy(desc(event.startsAt))
	]);
	return { payments, show, q, kind, eventFilter, pending, events };
};

/** What a payment is for, so a decision goes to the right place. */
async function target(paymentId: number) {
	const [p] = await db
		.select({
			purpose: payment.purpose,
			applicationId: payment.applicationId,
			registrationId: payment.registrationId
		})
		.from(payment)
		.where(eq(payment.id, paymentId));
	return p;
}

const read = async (request: Request) => {
	const data = await request.formData();
	return {
		id: Number(data.get('id')),
		note: String(data.get('note') ?? '')
			.trim()
			.slice(0, 500)
	};
};

export const actions: Actions = {
	verify: async ({ request, locals }) => {
		const { id } = await read(request);
		const p = await target(id);
		const admin = locals.user!.id;
		if (p?.purpose === 'joining' && p.applicationId) {
			const r = await approveApplication(p.applicationId, admin);
			if ('error' in r) return fail(400, { error: r.error });
			const [app] = await db
				.select({ phone: membershipApplication.phone })
				.from(membershipApplication)
				.where(eq(membershipApplication.id, p.applicationId));
			return {
				done: `${r.credentials.name} is now a member (${r.memberNumber}).`,
				credentials: { ...r.credentials, phone: app?.phone }
			};
		}
		if (p?.purpose === 'event' && p.registrationId) {
			const r = await confirmRegistration(p.registrationId, admin);
			if ('error' in r) return fail(400, { error: r.error });
			return { done: `${r.name}’s seat is confirmed${r.emailed ? ' and they were emailed' : ''}.` };
		}
		if (p?.purpose === 'renewal') {
			const r = await verifyRenewal(id, admin);
			if ('error' in r) return fail(400, { error: r.error });
			const until = r.expiresAt.toLocaleDateString('en-IN', {
				day: 'numeric',
				month: 'short',
				year: 'numeric',
				timeZone: 'Asia/Kolkata'
			});
			return { done: `Renewed until ${until}${r.emailed ? ' — the member was emailed' : ''}.` };
		}
		return fail(404, { error: 'That payment no longer exists.' });
	},

	reject: async ({ request, locals }) => {
		const { id, note } = await read(request);
		const p = await target(id);
		const admin = locals.user!.id;
		const r =
			p?.purpose === 'joining' && p.applicationId
				? await rejectApplication(p.applicationId, admin, note)
				: p?.purpose === 'event' && p.registrationId
					? await rejectRegistration(p.registrationId, admin, note)
					: p?.purpose === 'renewal'
						? await rejectPayment(id, admin, note)
						: { error: 'That payment no longer exists.' };
		if ('error' in r) return fail(400, { error: r.error });
		return {
			done: `Payment rejected${r.emailed ? ' and the payer was emailed' : ' — let the payer know yourself'}.`
		};
	}
};
