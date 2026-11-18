import { randomInt } from 'node:crypto';
import { and, count, eq, ne, sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import {
	applicationPhoto,
	memberPhoto,
	memberProfile,
	membershipApplication,
	payment,
	siteSetting,
	user
} from '#lib/server/db/schema.ts';
import { auth, createAccount } from '#lib/server/auth.ts';
import { getMembership } from '#lib/server/settings.ts';
import {
	credentialsEmail,
	decisionEmail,
	passwordResetEmail,
	sendEmail
} from '#lib/server/email.ts';
import { addMonths, periodMonths, phoneDigits, phoneLoginEmail } from '#lib/membership.ts';
import { rupees } from '#lib/content.ts';
import { hubPrefix } from '#lib/network.ts';

/**
 * A new member's first password: their 10-digit mobile number, which they change when they
 * first sign in. A random one if the number is too short to use.
 */
const startingPassword = (phone: string) => phoneDigits(phone) || generatePassword();

/** Easy to read aloud or type from a phone: no 0/O, 1/l/I. e.g. "k7mp-4qx2-h9tw". */
export function generatePassword() {
	const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
	const group = () =>
		Array.from({ length: 4 }, () => alphabet[randomInt(alphabet.length)]).join('');
	return `${group()}-${group()}-${group()}`;
}

/** The first serial in every hub's series: SEF-260001, CEF-260001, TNEF-260001. */
const FIRST_SERIAL = 260001;

/**
 * The next serial in a hub's series, from a counter that only ever goes up, so a removed
 * member's number is never handed out again. The counter lives in site_setting
 * ("member-serial-SEF") and is bumped in one statement, so members added at the same
 * moment get different numbers. It starts above any number already issued in the series.
 */
async function nextMemberSerial(prefix: string) {
	const issued = sql`(select coalesce(max(cast(split_part(${memberProfile.memberNumber}, '-', 2) as integer)), 0)
		from ${memberProfile} where ${memberProfile.memberNumber} ~ ${`^${prefix}-[0-9]+$`})`;
	const [row] = await db
		.insert(siteSetting)
		.values({
			key: `member-serial-${prefix}`,
			value: sql`to_jsonb(greatest(${issued} + 1, ${FIRST_SERIAL}::int))`,
			updatedAt: new Date()
		})
		.onConflictDoUpdate({
			target: siteSetting.key,
			set: { value: sql`to_jsonb((${siteSetting.value})::int + 1)`, updatedAt: new Date() }
		})
		.returning({ value: siteSetting.value });
	return Number(row.value);
}

/** A member's details, as an admin enters them or an application holds them. */
export type MemberDetails = {
	name: string;
	email: string;
	phone: string;
	business: string;
	industry: string;
	hub: string;
	designation?: string | null;
	city?: string | null;
	website?: string | null;
	about?: string | null;
	instagram?: string | null;
	/** When they joined. */
	joinedAt: Date;
};

/**
 * Adds the member's profile with the next number in their hub's series (SEF-260001 for
 * Salem, CEF-… for Coimbatore, TNEF-… for Tamil Nadu), and a membership that runs one
 * period from the day they joined.
 */
async function insertProfile(userId: string, m: MemberDetails) {
	const { period } = await getMembership();
	const prefix = hubPrefix(m.hub);
	// The unique index guards against a number someone typed in by hand; then take the next.
	for (let attempt = 1; ; attempt++) {
		const candidate = `${prefix}-${await nextMemberSerial(prefix)}`;
		try {
			await db.insert(memberProfile).values({
				userId,
				memberNumber: candidate,
				phone: m.phone,
				business: m.business,
				industry: m.industry,
				designation: m.designation || null,
				city: m.city || null,
				website: m.website || null,
				about: m.about || null,
				hub: m.hub,
				instagram: m.instagram || null,
				joinedAt: m.joinedAt,
				expiresAt: addMonths(m.joinedAt, periodMonths(period))
			});
			return candidate;
		} catch (e) {
			if (attempt === 5) throw e;
		}
	}
}

/**
 * Adds a member directly (from the admin's form or a bulk upload): their login with a
 * temporary password and their profile. The login is emailed when email is set up.
 * Pass `email: false` to leave emailing to the caller.
 */
export async function addMember(m: MemberDetails, opts: { email?: boolean } = {}) {
	// No email: they sign in with their mobile number instead.
	const email = m.email ? m.email.toLowerCase() : phoneLoginEmail(m.phone);
	const [taken] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
	if (taken)
		return {
			error: m.email
				? `An account for ${email} already exists.`
				: `A member without email already signs in with ${phoneDigits(m.phone)}.`
		};

	const password = startingPassword(m.phone);
	let accountId: string | null = null;
	let memberNumber: string;
	try {
		const account = await createAccount({
			name: m.name,
			email,
			password,
			role: 'member',
			mustChangePassword: true
		});
		accountId = account.id;
		memberNumber = await insertProfile(account.id, { ...m, email });
	} catch (e) {
		console.error('[add member] failed, rolling back:', e);
		if (accountId) await db.delete(user).where(eq(user.id, accountId));
		return { error: `Couldn’t add ${m.name}. Please try again.` };
	}
	const emailed =
		opts.email === false
			? false
			: await sendEmail(credentialsEmail({ name: m.name, email, password, memberNumber }));
	return {
		credentials: { name: m.name, email, password, emailed } satisfies Credentials,
		memberNumber
	};
}

/** Emails a new member their login; true when it was sent. */
export const emailLogin = (c: {
	name: string;
	email: string;
	password: string;
	memberNumber: string;
}) => sendEmail(credentialsEmail(c));

/** Whether a UTR was already used by another payment that isn't rejected. */
export async function utrInUse(utr: string, exceptPaymentId?: number) {
	const [row] = await db
		.select({ n: count() })
		.from(payment)
		.where(
			and(
				eq(payment.utr, utr),
				ne(payment.status, 'rejected'),
				exceptPaymentId ? ne(payment.id, exceptPaymentId) : undefined
			)
		);
	return row.n > 0;
}

export type Credentials = { name: string; email: string; password: string; emailed: boolean };

// Every review below first *claims* its record with one conditional update
// (only while it's still pending). A double-click or two admins acting at once
// can then never apply the same decision twice.

/**
 * Approves a pending application: creates the member's login with a temporary
 * password, their profile and membership period, marks the payment verified and
 * emails the credentials. Returns the credentials so the admin can share them by
 * hand when email isn't set up or fails.
 */
export async function approveApplication(id: number, adminId: string) {
	const now = new Date();
	const [app] = await db
		.update(membershipApplication)
		.set({ status: 'approved', reviewedAt: now, reviewedBy: adminId })
		.where(and(eq(membershipApplication.id, id), eq(membershipApplication.status, 'pending')))
		.returning();
	if (!app) return { error: 'This application was already reviewed, or no longer exists.' };

	const release = () =>
		db
			.update(membershipApplication)
			.set({ status: 'pending', reviewedAt: null, reviewedBy: null })
			.where(eq(membershipApplication.id, id));

	const email = app.email.toLowerCase();
	const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
	if (existing) {
		await release();
		return { error: `An account for ${email} already exists.` };
	}

	const password = startingPassword(app.phone);
	let accountId: string | null = null;
	let memberNumber = '';
	try {
		const account = await createAccount({
			name: app.name,
			email,
			password,
			role: 'member',
			mustChangePassword: true
		});
		accountId = account.id;

		memberNumber = await insertProfile(account.id, {
			name: app.name,
			email,
			phone: app.phone,
			business: app.business,
			industry: app.industry,
			designation: app.designation,
			city: app.city,
			website: app.website,
			about: app.about,
			hub: app.hub,
			instagram: app.instagram,
			joinedAt: now
		});

		await db
			.update(membershipApplication)
			.set({ userId: account.id })
			.where(eq(membershipApplication.id, id));
		// The photo sent with the application becomes the member's profile photo.
		const [photo] = await db
			.select({ mime: applicationPhoto.mime, data: applicationPhoto.data })
			.from(applicationPhoto)
			.where(eq(applicationPhoto.applicationId, id));
		if (photo) await db.insert(memberPhoto).values({ userId: account.id, ...photo });
		await db
			.update(payment)
			.set({ status: 'verified', reviewedAt: now, reviewedBy: adminId, userId: account.id })
			.where(eq(payment.applicationId, id));
	} catch (e) {
		// Undo, so the application can simply be approved again.
		console.error('[approve] failed, rolling back:', e);
		if (accountId) await db.delete(user).where(eq(user.id, accountId));
		await release();
		return { error: 'Approval didn’t complete, so nothing was changed. Please try again.' };
	}

	const emailed = await sendEmail(
		credentialsEmail({ name: app.name, email, password, memberNumber })
	);
	return {
		credentials: { name: app.name, email, password, emailed } satisfies Credentials,
		memberNumber
	};
}

export async function rejectApplication(id: number, adminId: string, note: string) {
	const now = new Date();
	const [app] = await db
		.update(membershipApplication)
		.set({ status: 'rejected', adminNote: note || null, reviewedAt: now, reviewedBy: adminId })
		.where(and(eq(membershipApplication.id, id), eq(membershipApplication.status, 'pending')))
		.returning();
	if (!app) return { error: 'This application was already reviewed, or no longer exists.' };
	await db
		.update(payment)
		.set({ status: 'rejected', note: note || null, reviewedAt: now, reviewedBy: adminId })
		.where(eq(payment.applicationId, id));
	const emailed = await sendEmail(
		decisionEmail({
			name: app.name,
			email: app.email,
			title: 'About your membership application',
			message: `We couldn't approve your application yet.${note ? `\n\nReason: ${note}` : ''}\n\nIf you believe this is a mistake, reply to this email or call the secretariat with your UPI transaction ID.`
		})
	);
	return { emailed };
}

/** Verifies a member's renewal payment and extends their membership by one period. */
export async function verifyRenewal(paymentId: number, adminId: string) {
	const now = new Date();
	const [p] = await db
		.update(payment)
		.set({ status: 'verified', reviewedAt: now, reviewedBy: adminId })
		.where(
			and(eq(payment.id, paymentId), eq(payment.status, 'pending'), eq(payment.purpose, 'renewal'))
		)
		.returning();
	if (!p?.userId) return { error: 'This payment was already reviewed, or no longer exists.' };

	const [m] = await db
		.select({ expiresAt: memberProfile.expiresAt, name: user.name, email: user.email })
		.from(memberProfile)
		.innerJoin(user, eq(user.id, memberProfile.userId))
		.where(eq(memberProfile.userId, p.userId));
	if (!m) return { error: 'That member no longer exists.' };

	const { period } = await getMembership();
	// Renewing early adds to the current period; renewing late starts from today.
	const expiresAt = addMonths(m.expiresAt > now ? m.expiresAt : now, periodMonths(period));
	await db.update(memberProfile).set({ expiresAt }).where(eq(memberProfile.userId, p.userId));
	const emailed = await sendEmail(
		decisionEmail({
			name: m.name,
			email: m.email,
			title: 'Membership renewed',
			message: `We've verified your payment of ${rupees(p.amount)} (UTR ${p.utr}). Your membership now runs until ${expiresAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })}.`
		})
	);
	return { emailed, expiresAt };
}

export async function rejectPayment(paymentId: number, adminId: string, note: string) {
	const [p] = await db
		.update(payment)
		.set({ status: 'rejected', note: note || null, reviewedAt: new Date(), reviewedBy: adminId })
		.where(
			and(eq(payment.id, paymentId), eq(payment.status, 'pending'), eq(payment.purpose, 'renewal'))
		)
		.returning();
	if (!p) return { error: 'This payment was already reviewed, or no longer exists.' };
	const [m] = p.userId
		? await db
				.select({ name: user.name, email: user.email })
				.from(user)
				.where(eq(user.id, p.userId))
		: [];
	const emailed = m
		? await sendEmail(
				decisionEmail({
					name: m.name,
					email: m.email,
					title: 'About your renewal payment',
					message: `We couldn't verify your payment of ${rupees(p.amount)} (UTR ${p.utr}).${note ? `\n\nReason: ${note}` : ''}\n\nPlease check the transaction ID in your UPI app and submit it again from Membership, or contact the secretariat.`
				})
			)
		: false;
	return { emailed };
}

/**
 * Resets a member's password to their mobile number (signing them out everywhere); they
 * choose their own when they next sign in. Emailed when possible.
 */
export async function resetMemberPassword(userId: string) {
	const [m] = await db
		.select({ name: user.name, email: user.email, role: user.role })
		.from(user)
		.where(eq(user.id, userId));
	if (!m || m.role !== 'member') return { error: 'That member no longer exists.' };
	const ctx = await auth.$context;
	const [p] = await db
		.select({ phone: memberProfile.phone })
		.from(memberProfile)
		.where(eq(memberProfile.userId, userId));
	const password = startingPassword(p?.phone ?? '');
	await ctx.internalAdapter.updatePassword(userId, await ctx.password.hash(password));
	await ctx.internalAdapter.deleteUserSessions(userId);
	await db.update(user).set({ mustChangePassword: true }).where(eq(user.id, userId));
	const emailed = await sendEmail(passwordResetEmail({ name: m.name, email: m.email, password }));
	return { credentials: { name: m.name, email: m.email, password, emailed } satisfies Credentials };
}
