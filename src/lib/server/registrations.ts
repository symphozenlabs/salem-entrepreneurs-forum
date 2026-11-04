import { randomInt } from 'node:crypto';
import { and, asc, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import { atomically, db } from '#lib/server/db/index.ts';
import { event, eventRegistration, payment, paymentProof } from '#lib/server/db/schema.ts';
import { decisionEmail, sendEmail } from '#lib/server/email.ts';
import { utrInUse } from '#lib/server/members.ts';
import type { StoredImage } from '#lib/server/uploads.ts';
import { eventDate, eventTimeRange } from '#lib/events.ts';
import type { Answer } from '#lib/forms.ts';
import { rupees } from '#lib/content.ts';

/** One lock shared by every registration, so seat counts and UTR checks never race. */
const REGISTRATION_LOCK = 72_710_001;

/** Registrations holding a seat: waiting for payment checks, or confirmed. */
const holdsSeat = inArray(eventRegistration.status, ['pending', 'confirmed']);

export async function seatsTaken(eventId: number) {
	const [row] = await db
		.select({ n: sql<number>`count(*)::int` })
		.from(eventRegistration)
		.where(and(eq(eventRegistration.eventId, eventId), holdsSeat));
	return row.n;
}

/** Per-event counts for the admin's event list. */
export async function registrationCounts() {
	const rows = await db
		.select({
			eventId: eventRegistration.eventId,
			confirmed: sql<number>`count(*) filter (where ${eventRegistration.status} = 'confirmed')::int`,
			pending: sql<number>`count(*) filter (where ${eventRegistration.status} = 'pending')::int`
		})
		.from(eventRegistration)
		.groupBy(eventRegistration.eventId);
	return new Map(rows.map((r) => [r.eventId, r]));
}

export async function pendingRegistrationTotal() {
	const [row] = await db
		.select({ n: sql<number>`count(*)::int` })
		.from(eventRegistration)
		.where(eq(eventRegistration.status, 'pending'));
	return row.n;
}

const codeAlphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const newCode = () =>
	Array.from({ length: 6 }, () => codeAlphabet[randomInt(codeAlphabet.length)]).join('');

type EventForRegistration = {
	id: number;
	title: string;
	startsAt: Date;
	endsAt: Date | null;
	venue: string;
	seats: number | null;
};

const when = (e: EventForRegistration) =>
	`${eventDate(e.startsAt)}, ${eventTimeRange(e.startsAt, e.endsAt)}`;

/**
 * Records a registration. Free events are confirmed at once; paid ones wait for the
 * admin to match the UPI payment. Returns the registration's reference code.
 *
 * Saving happens in one transaction that first takes a lock every registration
 * shares, then inserts only if a seat is free, the email isn't already registered and
 * the UTR is unused — so two people can't take the last seat at the same moment, and a
 * registration is never saved without its payment.
 */
export async function register(
	ev: EventForRegistration,
	input: {
		name: string;
		email: string;
		phone: string;
		answers: Answer[];
		amount: number;
		userId: string | null;
		utr: string | null;
		proof: StoredImage | null;
	}
) {
	const free = input.amount === 0;
	const utr = free ? null : input.utr!;

	let saved: { id: number; code: string } | undefined;
	let code = '';
	for (let attempt = 0; attempt < 5 && !code; attempt++) {
		const candidate = newCode();
		try {
			const results = await atomically((d) => {
				const lock = d.execute(sql`select pg_advisory_xact_lock(${REGISTRATION_LOCK})`);
				// Inserts only while a seat is free, the email isn't registered and the UTR is unused.
				const insertRegistration = d.execute(sql`
					insert into ${eventRegistration}
						(event_id, code, name, email, phone, answers, amount, user_id, status, reviewed_at)
					select ${event.id}, ${candidate}, ${input.name}, ${input.email}, ${input.phone},
						${JSON.stringify(input.answers)}::jsonb, ${input.amount}::int, ${input.userId},
						${free ? 'confirmed' : 'pending'}, ${free ? sql`now()` : sql`null`}
					from ${event}
					where ${event.id} = ${ev.id}
						and (${event.seats} is null or (select count(*) from ${eventRegistration}
							where ${eventRegistration.eventId} = ${ev.id}
							and ${eventRegistration.status} in ('pending', 'confirmed')) < ${event.seats})
						and not exists (select 1 from ${eventRegistration}
							where ${eventRegistration.eventId} = ${ev.id} and ${eventRegistration.email} = ${input.email}
							and ${eventRegistration.status} <> 'rejected')
						${utr ? sql`and not exists (select 1 from ${payment} where ${payment.utr} = ${utr} and ${payment.status} <> 'rejected')` : sql``}
					returning id, code`);
				if (!utr) return [lock, insertRegistration];
				// Inserts nothing when the registration above was refused.
				const insertPayment = d.execute(sql`
					insert into ${payment} (registration_id, user_id, purpose, amount, utr)
					select id, user_id, 'event', amount, ${utr} from ${eventRegistration} where code = ${candidate}`);
				return [lock, insertRegistration, insertPayment];
			});
			// Raw results come back as rows (Neon batch) or as { rows } (PGlite).
			const res = results[1] as { rows?: unknown[] } | unknown[];
			saved = (Array.isArray(res) ? res : (res.rows ?? []))[0] as typeof saved;
			code = candidate;
		} catch (e) {
			if (attempt === 4) throw e; // a clash on the random code; try another
		}
	}

	if (!saved) {
		// Refused: say why. (Only for the message — the decision was made above.)
		const [dupe] = await db
			.select({ id: eventRegistration.id })
			.from(eventRegistration)
			.where(
				and(
					eq(eventRegistration.eventId, ev.id),
					eq(eventRegistration.email, input.email),
					ne(eventRegistration.status, 'rejected')
				)
			);
		if (dupe) return { error: 'This email is already registered for this event.' };
		if (utr && (await utrInUse(utr)))
			return {
				error: 'This transaction ID has already been used. Check it in your UPI app.',
				field: 'utr'
			};
		return { error: 'Sorry — the event just filled up.' };
	}

	if (utr && input.proof) {
		// The screenshot is optional: if saving it fails, the registration still stands.
		try {
			const [pay] = await db
				.select({ id: payment.id })
				.from(payment)
				.where(eq(payment.registrationId, saved.id));
			if (pay) await db.insert(paymentProof).values({ paymentId: pay.id, ...input.proof });
		} catch (e) {
			console.error('[register] payment screenshot not saved:', e);
		}
	}

	await sendEmail(
		decisionEmail({
			name: input.name,
			email: input.email,
			title: free ? `You're registered: ${ev.title}` : `Registration received: ${ev.title}`,
			message: free
				? `Your seat is confirmed.\n\n${ev.title}\n${when(ev)}\n${ev.venue}\n\nReference: ${code}`
				: `We've received your registration and payment of ${rupees(input.amount)} (UTR ${utr}). We'll confirm your seat once the payment is verified.\n\n${ev.title}\n${when(ev)}\n${ev.venue}\n\nReference: ${code}`
		})
	);
	return { code, confirmed: free };
}

/** Registrations for one event, with the payment details the admin checks. */
export async function registrationsFor(eventId: number, status?: string) {
	return db
		.select({
			id: eventRegistration.id,
			code: eventRegistration.code,
			name: eventRegistration.name,
			email: eventRegistration.email,
			phone: eventRegistration.phone,
			answers: eventRegistration.answers,
			amount: eventRegistration.amount,
			status: eventRegistration.status,
			note: eventRegistration.note,
			isMember: sql<boolean>`${eventRegistration.userId} is not null`,
			createdAt: eventRegistration.createdAt,
			paymentId: payment.id,
			utr: payment.utr,
			hasProof: sql<boolean>`${paymentProof.paymentId} is not null`
		})
		.from(eventRegistration)
		.leftJoin(payment, eq(payment.registrationId, eventRegistration.id))
		.leftJoin(paymentProof, eq(paymentProof.paymentId, payment.id))
		.where(
			and(
				eq(eventRegistration.eventId, eventId),
				status ? eq(eventRegistration.status, status) : undefined
			)
		)
		.orderBy(
			status === 'pending' ? asc(eventRegistration.createdAt) : desc(eventRegistration.createdAt)
		);
}

async function eventOf(registrationId: number) {
	const [row] = await db
		.select({
			id: event.id,
			title: event.title,
			startsAt: event.startsAt,
			endsAt: event.endsAt,
			venue: event.venue,
			seats: event.seats
		})
		.from(eventRegistration)
		.innerJoin(event, eq(event.id, eventRegistration.eventId))
		.where(eq(eventRegistration.id, registrationId));
	return row;
}

// Like membership reviews, each decision claims the registration while it's still
// pending, so a double-click can't send two emails or flip a decision.

export async function confirmRegistration(id: number, adminId: string) {
	const now = new Date();
	const [r] = await db
		.update(eventRegistration)
		.set({ status: 'confirmed', reviewedAt: now, reviewedBy: adminId })
		.where(and(eq(eventRegistration.id, id), eq(eventRegistration.status, 'pending')))
		.returning();
	if (!r) return { error: 'This registration was already reviewed, or no longer exists.' };
	await db
		.update(payment)
		.set({ status: 'verified', reviewedAt: now, reviewedBy: adminId })
		.where(eq(payment.registrationId, id));
	const ev = await eventOf(id);
	const emailed = await sendEmail(
		decisionEmail({
			name: r.name,
			email: r.email,
			title: `Seat confirmed: ${ev.title}`,
			message: `Your payment of ${rupees(r.amount)} is verified and your seat is confirmed.\n\n${ev.title}\n${when(ev)}\n${ev.venue}\n\nReference: ${r.code}`
		})
	);
	return { emailed, name: r.name };
}

export async function rejectRegistration(id: number, adminId: string, note: string) {
	const now = new Date();
	const [r] = await db
		.update(eventRegistration)
		.set({ status: 'rejected', note: note || null, reviewedAt: now, reviewedBy: adminId })
		.where(and(eq(eventRegistration.id, id), eq(eventRegistration.status, 'pending')))
		.returning();
	if (!r) return { error: 'This registration was already reviewed, or no longer exists.' };
	await db
		.update(payment)
		.set({ status: 'rejected', note: note || null, reviewedAt: now, reviewedBy: adminId })
		.where(eq(payment.registrationId, id));
	const ev = await eventOf(id);
	const emailed = await sendEmail(
		decisionEmail({
			name: r.name,
			email: r.email,
			title: `About your registration: ${ev.title}`,
			message: `We couldn't verify your payment, so your registration (reference ${r.code}) isn't confirmed.${note ? `\n\nReason: ${note}` : ''}\n\nIf you believe this is a mistake, reply to this email or call the secretariat with your UPI transaction ID.`
		})
	);
	return { emailed, name: r.name };
}

/** Lets the admin free a seat by cancelling a confirmed registration. */
export async function cancelRegistration(id: number, adminId: string) {
	const [r] = await db
		.update(eventRegistration)
		.set({
			status: 'rejected',
			note: 'Cancelled by the secretariat',
			reviewedAt: new Date(),
			reviewedBy: adminId
		})
		.where(and(eq(eventRegistration.id, id), eq(eventRegistration.status, 'confirmed')))
		.returning({ name: eventRegistration.name });
	return r ? { name: r.name } : { error: 'That registration isn’t confirmed.' };
}
