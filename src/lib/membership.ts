// Membership helpers shared by the public pages, the member area and the admin.

/** How the forum takes payment, as the admin set it. */
export type PaymentInfo = {
	upiId: string;
	payeeName: string;
};

/**
 * The UPI payment request (NPCI's upi://pay format) with the amount filled in.
 * The QR code encodes exactly this, and the Pay buttons open it in an app.
 * Encoded by hand: some UPI apps show URLSearchParams' "+" for spaces literally.
 */
function upiQuery(p: PaymentInfo, amount: number, note: string) {
	const params: [string, string][] = [
		['pa', p.upiId],
		['pn', p.payeeName || 'SEF'],
		['am', amount.toFixed(2)],
		['cu', 'INR'],
		['tn', note]
	];
	// Keep "@" readable: some UPI apps don't decode %40 inside the UPI ID.
	return params.map(([k, v]) => `${k}=${encodeURIComponent(v).replace(/%40/g, '@')}`).join('&');
}

export function upiLink(p: PaymentInfo, amount: number, note: string) {
	return p.upiId ? `upi://pay?${upiQuery(p, amount, note)}` : null;
}

const GPAY_ANDROID_PACKAGE = 'com.google.android.apps.nbu.paisa.user';

/** Links that open Google Pay itself, rather than the phone's UPI app chooser. */
export function gpayLinks(p: PaymentInfo, amount: number, note: string) {
	if (!p.upiId) return null;
	const q = upiQuery(p, amount, note);
	return {
		// Android: an intent pinned to the GPay app; without GPay it opens its Play Store page.
		android: `intent://pay?${q}#Intent;scheme=upi;package=${GPAY_ANDROID_PACKAGE};end`,
		ios: `gpay://upi/pay?${q}`
	};
}

/** UPI transaction references are 12 digits; some apps show longer alphanumeric IDs. */
export const cleanUtr = (s: string) => s.replace(/\s+/g, '').toUpperCase();
export const isUtr = (s: string) => /^[A-Z0-9]{10,30}$/.test(s);

const DAY = 86_400_000;
export const RENEWAL_WINDOW_DAYS = 30;

export function membershipStatus(expiresAt: Date, now = new Date()) {
	const days = Math.ceil((expiresAt.getTime() - now.getTime()) / DAY);
	if (days <= 0) return { state: 'expired' as const, days };
	if (days <= RENEWAL_WINDOW_DAYS) return { state: 'expiring' as const, days };
	return { state: 'active' as const, days };
}

/** A one-time fee for life: the admin's period reads "Lifetime" (or similar). */
export const isLifetime = (period: string) => /life/i.test(period);

/** Lifetime membership expires a century on, so it never needs renewing. */
const LIFETIME_MONTHS = 1200;

/**
 * "12 months" → 12, "1 year" → 12, "2 years" → 24, "Lifetime" → 1200; anything else counts
 * as a year.
 */
export function periodMonths(period: string) {
	if (isLifetime(period)) return LIFETIME_MONTHS;
	const m = period.match(/(\d+)\s*(month|year)/i);
	if (!m) return 12;
	const n = Number(m[1]);
	return m[2].toLowerCase() === 'year' ? n * 12 : n;
}

export function addMonths(d: Date, months: number) {
	const r = new Date(d);
	r.setMonth(r.getMonth() + months);
	return r;
}

/** Statuses as shown to people. */
export const statusLabel: Record<string, string> = {
	pending: 'Awaiting verification',
	verified: 'Verified',
	approved: 'Approved',
	rejected: 'Not verified'
};

/**
 * An Instagram profile from what people type: "@handle", "handle", "instagram.com/handle" or a
 * full link (with tracking parameters). Returns the canonical profile URL, or null if it isn't one.
 */
export function instagramUrl(input: string) {
	const bare = input.trim().replace(/^https?:\/\//i, '');
	const onInstagram = /^(www\.|m\.)?instagram\.com\//i.test(bare);
	// A link to some other site (facebook.com/…) isn't an Instagram profile.
	if (!onInstagram && /^[^/@]+\.[a-z]{2,}\//i.test(bare)) return null;
	const s = bare
		.replace(/^(www\.|m\.)?instagram\.com\//i, '')
		.replace(/^@/, '')
		.split(/[/?#]/)[0];
	return /^[A-Za-z0-9._]{1,30}$/.test(s) ? `https://www.instagram.com/${s}/` : null;
}

/** The category from a form: the listed choice, or the typed one when "Other" was picked. */
export function industryFrom(data: FormData) {
	const choice = String(data.get('industry') ?? '').trim();
	const typed = String(data.get('industryOther') ?? '')
		.trim()
		.replace(/\s+/g, ' ')
		.slice(0, 60);
	return choice === 'Other' ? typed : choice;
}
