import { and, asc, desc, eq, gt, ilike, inArray, isNull, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '#lib/server/db/index.ts';
import {
	event,
	eventRegistration,
	loyaltyEntry,
	loyaltyRedemption,
	memberProfile,
	user
} from '#lib/server/db/schema.ts';
import { autoConfirmTransactions } from '#lib/server/network.ts';
import { activities, isActivity, isLevelKey, isOnce, rewardByKey } from '#lib/loyalty.ts';

/** Rows from `db.execute`, whichever driver ran it. */
const rowsOf = (r: unknown) => (Array.isArray(r) ? r : ((r as { rows?: unknown[] }).rows ?? []));

const live = isNull(loyaltyEntry.voidedAt);
const sumPoints = sql<number>`coalesce(sum(${loyaltyEntry.points}), 0)::int`;
const levelPoints = sql<number>`coalesce(sum(${loyaltyEntry.points}) filter (where ${loyaltyEntry.kind} <> 'redemption'), 0)::int`;
const countOf = (...kinds: string[]) =>
	sql<number>`(count(*) filter (where ${inArray(loyaltyEntry.kind, kinds)}))::int`;

// ---- Housekeeping ---------------------------------------------------------------

/**
 * Runs whenever points are read. Points are only ever awarded by an admin now, so this just
 * settles business records that are due to confirm themselves.
 */
export async function syncAutoPoints() {
	await autoConfirmTransactions();
}

// ---- A member's points ----------------------------------------------------------

export type PointsSummary = {
	/** Everything that counts: earned minus redeemed and corrections. */
	balance: number;
	/** All points ever earned. */
	earned: number;
	/** What decides the member's level: everything except redemptions. */
	levelPoints: number;
	/** The level an admin set by hand, if any. */
	levelOverride: string | null;
	redeemed: number;
	/** Points asked for in requests still waiting for an admin. */
	held: number;
	/** What the member can still ask to redeem. */
	available: number;
	eventsAttended: number;
	discussions: number;
	onTime: number;
	/** Induction, profile and other activities. */
	activitiesCompleted: number;
};

export async function pointsSummary(userId: string): Promise<PointsSummary> {
	const [[s], [h], [p]] = await Promise.all([
		db
			.select({
				balance: sumPoints,
				earned: sql<number>`coalesce(sum(${loyaltyEntry.points}) filter (where ${loyaltyEntry.points} > 0), 0)::int`,
				redeemed: sql<number>`coalesce(-sum(${loyaltyEntry.points}) filter (where ${loyaltyEntry.kind} = 'redemption'), 0)::int`,
				levelPoints,
				eventsAttended: countOf('meeting', 'retreat', 'intercity', 'sports'),
				discussions: countOf('discussion'),
				onTime: countOf('on-time'),
				activitiesCompleted: countOf('induction', 'profile', 'other')
			})
			.from(loyaltyEntry)
			.where(and(eq(loyaltyEntry.userId, userId), live)),
		db
			.select({ held: sql<number>`coalesce(sum(${loyaltyRedemption.cost}), 0)::int` })
			.from(loyaltyRedemption)
			.where(and(eq(loyaltyRedemption.userId, userId), eq(loyaltyRedemption.status, 'pending'))),
		db
			.select({ level: memberProfile.level })
			.from(memberProfile)
			.where(eq(memberProfile.userId, userId))
	]);
	return {
		...s,
		held: h.held,
		available: s.balance - h.held,
		levelOverride: p?.level ?? null
	};
}

/** A member's own history, newest first; cancelled entries are left out. */
export async function pointsHistory(userId: string) {
	return db
		.select({
			id: loyaltyEntry.id,
			kind: loyaltyEntry.kind,
			points: loyaltyEntry.points,
			note: loyaltyEntry.note,
			occurredAt: loyaltyEntry.occurredAt
		})
		.from(loyaltyEntry)
		.where(and(eq(loyaltyEntry.userId, userId), live))
		.orderBy(desc(loyaltyEntry.occurredAt), desc(loyaltyEntry.id))
		.limit(5000);
}

export async function myRedemptions(userId: string) {
	return db
		.select({
			id: loyaltyRedemption.id,
			rewardLabel: loyaltyRedemption.rewardLabel,
			cost: loyaltyRedemption.cost,
			note: loyaltyRedemption.note,
			status: loyaltyRedemption.status,
			adminNote: loyaltyRedemption.adminNote,
			reviewedAt: loyaltyRedemption.reviewedAt,
			createdAt: loyaltyRedemption.createdAt
		})
		.from(loyaltyRedemption)
		.where(eq(loyaltyRedemption.userId, userId))
		.orderBy(desc(loyaltyRedemption.createdAt))
		.limit(200);
}

/**
 * Asks for a reward. Nothing is taken off yet, but the points are held so the member
 * can't ask for more than they have. One statement, so two quick clicks can't both pass.
 */
export async function requestRedemption(userId: string, rewardKey: string, note: string) {
	const reward = rewardByKey(rewardKey);
	if (!reward) return { error: 'Choose a reward.' };
	const [m] = await db
		.select({ id: memberProfile.userId })
		.from(memberProfile)
		.where(and(eq(memberProfile.userId, userId), gt(memberProfile.expiresAt, new Date())));
	if (!m) return { error: 'Renew your membership to redeem points.' };
	const inserted = await db.execute(sql`
		insert into ${loyaltyRedemption} (user_id, reward, reward_label, cost, note)
		select ${userId}, ${reward.key}, ${reward.label}, ${reward.cost}::int, ${note || null}
		where ${reward.cost}::int <=
			(select coalesce(sum(points), 0) from ${loyaltyEntry}
				where user_id = ${userId} and voided_at is null)
			- (select coalesce(sum(cost), 0) from ${loyaltyRedemption}
				where user_id = ${userId} and status = 'pending')
		returning id`);
	if (!rowsOf(inserted).length) {
		// Say what's actually free to use: points held for waiting requests don't count.
		const s = await pointsSummary(userId);
		const n = (v: number) => v.toLocaleString('en-IN');
		return {
			error:
				`${reward.label} needs ${n(reward.cost)} points; you have ${n(s.available)} available` +
				(s.held ? ` (${n(s.held)} more are on hold for requests awaiting approval).` : '.')
		};
	}
	return { ok: true, reward: reward.label };
}

/** A member can withdraw a request until an admin has answered it. */
export async function cancelRedemption(userId: string, id: number) {
	const updated = await db
		.update(loyaltyRedemption)
		.set({ status: 'cancelled' })
		.where(
			and(
				eq(loyaltyRedemption.id, id),
				eq(loyaltyRedemption.userId, userId),
				eq(loyaltyRedemption.status, 'pending')
			)
		)
		.returning({ id: loyaltyRedemption.id });
	return updated.length ? { ok: true } : { error: 'That request has already been answered.' };
}

// ---- Admin ----------------------------------------------------------------------

export async function pendingRedemptionCount() {
	const [r] = await db
		.select({ n: sql<number>`count(*)::int` })
		.from(loyaltyRedemption)
		.where(eq(loyaltyRedemption.status, 'pending'));
	return r.n;
}

/** Every member's points, for the admin's overview. */
export async function memberBalances(q: string) {
	const term = q ? `%${q.replace(/[%_\\]/g, '\\$&')}%` : null;
	const [members, totals, held] = await Promise.all([
		db
			.select({
				id: user.id,
				name: user.name,
				memberNumber: memberProfile.memberNumber,
				business: memberProfile.business,
				hub: memberProfile.hub,
				levelOverride: memberProfile.level
			})
			.from(memberProfile)
			.innerJoin(user, eq(user.id, memberProfile.userId))
			.where(
				term
					? or(
							ilike(user.name, term),
							ilike(memberProfile.business, term),
							ilike(memberProfile.memberNumber, term)
						)
					: undefined
			)
			.orderBy(asc(user.name))
			.limit(5000),
		db
			.select({
				userId: loyaltyEntry.userId,
				balance: sumPoints,
				earned: sql<number>`coalesce(sum(${loyaltyEntry.points}) filter (where ${loyaltyEntry.points} > 0), 0)::int`,
				redeemed: sql<number>`coalesce(-sum(${loyaltyEntry.points}) filter (where ${loyaltyEntry.kind} = 'redemption'), 0)::int`,
				levelPoints,
				lastAt: sql<Date | null>`max(${loyaltyEntry.occurredAt})`
			})
			.from(loyaltyEntry)
			.where(live)
			.groupBy(loyaltyEntry.userId),
		db
			.select({
				userId: loyaltyRedemption.userId,
				held: sql<number>`coalesce(sum(${loyaltyRedemption.cost}), 0)::int`
			})
			.from(loyaltyRedemption)
			.where(eq(loyaltyRedemption.status, 'pending'))
			.groupBy(loyaltyRedemption.userId)
	]);
	const byUser = new Map(totals.map((t) => [t.userId, t]));
	const heldBy = new Map(held.map((h) => [h.userId, h.held]));
	return members
		.map((m) => {
			const t = byUser.get(m.id);
			return {
				...m,
				balance: t?.balance ?? 0,
				earned: t?.earned ?? 0,
				redeemed: t?.redeemed ?? 0,
				levelPoints: t?.levelPoints ?? 0,
				held: heldBy.get(m.id) ?? 0,
				lastAt: t?.lastAt ? new Date(t.lastAt) : null
			};
		})
		.sort((a, b) => b.balance - a.balance || a.name.localeCompare(b.name));
}

const admin = alias(user, 'admin');

/** The full points log, newest first, optionally for one member. */
export async function allEntries(memberId: string | null) {
	return db
		.select({
			id: loyaltyEntry.id,
			userId: loyaltyEntry.userId,
			name: user.name,
			memberNumber: memberProfile.memberNumber,
			kind: loyaltyEntry.kind,
			points: loyaltyEntry.points,
			note: loyaltyEntry.note,
			auto: sql<boolean>`${loyaltyEntry.source} is not null and ${loyaltyEntry.kind} <> 'redemption'`,
			awardedBy: admin.name,
			occurredAt: loyaltyEntry.occurredAt,
			voidedAt: loyaltyEntry.voidedAt
		})
		.from(loyaltyEntry)
		.innerJoin(user, eq(user.id, loyaltyEntry.userId))
		.leftJoin(memberProfile, eq(memberProfile.userId, loyaltyEntry.userId))
		.leftJoin(admin, eq(admin.id, loyaltyEntry.awardedBy))
		.where(memberId ? eq(loyaltyEntry.userId, memberId) : undefined)
		.orderBy(desc(loyaltyEntry.occurredAt), desc(loyaltyEntry.id))
		.limit(5000);
}

export async function redemptions(status: string) {
	const rows = await db
		.select({
			id: loyaltyRedemption.id,
			userId: loyaltyRedemption.userId,
			name: user.name,
			memberNumber: memberProfile.memberNumber,
			phone: memberProfile.phone,
			rewardLabel: loyaltyRedemption.rewardLabel,
			cost: loyaltyRedemption.cost,
			note: loyaltyRedemption.note,
			status: loyaltyRedemption.status,
			adminNote: loyaltyRedemption.adminNote,
			reviewedAt: loyaltyRedemption.reviewedAt,
			reviewer: admin.name,
			createdAt: loyaltyRedemption.createdAt,
			/** The member's balance right now, so the admin sees whether it still covers the cost. */
			balance: sql<number>`(select coalesce(sum(points), 0)::int from ${loyaltyEntry}
				where user_id = ${loyaltyRedemption.userId} and voided_at is null)`
		})
		.from(loyaltyRedemption)
		.innerJoin(user, eq(user.id, loyaltyRedemption.userId))
		.leftJoin(memberProfile, eq(memberProfile.userId, loyaltyRedemption.userId))
		.leftJoin(admin, eq(admin.id, loyaltyRedemption.reviewedBy))
		.where(eq(loyaltyRedemption.status, status))
		.orderBy(
			status === 'pending' ? asc(loyaltyRedemption.createdAt) : desc(loyaltyRedemption.createdAt)
		)
		.limit(5000);
	return rows;
}

export async function redemptionCounts() {
	const rows = await db
		.select({ status: loyaltyRedemption.status, n: sql<number>`count(*)::int` })
		.from(loyaltyRedemption)
		.groupBy(loyaltyRedemption.status);
	return Object.fromEntries(rows.map((r) => [r.status, r.n])) as Record<string, number>;
}

/**
 * Approves a request and takes the points off in the same statement, as long as the
 * member still has enough. The deduction is keyed to the request, so it can't happen twice.
 */
export async function approveRedemption(id: number, adminId: string, note: string) {
	const r = loyaltyRedemption;
	const done = await db.execute(sql`
		with approved as (
			update ${r} set status = 'approved', reviewed_at = now(), reviewed_by = ${adminId},
				admin_note = ${note || null}
			where ${r.id} = ${id} and ${r.status} = 'pending'
				and ${r.cost} <= (select coalesce(sum(e.points), 0) from ${loyaltyEntry} e
					where e.user_id = ${r.userId} and e.voided_at is null)
			returning id, user_id, cost, reward_label
		)
		insert into ${loyaltyEntry} (user_id, kind, points, note, source, awarded_by)
		select user_id, 'redemption', -cost, reward_label, 'redemption:' || id, ${adminId}
		from approved
		returning id`);
	if (rowsOf(done).length) return { ok: true };
	const [row] = await db.select({ status: r.status }).from(r).where(eq(r.id, id));
	if (!row) return { error: 'That request no longer exists.' };
	if (row.status !== 'pending') return { error: 'That request has already been answered.' };
	return { error: 'The member no longer has enough points for this reward.' };
}

export async function rejectRedemption(id: number, adminId: string, note: string) {
	const updated = await db
		.update(loyaltyRedemption)
		.set({
			status: 'rejected',
			adminNote: note || null,
			reviewedAt: new Date(),
			reviewedBy: adminId
		})
		.where(and(eq(loyaltyRedemption.id, id), eq(loyaltyRedemption.status, 'pending')))
		.returning({ id: loyaltyRedemption.id });
	return updated.length ? { ok: true } : { error: 'That request has already been answered.' };
}

/** Points an admin gives (or, as an adjustment, takes away) for one or more members. */
export async function awardPoints(
	adminId: string,
	input: { memberIds: string[]; kind: string; points: number; note: string; occurredAt: Date }
) {
	const ids = [...new Set(input.memberIds)].filter(Boolean);
	if (!ids.length) return { error: 'Choose at least one member.' };
	if (ids.length > 1000) return { error: 'Choose at most 1,000 members at a time.' };
	const adjustment = input.kind === 'adjustment';
	if (!adjustment && !isActivity(input.kind)) return { error: 'Choose an activity.' };
	if (!Number.isInteger(input.points) || input.points === 0 || Math.abs(input.points) > 1_000_000)
		return { error: 'Enter the points as a whole number.' };
	if (!adjustment && input.points < 0)
		return { error: 'To take points away, choose “Adjustment”.' };
	if (adjustment && !input.note) return { error: 'Say why you’re adjusting the points.' };
	if (
		Number.isNaN(input.occurredAt.getTime()) ||
		input.occurredAt.getTime() > Date.now() + 86_400_000
	)
		return { error: 'Choose when the activity happened.' };

	const members = await db
		.select({ id: memberProfile.userId })
		.from(memberProfile)
		.where(inArray(memberProfile.userId, ids));
	if (members.length !== ids.length) return { error: 'One of those members no longer exists.' };
	if (isOnce(input.kind)) {
		const already = await db
			.select({ name: user.name })
			.from(loyaltyEntry)
			.innerJoin(user, eq(user.id, loyaltyEntry.userId))
			.where(and(inArray(loyaltyEntry.userId, ids), eq(loyaltyEntry.kind, input.kind), live));
		if (already.length) {
			const names = [...new Set(already.map((a) => a.name))].join(', ');
			return {
				error: `${activities[input.kind as keyof typeof activities].label} counts once per member — already given to ${names}.`
			};
		}
	}
	await db.insert(loyaltyEntry).values(
		ids.map((userId) => ({
			userId,
			kind: input.kind,
			points: input.points,
			note: input.note || null,
			awardedBy: adminId,
			occurredAt: input.occurredAt
		}))
	);
	return { ok: true, count: ids.length };
}

/** Sets a member's level by hand, or (with null) goes back to the level their points reach. */
export async function setLevel(userId: string, level: string | null) {
	if (level !== null && !isLevelKey(level)) return { error: 'Choose a level.' };
	const updated = await db
		.update(memberProfile)
		.set({ level })
		.where(eq(memberProfile.userId, userId))
		.returning({ id: memberProfile.userId });
	return updated.length ? { ok: true } : { error: 'That member no longer exists.' };
}

/** Cancels an award. Redemptions can't be cancelled here: they follow their request. */
export async function voidEntry(id: number, adminId: string) {
	const updated = await db
		.update(loyaltyEntry)
		.set({ voidedAt: new Date(), voidedBy: adminId })
		.where(
			and(
				eq(loyaltyEntry.id, id),
				isNull(loyaltyEntry.voidedAt),
				sql`${loyaltyEntry.kind} <> 'redemption'`
			)
		)
		.returning({ id: loyaltyEntry.id });
	return updated.length ? { ok: true } : { error: 'That entry can’t be cancelled.' };
}

/** Restores a cancelled award. */
export async function restoreEntry(id: number) {
	const updated = await db
		.update(loyaltyEntry)
		.set({ voidedAt: null, voidedBy: null })
		.where(eq(loyaltyEntry.id, id))
		.returning({ id: loyaltyEntry.id });
	return updated.length ? { ok: true } : { error: 'That entry no longer exists.' };
}

/** Members to choose from when awarding points. */
export async function memberChoices() {
	return db
		.select({
			id: user.id,
			name: user.name,
			memberNumber: memberProfile.memberNumber,
			business: memberProfile.business,
			hub: memberProfile.hub,
			active: sql<boolean>`${memberProfile.expiresAt} > now()`
		})
		.from(memberProfile)
		.innerJoin(user, eq(user.id, memberProfile.userId))
		.orderBy(asc(user.name))
		.limit(5000);
}

/** Recent events with the members confirmed for them, to award attendance in one go. */
export async function eventAttendees() {
	const rows = await db
		.select({
			id: event.id,
			title: event.title,
			startsAt: event.startsAt,
			userId: eventRegistration.userId
		})
		.from(event)
		.innerJoin(eventRegistration, eq(eventRegistration.eventId, event.id))
		.innerJoin(memberProfile, eq(memberProfile.userId, eventRegistration.userId))
		.where(eq(eventRegistration.status, 'confirmed'))
		.orderBy(desc(event.startsAt))
		.limit(5000);
	const events = new Map<
		number,
		{ id: number; title: string; startsAt: Date; members: string[] }
	>();
	for (const r of rows) {
		const e = events.get(r.id) ?? { id: r.id, title: r.title, startsAt: r.startsAt, members: [] };
		if (r.userId && !e.members.includes(r.userId)) e.members.push(r.userId);
		events.set(r.id, e);
	}
	return [...events.values()].slice(0, 40);
}
