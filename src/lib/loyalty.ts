// Loyalty points: what members earn points for and what they can redeem them for.
// Shared by the member area and the admin.

/**
 * Ways to earn points. Only admins award them (Admin → Loyalty points → Award points);
 * `points` is the amount filled in for the activity, which the admin can change.
 * `once` activities count only once per member.
 */
export const activities = {
	induction: { label: 'New member induction', points: 500, once: true },
	meeting: { label: 'Monthly meeting attendance', points: 200 },
	retreat: { label: 'Business retreat participation', points: 300 },
	intercity: { label: 'Intercity meeting', points: 200 },
	sports: { label: 'Sports meetup participation', points: 100 },
	'on-time': { label: 'On-time event registration', points: 100 },
	profile: { label: 'Complete member profile', points: 200, once: true },
	discussion: { label: 'Group discussion participation', points: 100 },
	other: { label: 'Other activity', points: 0 }
} as const;

export type Activity = keyof typeof activities;
export const isActivity = (v: unknown): v is Activity =>
	typeof v === 'string' && Object.hasOwn(activities, v);
export const isOnce = (k: string) => isActivity(k) && 'once' in activities[k];

/** Kinds from the earlier, automatic points rules, so old history still reads well. */
const earlierKinds: Record<string, string> = {
	referral: 'Business referral',
	collaboration: 'Collaboration',
	introduction: 'Member introduction',
	renewal: 'Membership renewal'
};

/** Every kind of ledger entry: the activities plus corrections and redemptions. */
export const entryKinds: Record<string, string> = {
	...earlierKinds,
	...Object.fromEntries(Object.entries(activities).map(([k, a]) => [k, a.label])),
	adjustment: 'Adjustment',
	redemption: 'Redeemed'
};

// ---- Member levels ----------------------------------------------------------------

/**
 * Levels by points earned in all (redeeming doesn't lower a level), lowest first.
 * An admin can also set a member's level by hand.
 */
export const levels = [
	{ key: 'bronze', label: 'Bronze', min: 0, about: 'Starting level — active participation' },
	{ key: 'silver', label: 'Silver', min: 1_000, about: 'Regular participation and networking' },
	{ key: 'gold', label: 'Gold', min: 2_500, about: 'Consistent contribution and referrals' },
	{ key: 'platinum', label: 'Platinum', min: 5_000, about: 'Highly active community contributor' },
	{ key: 'diamond', label: 'Diamond', min: 10_000, about: 'Exceptional loyalty and leadership' }
] as const;

export type Level = (typeof levels)[number];
export type LevelKey = Level['key'];
export const isLevelKey = (v: unknown): v is LevelKey => levels.some((l) => l.key === v);

/** Badge colours per level. */
export const levelTone: Record<LevelKey, string> = {
	bronze: 'bg-[#f3e3d3] text-[#8a5a2b]',
	silver: 'bg-slate-100 text-slate-700',
	gold: 'bg-amber-100 text-amber-800',
	platinum: 'bg-violet-100 text-violet-800',
	diamond: 'bg-emerald-100 text-emerald-800'
};

/** "0–999 points", "10,000+ points" */
export function levelRange(l: Level) {
	const i = levels.findIndex((x) => x.key === l.key);
	const next = levels[i + 1];
	return next ? `${pts(l.min)}–${pts(next.min - 1)} points` : `${pts(l.min)}+ points`;
}

/**
 * A member's level: the one an admin set, or else the one their points have reached.
 * `next` is the level their points reach next, if any.
 */
export function levelFor(points: number, override?: string | null) {
	const reached = [...levels].reverse().find((l) => points >= l.min) ?? levels[0];
	const set = override ? levels.find((l) => l.key === override) : undefined;
	const level = set ?? reached;
	const next = levels.find((l) => l.min > points && l.min > level.min);
	return { level, manual: !!set, next, toNext: next ? next.min - points : 0 };
}

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
