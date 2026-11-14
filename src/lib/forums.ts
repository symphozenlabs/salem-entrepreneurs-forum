// The three forums served by this one site. Membership, admin and payments are shared;
// what differs is the landing page: brand, copy, industries, scroll story and contact.
// Salem's copy lives in content.ts (carried over from the original site).

import * as salem from './content.ts';

/** In menu order. */
export const FORUM_IDS = ['tamilnadu', 'coimbatore', 'salem'] as const;
export type ForumId = (typeof FORUM_IDS)[number];

/** Where visitors land until they pick another forum from the top-left menu. */
export const DEFAULT_FORUM: ForumId = 'tamilnadu';
/** The state-wide forum: its events page lists every forum's events. */
export const STATE_FORUM: ForumId = 'tamilnadu';
/** Cookie that remembers the visitor's forum (set on the parent domain when subdomains are used). */
export const FORUM_COOKIE = 'forum';

export const isForumId = (v: unknown): v is ForumId =>
	typeof v === 'string' && (FORUM_IDS as readonly string[]).includes(v);

type Chapter = { at: number; eyebrow: string; title: string; body: string };
type Stat = { value: number; prefix?: string; suffix?: string; label: string };

export type Forum = {
	id: ForumId;
	/** Subdomain when the site runs on a custom domain, e.g. coimbatore.<domain>. */
	subdomain: string;
	brand: {
		name: string;
		short: string;
		/** Place name used in copy ("make Salem work"). */
		place: string;
		/** Small line in the picker and footer. */
		region: string;
		tagline: string[];
		description: string;
	};
	/** Image logos (light on dark, ink on light). Without them a text wordmark is drawn. */
	logo?: { light: string; ink: string };
	contact: typeof salem.contact;
	stats: Stat[];
	statsHeading: string;
	industries: { name: string; note: string }[];
	industriesNote: string;
	reasons: { title: string; body: string }[];
	vision: string;
	joinHeading: string;
	eventsIntro: string;
	chapters: Chapter[];
	/** Scroll-story frames, written by scripts/frames.sh. */
	storyManifest: string;
	/** Picker card image. */
	cover: string;
};

/** Chapter rest points, shared by every story (each video has six keyframes). */
const AT = [0.04, 0.22, 0.4, 0.58, 0.76, 0.93];
const chapters = (list: Omit<Chapter, 'at'>[]): Chapter[] =>
	list.map((c, i) => ({ ...c, at: AT[i] }));

const reasonsFor = (place: string, events: string) =>
	salem.reasons.map((r) =>
		r.title === 'Network'
			? {
					...r,
					body: `Sit across the table from entrepreneurs and manufacturers from every major ${place} industry.`
				}
			: r.title === 'Events'
				? { ...r, body: events }
				: r
	);

