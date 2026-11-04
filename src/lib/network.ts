// Labels and rules for member connects and business transactions, shared by
// the member area and the admin.

export const connectKinds = {
	self: { label: 'For myself', hint: 'You need their product or service' },
	referral: { label: 'Referral', hint: 'Someone you know needs it — share their contact' }
} as const;

export const connectStatuses = {
	new: 'New',
	contacted: 'Contacted',
	converted: 'Business done',
	not_converted: 'Didn’t work out'
} as const;

export type ConnectKind = keyof typeof connectKinds;
export type ConnectStatus = keyof typeof connectStatuses;

export const transactionKinds = {
	direct: 'Direct business',
	referral: 'From their referral'
} as const;

export type TransactionKind = keyof typeof transactionKinds;

/** Unanswered business records confirm themselves after this many days. */
export const AUTO_CONFIRM_DAYS = 7;

export const transactionStatus = {
	pending: 'Awaiting confirmation',
	confirmed: 'Confirmed',
	declined: 'Declined'
} as const;

/** What a member sees in pickers and on directory cards. */
export type MemberOption = {
	id: string;
	name: string;
	business: string;
	industry: string;
};

export const photoUrl = (m: { id: string; photoVersion: number | null }) =>
	m.photoVersion ? `/media/members/${m.id}?v=${m.photoVersion}` : null;
