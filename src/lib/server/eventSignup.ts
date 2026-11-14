// Registering for an event through our own form, shared by the public register page
// and the member portal. Active members pay the member fee when the event has one.
import { fail } from '@sveltejs/kit';
import { and, eq, ne } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { eventRegistration } from '#lib/server/db/schema.ts';
import type { eventBySlug } from '#lib/server/events.ts';
import { register, seatsTaken } from '#lib/server/registrations.ts';
import type { getMe } from '#lib/server/network.ts';
import { getPayment } from '#lib/server/settings.ts';
import { upiQrSvg } from '#lib/server/qr.ts';
import { readImage } from '#lib/server/uploads.ts';
import { isEmail } from '#lib/server/admin.ts';
import { registrationState } from '#lib/events.ts';
import { cleanFields, readAnswers } from '#lib/forms.ts';
import { cleanUtr, isUtr } from '#lib/membership.ts';

type Ev = NonNullable<Awaited<ReturnType<typeof eventBySlug>>>;
type Me = NonNullable<Awaited<ReturnType<typeof getMe>>>;

/** What the registrant pays, and the questions they answer. Expired members pay the regular fee. */
export function signup(ev: Ev, member: Me | undefined) {
	const activeMember = !!member && member.expiresAt > new Date();
	return {
		ev,
		member: activeMember ? member : undefined,
		amount: activeMember && ev.memberFee !== null ? ev.memberFee : ev.fee,
		fields: cleanFields(ev.formFields).fields
	};
}

export type Signup = ReturnType<typeof signup>;

/** Everything the registration form needs to show. */
export async function signupPageData({ ev, member, amount, fields }: Signup) {
	const taken = await seatsTaken(ev.id);
	const payment = amount > 0 ? await getPayment() : null;
	const note = `SEF event ${ev.slug}`.slice(0, 50);
	return {
		event: ev,
		fields,
		amount,
		isMember: !!member,
		prefill: member ? { name: member.name, email: member.email, phone: member.phone } : null,
		state: registrationState(ev, taken),
		seatsLeft: ev.seats ? Math.max(0, ev.seats - taken) : null,
		payment,
		note,
		qrSvg: payment ? await upiQrSvg(payment, amount, note) : null
	};
}

/** The member's own registration for an event that still stands (pending or confirmed). */
export async function myRegistration(eventId: number, userId: string) {
	const [r] = await db
		.select({
			code: eventRegistration.code,
			status: eventRegistration.status,
			amount: eventRegistration.amount
		})
		.from(eventRegistration)
		.where(
			and(
				eq(eventRegistration.eventId, eventId),
				eq(eventRegistration.userId, userId),
				ne(eventRegistration.status, 'rejected')
			)
		);
	return r;
}

/**
 * Reads and saves a submitted registration. With `identity` (the member portal), the
 * member registers as themselves: name, email and phone come from their profile, not the form.
 */
export async function submitSignup(
	{ ev, member, amount, fields }: Signup,
	request: Request,
	identity?: { userId: string; name: string; email: string; phone: string }
) {
	const data = await request.formData();
	const name =
		identity?.name ??
		String(data.get('name') ?? '')
			.trim()
			.slice(0, 120);
	const email =
		identity?.email ??
		String(data.get('email') ?? '')
			.trim()
			.toLowerCase();
	const phone =
		identity?.phone ??
		String(data.get('phone') ?? '')
			.trim()
			.slice(0, 30);
	const utr = cleanUtr(String(data.get('utr') ?? ''));
	// Everything typed, for redisplay if something needs fixing.
	const values: Record<string, string | string[]> = {};
	for (const key of new Set(data.keys())) {
		if (key === 'proof') continue;
		const all = data.getAll(key).map(String);
		values[key] = all.length > 1 ? all : all[0];
	}

	if (String(data.get('company_url') ?? '')) return { ok: true, code: '', confirmed: false };
	if (registrationState(ev, await seatsTaken(ev.id)) !== 'open')
		return fail(400, { values, errors: { form: 'Registration for this event is closed.' } });
	if (identity && (await myRegistration(ev.id, identity.userId)))
		return fail(400, { values, errors: { form: 'You’re already registered for this event.' } });

	const { answers, errors } = readAnswers(fields, data);
	const fieldErrors: Record<string, string> = { ...errors };
	if (!name) fieldErrors.name = 'Enter your name.';
	if (!isEmail(email)) fieldErrors.email = 'Enter a valid email — your confirmation is sent here.';
	if (phone.replace(/\D/g, '').length < 10) fieldErrors.phone = 'Enter a 10-digit mobile number.';
	let proof = null;
	if (amount > 0) {
		if (!isUtr(utr)) fieldErrors.utr = 'Enter the UPI transaction ID (UTR) — usually 12 digits.';
		const upload = await readImage(data, 'proof', 4);
		if (upload && 'error' in upload) fieldErrors.proof = upload.error;
		else proof = upload;
	}
	if (Object.keys(fieldErrors).length) return fail(400, { values, errors: fieldErrors });

	const result = await register(ev, {
		name,
		email,
		phone,
		answers,
		amount,
		userId: identity?.userId ?? member?.id ?? null,
		utr: amount > 0 ? utr : null,
		proof
	});
	if ('error' in result)
		return fail(400, { values, errors: { [result.field ?? 'form']: result.error } });
	return { ok: true, code: result.code, confirmed: result.confirmed };
}
