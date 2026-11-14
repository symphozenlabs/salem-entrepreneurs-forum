import { and, asc, desc, eq, gt, gte, ilike, lt, lte, ne, or, sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import {
	businessTransaction,
	connect,
	memberPhoto,
	memberProfile,
	user
} from '#lib/server/db/schema.ts';
import { alias } from 'drizzle-orm/pg-core';
import {
	AUTO_CONFIRM_DAYS,
	connectKinds,
	connectStatuses,
	transactionKinds,
	type MemberOption
} from '#lib/network.ts';

const photoVersion = sql<number | null>`floor(extract(epoch from ${memberPhoto.updatedAt}))::int`;

const profile = {
	id: user.id,
	name: user.name,
	email: user.email,
	phone: memberProfile.phone,
	memberNumber: memberProfile.memberNumber,
	business: memberProfile.business,
	industry: memberProfile.industry,
	designation: memberProfile.designation,
	city: memberProfile.city,
	website: memberProfile.website,
	about: memberProfile.about,
	offerings: memberProfile.offerings,
	lookingFor: memberProfile.lookingFor,
	hub: memberProfile.hub,
	address: memberProfile.address,
	mapUrl: memberProfile.mapUrl,
	photoVersion
};

export type DirectoryMember = {
	id: string;
	name: string;
	email: string;
	phone: string;
	memberNumber: string;
	business: string;
	industry: string;
	designation: string | null;
	city: string | null;
	website: string | null;
	about: string | null;
	offerings: string | null;
	lookingFor: string | null;
	hub: string;
	address: string | null;
	mapUrl: string | null;
	photoVersion: number | null;
};

/** Active members who chose to be listed. */
const listed = () =>
	and(eq(memberProfile.showInDirectory, true), gt(memberProfile.expiresAt, new Date()));

const members = () =>
	db
		.select(profile)
		.from(memberProfile)
		.innerJoin(user, eq(user.id, memberProfile.userId))
		.leftJoin(memberPhoto, eq(memberPhoto.userId, memberProfile.userId));

/** The signed-in member's own account and profile. */
export async function getMe(userId: string) {
	const [me] = await db
		.select({
			...profile,
			showInDirectory: memberProfile.showInDirectory,
			joinedAt: memberProfile.joinedAt,
			expiresAt: memberProfile.expiresAt
		})
		.from(memberProfile)
		.innerJoin(user, eq(user.id, memberProfile.userId))
		.leftJoin(memberPhoto, eq(memberPhoto.userId, memberProfile.userId))
		.where(eq(memberProfile.userId, userId));
	return me;
}

const escapeLike = (q: string) => `%${q.replace(/[%_\\]/g, '\\$&')}%`;

/** One page of the directory, plus how many members match in all. */
export async function directory(
	me: string,
	filters: { q: string; industry: string; hub: string },
	page: { limit: number; offset: number }
): Promise<{ members: DirectoryMember[]; total: number }> {
	const term = filters.q ? escapeLike(filters.q) : null;
	const where = and(
		listed(),
		ne(memberProfile.userId, me),
		filters.industry ? eq(memberProfile.industry, filters.industry) : undefined,
		filters.hub ? eq(memberProfile.hub, filters.hub) : undefined,
		term
			? or(
					ilike(user.name, term),
					ilike(memberProfile.business, term),
					ilike(memberProfile.industry, term),
					ilike(memberProfile.offerings, term),
					ilike(memberProfile.lookingFor, term),
					ilike(memberProfile.city, term)
				)
			: undefined
	);
	const [rows, [count]] = await Promise.all([
		members()
			.where(where)
			.orderBy(asc(user.name), asc(user.id))
			.limit(page.limit)
			.offset(page.offset),
		db
			.select({ n: sql<number>`count(*)::int` })
			.from(memberProfile)
			.innerJoin(user, eq(user.id, memberProfile.userId))
			.where(where)
	]);
	return { members: rows, total: count.n };
}

/** Headline numbers for the directory: listed members, per hub, and the categories in use. */
export async function directoryStats() {
	const rows = await db
		.select({
			hub: memberProfile.hub,
			industry: memberProfile.industry,
			n: sql<number>`count(*)::int`
		})
		.from(memberProfile)
		.where(listed())
		.groupBy(memberProfile.hub, memberProfile.industry);
	const hubs = new Map<string, number>();
	const industries = new Set<string>();
	let total = 0;
	for (const r of rows) {
		total += r.n;
		hubs.set(r.hub, (hubs.get(r.hub) ?? 0) + r.n);
		industries.add(r.industry);
	}
	return {
		total,
		hubs: [...hubs].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
		industries: [...industries].sort((a, b) => a.localeCompare(b))
	};
}

export async function memberById(id: string): Promise<DirectoryMember | undefined> {
	const [m] = await members().where(and(eq(memberProfile.userId, id), listed()));
	return m;
}

/** Every other active member, for the searchable pickers. */
export async function memberOptions(me: string): Promise<MemberOption[]> {
	return db
		.select({
			id: user.id,
			name: user.name,
			business: memberProfile.business,
			industry: memberProfile.industry,
			hub: memberProfile.hub
		})
		.from(memberProfile)
		.innerJoin(user, eq(user.id, memberProfile.userId))
		.where(and(gt(memberProfile.expiresAt, new Date()), ne(memberProfile.userId, me)))
		.orderBy(asc(user.name));
}

async function isActiveMember(id: string) {
	const [m] = await db
		.select({ id: memberProfile.userId })
		.from(memberProfile)
		.where(and(eq(memberProfile.userId, id), gt(memberProfile.expiresAt, new Date())));
	return !!m;
}

// ---- Connects -----------------------------------------------------------------

const other = alias(user, 'other');
const otherProfile = alias(memberProfile, 'other_profile');

export type DateRange = { from: Date | null; to: Date | null };

const inRange = (
	col: typeof connect.createdAt | typeof businessTransaction.createdAt,
	r: DateRange
) => and(r.from ? gte(col, r.from) : undefined, r.to ? lte(col, r.to) : undefined);

export async function giveConnect(
	me: string,
	input: {
		toId: string;
		kind: string;
		contactName: string;
		contactPhone: string;
		value: number | null;
		notes: string;
	}
) {
	if (input.toId === me) return { error: 'Choose another member.' };
	if (!(input.kind in connectKinds)) return { error: 'Choose who the connect is for.' };
	if (
		input.kind === 'referral' &&
		(!input.contactName || input.contactPhone.replace(/\D/g, '').length < 10)
	)
		return { error: 'For a referral, add the person’s name and a 10-digit phone number.' };
	if (
		input.value !== null &&
		(!Number.isInteger(input.value) || input.value < 1 || input.value > 1_000_000_000)
	)
		return { error: 'Enter the value in whole rupees, or leave it empty.' };
	if (!(await isActiveMember(input.toId))) return { error: 'That member isn’t active.' };
	const row = {
		fromId: me,
		toId: input.toId,
		kind: input.kind,
		contactName: input.kind === 'referral' ? input.contactName : null,
		contactPhone: input.kind === 'referral' ? input.contactPhone : null,
		value: input.value,
		notes: input.notes || null
	};
	if (input.value === null) {
		await db.insert(connect).values(row);
		return { ok: true };
	}
	// With a value, the business is recorded straight away (one statement, so both or
	// neither are saved) and waits for the receiving member to approve it.
	await db.execute(sql`
		with c as (
			insert into ${connect} (from_id, to_id, kind, contact_name, contact_phone, value, notes)
			values (${row.fromId}, ${row.toId}, ${row.kind}, ${row.contactName}, ${row.contactPhone},
				${row.value}, ${row.notes})
			returning id
		)
		insert into ${businessTransaction}
			(receiver_id, giver_id, recorded_by_id, kind, amount, description, connect_id)
		select ${row.toId}, ${me}, ${me}, ${row.kind === 'referral' ? 'referral' : 'direct'},
			${row.value}, ${row.notes}, id
		from c`);
	return { ok: true };
}

/** Connects I gave and received, newest first, with the other member's name and phone. */
export async function myConnects(me: string, range: DateRange) {
	const rows = await db
		.select({
			id: connect.id,
			fromId: connect.fromId,
			kind: connect.kind,
			contactName: connect.contactName,
			contactPhone: connect.contactPhone,
			value: connect.value,
			notes: connect.notes,
			status: connect.status,
			createdAt: connect.createdAt,
			otherId: other.id,
			otherName: other.name,
			otherPhone: otherProfile.phone,
			otherBusiness: otherProfile.business,
			// The business recorded from this connect, if any (latest one).
			txnId: sql<
				number | null
			>`(select id from ${businessTransaction} where ${businessTransaction.connectId} = ${connect.id} order by id desc limit 1)`,
			txnAmount: sql<
				number | null
			>`(select amount from ${businessTransaction} where ${businessTransaction.connectId} = ${connect.id} order by id desc limit 1)`,
			txnStatus: sql<
				string | null
			>`(select status from ${businessTransaction} where ${businessTransaction.connectId} = ${connect.id} order by id desc limit 1)`,
			// Who recorded it decides who approves it.
			txnRecordedBy: sql<
				string | null
			>`(select recorded_by_id from ${businessTransaction} where ${businessTransaction.connectId} = ${connect.id} order by id desc limit 1)`
		})
		.from(connect)
		.innerJoin(
			other,
			sql`${other.id} = case when ${connect.fromId} = ${me} then ${connect.toId} else ${connect.fromId} end`
		)
		.leftJoin(otherProfile, eq(otherProfile.userId, other.id))
		.where(and(or(eq(connect.fromId, me), eq(connect.toId, me)), inRange(connect.createdAt, range)))
		.orderBy(desc(connect.createdAt))
		.limit(5000);
	const withTurn = rows.map((r) => ({
		...r,
		/** The linked business is waiting for me (the other member recorded it). */
		txnAwaitsMe: r.txnStatus === 'pending' && !!r.txnRecordedBy && r.txnRecordedBy !== me
	}));
	return {
		received: withTurn.filter((r) => r.fromId !== me),
		given: withTurn.filter((r) => r.fromId === me)
	};
}

/**
 * The member who received a connect marks it "Business done" with the value of the
 * business. That records a transaction automatically, waiting for the member who gave
 * the connect to approve it (it approves itself after AUTO_CONFIRM_DAYS).
 */
export async function closeConnect(me: string, id: number, amount: number, description: string) {
	if (!Number.isInteger(amount) || amount < 1 || amount > 1_000_000_000)
		return { error: 'Enter the business value in whole rupees.' };
	const [c] = await db
		.select({ id: connect.id, fromId: connect.fromId, kind: connect.kind })
		.from(connect)
		.where(and(eq(connect.id, id), eq(connect.toId, me)));
	if (!c) return { error: 'That connect no longer exists.' };
	// One live record per connect: a declined one can be replaced with a corrected value.
	const inserted = await db.execute(sql`
		insert into ${businessTransaction}
			(receiver_id, giver_id, recorded_by_id, kind, amount, description, connect_id)
		select ${me}, ${c.fromId}, ${me}, ${c.kind === 'referral' ? 'referral' : 'direct'},
			${amount}::int, ${description || null}, ${c.id}
		where not exists (select 1 from ${businessTransaction}
			where ${businessTransaction.connectId} = ${c.id} and ${businessTransaction.status} <> 'declined')
		returning id`);
	const rows = Array.isArray(inserted) ? inserted : ((inserted as { rows?: unknown[] }).rows ?? []);
	if (!rows.length) return { error: 'Business from this connect is already recorded.' };
	await db.update(connect).set({ status: 'converted' }).where(eq(connect.id, c.id));
	return { ok: true };
}

/** Only the member who received a connect tracks how it went. */
export async function setConnectStatus(me: string, id: number, status: string) {
	if (!(status in connectStatuses)) return { error: 'Unknown status.' };
	const updated = await db
		.update(connect)
		.set({ status })
		.where(and(eq(connect.id, id), eq(connect.toId, me)))
		.returning({ id: connect.id });
	return updated.length ? { ok: true } : { error: 'That connect no longer exists.' };
}

// ---- Business transactions ------------------------------------------------------

/** Confirms anything left unanswered for AUTO_CONFIRM_DAYS. Runs whenever records are read. */
export async function autoConfirmTransactions() {
	const cutoff = new Date(Date.now() - AUTO_CONFIRM_DAYS * 86_400_000);
	await db
		.update(businessTransaction)
		.set({ status: 'confirmed', autoConfirmed: true, respondedAt: new Date() })
		.where(
			and(eq(businessTransaction.status, 'pending'), lt(businessTransaction.createdAt, cutoff))
		);
}

export async function recordTransaction(
	me: string,
	input: {
		otherId: string;
		direction: string;
		kind: string;
		amount: number;
		description: string;
		connectId: number | null;
	}
) {
	if (input.otherId === me) return { error: 'Choose another member.' };
	if (input.direction !== 'received' && input.direction !== 'given')
		return { error: 'Choose who did business with whom.' };
	if (!(input.kind in transactionKinds)) return { error: 'Choose the type of business.' };
	if (!Number.isInteger(input.amount) || input.amount < 1 || input.amount > 1_000_000_000)
		return { error: 'Enter the business value in whole rupees.' };
	if (!(await isActiveMember(input.otherId))) return { error: 'That member isn’t active.' };

	// A connect can only back a transaction between the same two members.
	let connectId: number | null = null;
	if (input.connectId) {
		const [c] = await db
			.select({ id: connect.id })
			.from(connect)
			.where(
				and(
					eq(connect.id, input.connectId),
					or(
						and(eq(connect.fromId, me), eq(connect.toId, input.otherId)),
						and(eq(connect.fromId, input.otherId), eq(connect.toId, me))
					)
				)
			);
		connectId = c?.id ?? null;
	}

	const received = input.direction === 'received';
	await db.insert(businessTransaction).values({
		receiverId: received ? me : input.otherId,
		giverId: received ? input.otherId : me,
		recordedById: me,
		kind: input.kind,
		amount: input.amount,
		description: input.description || null,
		connectId
	});
	return { ok: true };
}

export async function myTransactions(me: string, range: DateRange) {
	await autoConfirmTransactions();
	const rows = await db
		.select({
			id: businessTransaction.id,
			receiverId: businessTransaction.receiverId,
			recordedById: businessTransaction.recordedById,
			kind: businessTransaction.kind,
			amount: businessTransaction.amount,
			description: businessTransaction.description,
			status: businessTransaction.status,
			autoConfirmed: businessTransaction.autoConfirmed,
			declineReason: businessTransaction.declineReason,
			createdAt: businessTransaction.createdAt,
			otherId: other.id,
			otherName: other.name,
			otherBusiness: otherProfile.business
		})
		.from(businessTransaction)
		.innerJoin(
			other,
			sql`${other.id} = case when ${businessTransaction.receiverId} = ${me} then ${businessTransaction.giverId} else ${businessTransaction.receiverId} end`
		)
		.leftJoin(otherProfile, eq(otherProfile.userId, other.id))
		.where(
			and(
				or(eq(businessTransaction.receiverId, me), eq(businessTransaction.giverId, me)),
				inRange(businessTransaction.createdAt, range)
			)
		)
		.orderBy(desc(businessTransaction.createdAt))
		.limit(5000);
	return rows.map((r) => ({
		...r,
		direction: r.receiverId === me ? ('received' as const) : ('given' as const),
		/** Recorded by the other member and waiting for me to confirm or decline. */
		awaitingMe: r.status === 'pending' && r.recordedById !== me
	}));
}

/** Confirms or declines a record the other member made. Only the non-recording side may answer. */
export async function respondToTransaction(
	me: string,
	id: number,
	confirm: boolean,
	reason: string
) {
	const updated = await db
		.update(businessTransaction)
		.set({
			status: confirm ? 'confirmed' : 'declined',
			declineReason: confirm ? null : reason || null,
			respondedAt: new Date()
		})
		.where(
			and(
				eq(businessTransaction.id, id),
				eq(businessTransaction.status, 'pending'),
				ne(businessTransaction.recordedById, me),
				or(eq(businessTransaction.receiverId, me), eq(businessTransaction.giverId, me))
			)
		)
		.returning({ id: businessTransaction.id, connectId: businessTransaction.connectId });
	if (!updated.length) return { error: 'That record is no longer waiting for you.' };
	if (confirm && updated[0].connectId)
		await db
			.update(connect)
			.set({ status: 'converted' })
			.where(eq(connect.id, updated[0].connectId));
	return { ok: true };
}

/** The recorder may withdraw a record until it's answered. */
export async function withdrawTransaction(me: string, id: number) {
	const removed = await db
		.delete(businessTransaction)
		.where(
			and(
				eq(businessTransaction.id, id),
				eq(businessTransaction.recordedById, me),
				eq(businessTransaction.status, 'pending')
			)
		)
		.returning({ id: businessTransaction.id });
	return removed.length
		? { ok: true }
		: { error: 'Only unanswered records you made can be withdrawn.' };
}

// ---- Performance -----------------------------------------------------------------

export async function performance(me: string) {
	await autoConfirmTransactions();
	const [[connects], [business], [waiting]] = await Promise.all([
		db
			.select({
				given: sql<number>`count(*) filter (where ${connect.fromId} = ${me})::int`,
				received: sql<number>`count(*) filter (where ${connect.toId} = ${me})::int`
			})
			.from(connect)
			.where(or(eq(connect.fromId, me), eq(connect.toId, me))),
		db
			.select({
				given: sql<number>`coalesce(sum(${businessTransaction.amount}) filter (where ${businessTransaction.giverId} = ${me}), 0)::bigint`,
				received: sql<number>`coalesce(sum(${businessTransaction.amount}) filter (where ${businessTransaction.receiverId} = ${me}), 0)::bigint`
			})
			.from(businessTransaction)
			.where(
				and(
					eq(businessTransaction.status, 'confirmed'),
					or(eq(businessTransaction.receiverId, me), eq(businessTransaction.giverId, me))
				)
			),
		db
			.select({ n: sql<number>`count(*)::int` })
			.from(businessTransaction)
			.where(
				and(
					eq(businessTransaction.status, 'pending'),
					ne(businessTransaction.recordedById, me),
					or(eq(businessTransaction.receiverId, me), eq(businessTransaction.giverId, me))
				)
			)
	]);
	return {
		connectsGiven: connects.given,
		connectsReceived: connects.received,
		businessGiven: Number(business.given),
		businessReceived: Number(business.received),
		awaitingMe: waiting.n
	};
}

/** Forum-wide totals for the admin dashboard. */
export async function networkTotals() {
	await autoConfirmTransactions();
	const [[c], [b]] = await Promise.all([
		db.select({ n: sql<number>`count(*)::int` }).from(connect),
		db
			.select({ total: sql<number>`coalesce(sum(${businessTransaction.amount}), 0)::bigint` })
			.from(businessTransaction)
			.where(eq(businessTransaction.status, 'confirmed'))
	]);
	return { connects: c.n, business: Number(b.total) };
}
