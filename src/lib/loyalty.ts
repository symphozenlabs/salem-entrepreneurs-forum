// Loyalty points: what members earn points for and what they can redeem them for.
// Shared by the member area and the admin.

/**
 * Ways to earn points. `points` is the default an admin awards by hand; `auto` ones are
 * also added on their own (see syncAutoPoints in src/lib/server/loyalty.ts):
 * - meeting / retreat: members confirmed for an event with that points setting, once it ends
 * - referral / collaboration: confirmed business between members
 * - introduction: the member picked as referrer when an application is approved
 * - renewal: a verified renewal payment
 */
export const activities = {
	meeting: { label: 'Monthly meeting', points: 100, auto: true },
	referral: { label: 'Business referral', points: 50, auto: true },
	retreat: { label: 'Retreat participation', points: 150, auto: true },
	collaboration: { label: 'Collaboration', points: 100, auto: true },
	introduction: { label: 'Member introduction', points: 25, auto: true },
	renewal: { label: 'Membership renewal', points: 100, auto: true },
	other: { label: 'Other activity', points: 0 }
} as const;

export type Activity = keyof typeof activities;
export const isActivity = (v: unknown): v is Activity =>
	typeof v === 'string' && Object.hasOwn(activities, v);

/** What attending an event can earn, chosen on the event form. */
export const eventPointKinds = ['meeting', 'retreat', 'other'] as const;
export type EventPointKind = (typeof eventPointKinds)[number];
export const isEventPointKind = (v: unknown): v is EventPointKind =>
	eventPointKinds.includes(v as EventPointKind);

/** Every kind of ledger entry: the activities plus corrections and redemptions. */
export const entryKinds: Record<string, string> = {
	...Object.fromEntries(Object.entries(activities).map(([k, a]) => [k, a.label])),
	adjustment: 'Adjustment',
	redemption: 'Redeemed'
};

/** What members can spend their points on, cheapest first. */
export const rewards = [
	{ key: 'event-entry', label: 'Event Entry', cost: 4_000, hint: 'Free entry to a forum event' },
	{ key: 'stall', label: 'Stall', cost: 8_000, hint: 'A stall at a forum event' },
	{
		key: 'sponsorship-basic',
		label: 'Event Sponsorship — Basic',
		cost: 10_000,
		hint: 'Basic sponsorship of a forum event'
	},
	{
		key: 'south-india-retreat',
		label: 'South India Retreat Program',
		cost: 15_000,
		hint: 'A place on the South India retreat'
	},
	{
		key: 'pan-india-retreat',
		label: 'PAN India Retreat Program',
		cost: 30_000,
		hint: 'A place on the PAN India retreat'
	},
	{
		key: 'international-trip',
		label: 'International Trip',
		cost: 50_000,
		hint: 'A place on the forum’s international trip'
	}
] as const;

export type Reward = (typeof rewards)[number];
export const rewardByKey = (key: string): Reward | undefined => rewards.find((r) => r.key === key);

export const redemptionStatus = {
	pending: 'Waiting for approval',
	approved: 'Approved',
	rejected: 'Not approved',
	cancelled: 'Cancelled'
} as const;

export type RedemptionStatus = keyof typeof redemptionStatus;

/** "3,250" */
export const pts = (n: number) => n.toLocaleString('en-IN');

/** The cheapest reward the member can't redeem yet, if any. */
export const nextReward = (available: number) => rewards.find((r) => r.cost > available);
