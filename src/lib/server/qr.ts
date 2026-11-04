import QRCode from 'qrcode';
import { upiLink, type PaymentInfo } from '#lib/membership.ts';

/** An SVG QR code of the UPI payment request (amount included), or null without a UPI ID. */
export async function upiQrSvg(p: PaymentInfo, amount: number, note: string) {
	const link = upiLink(p, amount, note);
	if (!link) return null;
	return QRCode.toString(link, {
		type: 'svg',
		errorCorrectionLevel: 'M',
		margin: 1,
		color: { dark: '#0c1626', light: '#ffffff' }
	});
}
