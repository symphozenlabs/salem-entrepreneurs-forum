import { EMAIL_FROM, ORIGIN, RESEND_API_KEY } from '$app/env/private';
import { brand, contact } from '#lib/content.ts';

export const emailConfigured = () => !!RESEND_API_KEY && !!EMAIL_FROM;

/**
 * Sends one email through Resend. Never throws: returns false when email isn't
 * configured or the send fails, so callers can fall back to sharing by hand.
 */
export async function sendEmail(msg: { to: string; subject: string; text: string; html: string }) {
	if (!emailConfigured()) return false;
	try {
		const res = await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: { authorization: `Bearer ${RESEND_API_KEY}`, 'content-type': 'application/json' },
			body: JSON.stringify({
				from: EMAIL_FROM,
				to: [msg.to],
				subject: msg.subject,
				text: msg.text,
				html: msg.html
			})
		});
		if (!res.ok)
			console.error('[email] Resend rejected the message:', res.status, await res.text());
		return res.ok;
	} catch (e) {
		console.error('[email] send failed:', e);
		return false;
	}
}

const esc = (s: string) =>
	s.replace(
		/[&<>"']/g,
		(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
	);

const site = () => ORIGIN || 'https://salem-entrepreneurs-forum.vercel.app';

/** Plain, brand-coloured layout that renders in every mail client. */
function layout(title: string, paragraphs: string[]) {
	const body = paragraphs.map((p) => `<p style="margin:0 0 16px">${p}</p>`).join('');
	return `<!doctype html><html><body style="margin:0;background:#f5efe4;font-family:Arial,sans-serif;color:#0c1626">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fbf8f2;border-top:4px solid #c9973f">
<tr><td style="padding:32px">
<p style="margin:0 0 4px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#8e6424">${esc(brand.name)}</p>
<h1 style="margin:0 0 24px;font-family:Georgia,serif;font-weight:normal;font-size:26px">${esc(title)}</h1>
<div style="font-size:15px;line-height:1.6">${body}</div>
<p style="margin:24px 0 0;font-size:12px;color:#6e6658">${esc(contact.phone)} · ${esc(contact.email)}</p>
</td></tr></table></td></tr></table></body></html>`;
}

export function credentialsEmail(p: {
	name: string;
	email: string;
	password: string;
	memberNumber: string;
}) {
	const login = `${site()}/login`;
	const lines = [
		`Dear ${p.name},`,
		`Welcome to the ${brand.name}. Your payment has been verified and your membership is active. Member number: ${p.memberNumber}.`,
		`Sign in at ${login}`,
		`Email: ${p.email}`,
		`Temporary password: ${p.password}`,
		'You will be asked to choose your own password the first time you sign in. Then complete your profile so other members can find you in the directory.',
		'— The SEF Secretariat'
	];
	return {
		to: p.email,
		subject: `Welcome to ${brand.short} — your member login`,
		text: lines.join('\n\n'),
		html: layout('Your membership is active', [
			`Dear ${esc(p.name)},`,
			`Welcome to the ${esc(brand.name)}. Your payment has been verified and your membership is active. Member number: <strong>${esc(p.memberNumber)}</strong>.`,
			`<strong>Sign in:</strong> <a href="${esc(login)}" style="color:#8e6424">${esc(login)}</a><br><strong>Email:</strong> ${esc(p.email)}<br><strong>Temporary password:</strong> <code style="font-size:16px;background:#ebe2d1;padding:2px 6px">${esc(p.password)}</code>`,
			'You will be asked to choose your own password the first time you sign in. Then complete your profile so other members can find you in the directory.',
			'— The SEF Secretariat'
		])
	};
}

export function passwordResetEmail(p: { name: string; email: string; password: string }) {
	const login = `${site()}/login`;
	return {
		to: p.email,
		subject: `${brand.short} — your new temporary password`,
		text: `Dear ${p.name},\n\nThe secretariat has reset your password.\n\nSign in at ${login}\nEmail: ${p.email}\nTemporary password: ${p.password}\n\nYou will be asked to choose a new password when you sign in.\n\n— The SEF Secretariat`,
		html: layout('Your password was reset', [
			`Dear ${esc(p.name)},`,
			'The secretariat has reset your password.',
			`<strong>Sign in:</strong> <a href="${esc(login)}" style="color:#8e6424">${esc(login)}</a><br><strong>Email:</strong> ${esc(p.email)}<br><strong>Temporary password:</strong> <code style="font-size:16px;background:#ebe2d1;padding:2px 6px">${esc(p.password)}</code>`,
			'You will be asked to choose a new password when you sign in.',
			'— The SEF Secretariat'
		])
	};
}

export function decisionEmail(p: { name: string; email: string; title: string; message: string }) {
	return {
		to: p.email,
		subject: `${brand.short} — ${p.title}`,
		text: `Dear ${p.name},\n\n${p.message}\n\n— The SEF Secretariat`,
		html: layout(p.title, [
			`Dear ${esc(p.name)},`,
			esc(p.message).replace(/\n/g, '<br>'),
			'— The SEF Secretariat'
		])
	};
}
