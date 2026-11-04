import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getMembership, getPayment, saveMembership, savePayment } from '#lib/server/settings.ts';
import { upiQrSvg } from '#lib/server/qr.ts';

export const load: PageServerLoad = async () => {
	const [membership, payment] = await Promise.all([getMembership(), getPayment()]);
	return { membership, payment, qrSvg: await upiQrSvg(payment, membership.fee, 'SEF membership') };
};

const SAVE_FAILED = 'Couldn’t save — the database may need `npm run db:push` for the new tables.';

export const actions: Actions = {
	fee: async ({ request }) => {
		const data = await request.formData();
		const feeRaw = String(data.get('fee') ?? '').replace(/[₹,\s]/g, '');
		const fee = Number(feeRaw);
		const period = String(data.get('period') ?? '').trim();
		const note = String(data.get('note') ?? '').trim();
		const includes = String(data.get('includes') ?? '')
			.split('\n')
			.map((l) => l.trim())
			.filter(Boolean);
		const values = { fee: feeRaw, period, note, includes: includes.join('\n') };
		const failed = (error: string, status = 400) => fail(status, { fee: { values, error } });

		if (!feeRaw || !Number.isInteger(fee) || fee < 0 || fee > 10_000_000)
			return failed('Enter the fee as a whole number of rupees, e.g. 5000.');
		if (!/(\d+)\s*(month|year)/i.test(period))
			return failed('Enter the period in months or years, e.g. “12 months” or “1 year”.');
		if (!includes.length) return failed('List at least one benefit.');
		if (includes.length > 12) return failed('Keep the list to 12 benefits or fewer.');

		try {
			await saveMembership({ fee, period, includes, note });
		} catch (e) {
			console.error('[admin] membership save failed:', e);
			return failed(SAVE_FAILED, 500);
		}
		return { fee: { saved: true } };
	},

	payment: async ({ request }) => {
		const data = await request.formData();
		const upiId = String(data.get('upiId') ?? '').trim();
		const payeeName = String(data.get('payeeName') ?? '').trim();
		if (upiId && !/^[\w.-]{2,256}@[a-zA-Z][\w.-]{1,64}$/.test(upiId))
			return fail(400, {
				payment: { error: 'That doesn’t look like a UPI ID (e.g. salemforum@okaxis).' }
			});
		try {
			await savePayment({ upiId, payeeName });
		} catch (e) {
			console.error('[admin] payment details save failed:', e);
			return fail(500, { payment: { error: SAVE_FAILED } });
		}
		return { payment: { saved: true } };
	}
};
