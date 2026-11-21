import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { siteSetting } from '#lib/server/db/schema.ts';
import { defaultMembership, type Membership } from '#lib/content.ts';
import type { PaymentInfo } from '#lib/membership.ts';

async function read<T>(key: string): Promise<{ value: T; updatedAt: Date } | undefined> {
	const [row] = await db
		.select({ value: siteSetting.value, updatedAt: siteSetting.updatedAt })
		.from(siteSetting)
		.where(eq(siteSetting.key, key));
	return row as { value: T; updatedAt: Date } | undefined;
}

async function write(key: string, value: unknown) {
	const updatedAt = new Date();
	await db
		.insert(siteSetting)
		.values({ key, value, updatedAt })
		.onConflictDoUpdate({ target: siteSetting.key, set: { value, updatedAt } });
}

/**
 * The membership card as the admin last saved it, filled in from the defaults.
 * Falls back to the defaults entirely when the database can't be read, so the
 * home page never breaks over it.
 */
export async function getMembership(): Promise<Membership> {
	try {
		const row = await read<Partial<Membership>>('membership');
		return { ...defaultMembership, ...row?.value };
	} catch (e) {
		console.error('[settings] membership unavailable, using defaults:', e);
		return defaultMembership;
	}
}

export const saveMembership = (value: Membership) => write('membership', value);

// ---- Payment details (UPI ID and payee; the QR is generated from them) ----------

export async function getPayment(): Promise<PaymentInfo> {
	try {
		const row = await read<Partial<PaymentInfo>>('payment');
		return { upiId: row?.value.upiId ?? '', payeeName: row?.value.payeeName ?? '' };
	} catch (e) {
		console.error('[settings] payment details unavailable:', e);
		return { upiId: '', payeeName: '' };
	}
}

export const savePayment = (value: PaymentInfo) => write('payment', value);

/**
 * When the first bulk upload of members happened. That upload numbers members by joining
 * date (bringing in the existing membership); later ones follow the file's row order.
 */
export const firstImportAt = async () =>
	(await read<string>('members-first-import'))?.value ?? null;
export const markFirstImport = () => write('members-first-import', new Date().toISOString());

// ---- Member features the admin can switch on and off ----------------------------

export type Features = {
	connects: boolean;
	transactions: boolean;
	/** When transactions were last switched on: the auto-confirm wait restarts from here. */
	transactionsOnSince: string | null;
};

const FEATURES_OFF: Features = { connects: false, transactions: false, transactionsOnSince: null };

/** Off until an admin switches them on, and off if the setting can't be read. */
export async function getFeatures(): Promise<Features> {
	try {
		return { ...FEATURES_OFF, ...(await read<Partial<Features>>('member-features'))?.value };
	} catch (e) {
		console.error('[settings] member features unavailable:', e);
		return FEATURES_OFF;
	}
}

export async function setFeature(feature: 'connects' | 'transactions', on: boolean) {
	const current = await getFeatures();
	const next = { ...current, [feature]: on };
	if (feature === 'transactions' && on && !current.transactions)
		next.transactionsOnSince = new Date().toISOString();
	await write('member-features', next);
}