export const forums: Record<ForumId, Forum> = {
	salem: {
		id: 'salem',
		subdomain: 'salem',
		brand: { ...salem.brand, place: 'Salem', region: 'Salem & the Kongu region' },
		logo: { light: '/brand/logo-light.png', ink: '/brand/logo-ink.png' },
		contact: salem.contact,
		stats: salem.stats,
		statsHeading: 'A private circle of people who make Salem work.',
		industries: salem.industries,
		industriesNote:
			'Owners, managing directors, founders and factory operators from across Salem and the Kongu belt.',
		reasons: salem.reasons,
		vision:
			'To become one of the most active entrepreneur communities in Tamil Nadu — and the first call any Salem founder makes.',
		joinHeading: 'Ready to grow your business in Salem?',
		eventsIntro:
			'Monthly conclaves, masterclasses and dinners — where Salem’s founders meet in person.',
		chapters: salem.chapters,
		storyManifest: '/story/manifest.json',
		cover: '/brand/covers/salem.jpg'
	},

	coimbatore: {
		id: 'coimbatore',
		subdomain: 'coimbatore',
		brand: {
			name: 'Coimbatore Entrepreneurs Forum',
			short: 'CEF',
			place: 'Coimbatore',
			region: 'Coimbatore & the Kongu belt',
			tagline: salem.brand.tagline,
			description:
				'A private networking forum for founders, manufacturers and technology leaders across Coimbatore and the Kongu belt.'
		},
		// TODO: secretariat details for Coimbatore — the shared secretariat until then.
		contact: salem.contact,
		// TODO: Coimbatore figures. Until then: the whole network's.
		stats: salem.stats.map((s) =>
			s.label === 'Salem founders' ? { ...s, label: 'Founders in the network' } : s
		),
		statsHeading: 'A private circle of people who keep Coimbatore’s machines running.',
		industries: [
			{ name: 'Textiles', note: 'Spinning mills, yarn & knitwear exporters' },
			{ name: 'Pumps & motors', note: 'Pump-sets, motors & valves for India and beyond' },
			{ name: 'Foundry', note: 'Castings, forgings & auto components' },
			{ name: 'Engineering', note: 'Machine tools, wet grinders & appliances' },
			{ name: 'Technology', note: 'IT services, SaaS & digital studios' },
			{ name: 'Healthcare', note: 'Hospitals, diagnostics & medical devices' },
			{ name: 'Education', note: 'Colleges, schools & training institutes' }
		],
		industriesNote:
			'Owners, managing directors, founders and plant heads from across Coimbatore and the Kongu belt.',
		reasons: reasonsFor(
			'Coimbatore',
			'Monthly dinners, workshops and masterclasses — from Race Course to the foothills of the Ghats.'
		),
		vision:
			'To become one of the most active entrepreneur communities in Tamil Nadu — and the first call any Coimbatore founder makes.',
		joinHeading: 'Ready to grow your business in Coimbatore?',
		eventsIntro:
			'Monthly conclaves, masterclasses and dinners — where Coimbatore’s founders meet in person.',
		chapters: chapters([
			{
				eyebrow: 'Coimbatore, Tamil Nadu',
				title: 'At the foot of the Ghats.',
				body: 'Every morning, the Western Ghats watch a city of makers switch on.'
			},
			{
				eyebrow: 'Multiple industries',
				title: 'The Manchester of the South.',
				body: 'Spindles, pumps, castings and code — founders behind the machines India runs on.'
			},
			{
				eyebrow: 'The craft',
				title: 'Forged in Kovai.',
				body: 'Half of India’s pumps and motors start life in this city’s foundries and workshops.'
			},
			{
				eyebrow: 'The gathering',
				title: 'Built on Kongu hospitality.',
				body: 'Business, mental health, honest challenges — over a good filter coffee.'
			},
			{
				eyebrow: 'The network',
				title: 'Trust, in motion.',
				body: 'Leads, referrals and partnerships between people who vouch for each other.'
			},
			{
				eyebrow: 'Your seat',
				title: 'Trust, as old as Perur.',
				body: 'Meet. Learn. Collaborate. Grow. Your seat is waiting.'
			}
		]),
		storyManifest: '/story/coimbatore/manifest.json',
		cover: '/brand/covers/coimbatore.jpg'
	},

	tamilnadu: {
		id: 'tamilnadu',
		subdomain: 'tamilnadu',
		brand: {
			name: 'Tamil Nadu Entrepreneurs Forum',
			short: 'TNEF',
			place: 'Tamil Nadu',
			region: 'Every city across Tamil Nadu',
			tagline: salem.brand.tagline,
			description:
				'A private networking forum for founders, manufacturers and trade leaders across every city of Tamil Nadu.'
		},
		// TODO: secretariat details for Tamil Nadu — the shared secretariat until then.
		contact: salem.contact,
		stats: salem.stats.map((s) =>
			s.label === 'Salem founders' ? { ...s, label: 'Founders in the network' } : s
		),
		statsHeading: 'A private circle of people who build what Tamil Nadu runs on.',
		industries: [
			{ name: 'Automobile & EV', note: 'Chennai, Hosur & Sriperumbudur plants and suppliers' },
			{ name: 'Electronics', note: 'Hosur & Sriperumbudur assembly and components' },
			{ name: 'Textiles', note: 'Tiruppur knitwear, Karur & Erode home textiles' },
			{ name: 'Engineering', note: 'Trichy fabrication & heavy engineering' },
			{ name: 'Ports & logistics', note: 'Thoothukudi, Chennai & Namakkal trucking' },
			{ name: 'Agro & food', note: 'Erode turmeric, Theni spices & delta rice' },
			{ name: 'Technology', note: 'IT services, SaaS & digital studios' }
		],
		industriesNote:
			'Owners, managing directors and founders from Chennai to Kanyakumari, Hosur to Thoothukudi.',
		reasons: reasonsFor(
			'Tamil Nadu',
			'Chapter meets in every major city, and a state conclave every year.'
		),
		vision:
			'To become the most active entrepreneur community in Tamil Nadu — one table for every city.',
		joinHeading: 'Ready to grow your business across Tamil Nadu?',
		eventsIntro: 'Chapter meets, masterclasses and the annual state conclave — across Tamil Nadu.',
		chapters: chapters([
			{
				eyebrow: 'Tamil Nadu',
				title: 'One state. Every industry.',
				body: 'From the delta to the coast, a state of builders wakes up.'
			},
			{
				eyebrow: 'The engine',
				title: 'Cars. Chips. Cloth. Code.',
				body: 'Chennai’s plants, Hosur’s electronics, Tiruppur’s looms — one table.'
			},
			{
				eyebrow: 'The makers',
				title: 'Knitted for the world.',
				body: 'Founders from Madurai to Hosur, Trichy to Thoothukudi.'
			},
			{
				eyebrow: 'The gathering',
				title: 'The merchant’s courtyard.',
				body: 'A tradition of trust as old as Chettinad — and conversations beyond business.'
			},
			{
				eyebrow: 'The tradition',
				title: 'Every dot, connected.',
				body: 'Like a kolam, the forum joins people who would never otherwise meet.'
			},
			{
				eyebrow: 'தமிழ்நாடு',
				title: 'Every city. One table.',
				body: 'Meet. Learn. Collaborate. Grow. Your seat is waiting.'
			}
		]),
		storyManifest: '/story/tamilnadu/manifest.json',
		cover: '/brand/covers/tamilnadu.jpg'
	}
};

export const forumList = FORUM_IDS.map((id) => forums[id]);
