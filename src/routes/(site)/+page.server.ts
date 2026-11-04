import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '#lib/server/db/index.ts';
import { contactMessage } from '#lib/server/db/schema.ts';
import { upcomingEvents } from '#lib/server/events.ts';
import { getMembership, getPayment } from '#lib/server/settings.ts';
import { upiQrSvg } from '#lib/server/qr.ts';

const text = (data: FormData, key: string) => String(data.get(key) ?? '').trim();

export const load: PageServerLoad = async () => {
	// The home page must render even when the database is down or not yet configured.
	const [events, membership, payment] = await Promise.all([
		upcomingEvents(3).catch((e) => {
			console.error('[home] events unavailable:', e);
			return [];
		}),
		getMembership(),
		getPayment()
	]);
	return {
		events,
		membership,
		payment,
		qrSvg: await upiQrSvg(payment, membership.fee, 'SEF membership')
	};
};

export const actions: Actions = {
	contact: async ({ request }) => {
		const data = await request.formData();
		const msg = {
			name: text(data, 'name'),
			phone: text(data, 'phone'),
			email: text(data, 'email'),
			business: text(data, 'business') || null,
			message: text(data, 'message')
		};

		if (!msg.name || !msg.phone || !msg.email || !msg.message)
			return fail(400, { error: 'Please fill in your name, phone, email and message.' });
		if (!/^\S+@\S+\.\S+$/.test(msg.email))
			return fail(400, { error: 'That email address doesn’t look right.' });
		if (msg.message.length > 4000) return fail(400, { error: 'Please keep your message shorter.' });

		try {
			await db.insert(contactMessage).values(msg);
		} catch (e) {
			console.error('contact insert failed', e);
			return fail(500, {
				error: 'We couldn’t send that just now — please WhatsApp the secretariat instead.'
			});
		}
		return { ok: true };
	}
};
