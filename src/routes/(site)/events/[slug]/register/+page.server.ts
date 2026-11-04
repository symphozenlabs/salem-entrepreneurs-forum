import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad, RequestEvent } from './$types';
import { eventBySlug } from '#lib/server/events.ts';
import { register, seatsTaken } from '#lib/server/registrations.ts';
import { getMe } from '#lib/server/network.ts';
import { getPayment } from '#lib/server/settings.ts';
import { upiQrSvg } from '#lib/server/qr.ts';
import { readImage } from '#lib/server/uploads.ts';
import { isEmail } from '#lib/server/admin.ts';
import { registrationState } from '#lib/events.ts';
import { cleanFields, readAnswers } from '#lib/forms.ts';
import { cleanUtr, isUtr } from '#lib/membership.ts';

/** The event, its form, and who is registering (an active member pays the member fee). */
async function context({ params, locals }: Pick<RequestEvent, 'params' | 'locals'>) {
	const ev = await eventBySlug(params.slug, locals.user?.role === 'admin');
	if (!ev || ev.registration !== 'form')
		error(404, 'Registration for this event isn’t on this site.');
	const member =
		locals.user?.role === 'member' ? await getMe(locals.user.id).catch(() => undefined) : undefined;
	const activeMember = !!member && member.expiresAt > new Date();
	const amount = activeMember && ev.memberFee !== null ? ev.memberFee : ev.fee;
	return {
		ev,
		member: activeMember ? member : undefined,
		amount,
		fields: cleanFields(ev.formFields).fields
	};
}

export const load: PageServerLoad = async (event) => {
	const { ev, member, amount, fields } = await context(event);
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
};

export const actions: Actions = {
	default: async (event) => {
		const { ev, member, amount, fields } = await context(event);
		const data = await event.request.formData();
		const name = String(data.get('name') ?? '')
			.trim()
			.slice(0, 120);
		const email = String(data.get('email') ?? '')
			.trim()
			.toLowerCase();
		const phone = String(data.get('phone') ?? '')
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

		const { answers, errors } = readAnswers(fields, data);
		const fieldErrors: Record<string, string> = { ...errors };
		if (!name) fieldErrors.name = 'Enter your name.';
		if (!isEmail(email))
			fieldErrors.email = 'Enter a valid email — your confirmation is sent here.';
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
			userId: member?.id ?? null,
			utr: amount > 0 ? utr : null,
			proof
		});
		if ('error' in result)
			return fail(400, { values, errors: { [result.field ?? 'form']: result.error } });
		return { ok: true, code: result.code, confirmed: result.confirmed };
	}
};
