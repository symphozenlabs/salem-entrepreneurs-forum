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
