// Public marketing copy for the Salem Entrepreneurs Forum site.
// Carried over from the original site; the "About" block was dropped at the client's request.

export const brand = {
	name: 'Salem Entrepreneurs Forum',
	short: 'SEF',
	tagline: ['Meet.', 'Learn.', 'Collaborate.', 'Grow.'],
	description:
		'A private networking forum for founders, manufacturers and trade leaders across Salem and the Kongu region.'
};

export const contact = {
	address: ['4th Floor, Apex Business Center', 'Fairlands Main Road', 'Salem 636016, Tamil Nadu'],
	phone: '+91 98427 88990',
	phoneHref: 'tel:+919842788990',
	whatsapp: 'https://wa.me/919842788990',
	email: 'connect@salementrepreneursclub.com'
};

export const nav = [
	{ label: 'Story', href: '/#story' },
	{ label: 'Why SEF', href: '/#why' },
	{ label: 'Membership', href: '/#membership' },
	{ label: 'Events', href: '/events' },
	{ label: 'Contact', href: '/#contact' }
];

/** Salem's highlights: a counted figure, or a short line of text. */
export const stats = [
	{ value: 150, suffix: '+', label: 'Entrepreneurs & Business Leaders' },
	{ text: 'Business Collaborations & Travel Experience' },
	{ text: 'Monthly Casual meets & Sports Activities' },
	{ text: 'Better Learning & Business Growth' }
];

/** The whole network's figures, shown by the Coimbatore and Tamil Nadu forums for now. */
export const networkStats = [
	{ value: 150, suffix: '+', label: 'Founders in the network' },
	{ value: 12, prefix: '₹', suffix: ' Cr+', label: 'Referral pipeline' },
	{ value: 35, suffix: '+', label: 'Conclaves & meets' },
	{ value: 98, suffix: '%', label: 'Member retention' }
];

export const industries = [
	{ name: 'Textiles', note: 'Looms, dyeing & handloom exporters' },
	{ name: 'Steel', note: 'Rolling mills, fabrication & foundries' },
	{ name: 'Sago', note: 'Tapioca processors of the Sagoserve belt' },
	{ name: 'Technology', note: 'IT services, SaaS & digital studios' },
	{ name: 'Healthcare', note: 'Hospitals, diagnostics & pharma' },
	{ name: 'Infrastructure', note: 'Builders, realty & logistics' },
	{ name: 'Jewellery', note: 'Gold & silver smiths, makers & showrooms' }
];

export const reasons = [
	{
		title: 'Network',
		body: 'Sit across the table from entrepreneurs and manufacturers from every major Salem industry.'
	},
	{
		title: 'Business',
		body: 'Warm leads, vetted referrals and supplier contracts — exchanged between people who know each other.'
	},
	{
		title: 'Collaboration',
		body: 'Find partners, vendors, co-founders and joint-venture allies without cold outreach.'
	},
	{
		title: 'Knowledge',
		body: 'Learn from industrialists, chartered accountants, technology leaders and exporters.'
	},
	{
		title: 'Events',
		body: 'Monthly dinners, workshops and masterclasses — from Fairlands to the Yercaud hills.'
	},
	{
		title: 'Trust',
		body: 'Members vouch for one another, so every introduction starts on credibility and every deal on accountability.'
	},
	{
		title: 'Visibility',
		body: 'A verified profile, digital member card and directory listing across the region.'
	},
	{
		title: 'Growth',
		body: 'Raise your valuation, open export doors and scale with the forum behind you.'
	}
];

/** Membership card defaults; the fee, period, list and note are editable in the admin. */
export type Membership = {
	/** Annual fee in rupees. */
	fee: number;
	period: string;
	includes: string[];
	note: string;
};

export const defaultMembership: Membership = {
	fee: 5000,
	period: '12 months',
	includes: [
		'Verified member credentials',
		'Digital member pass with QR',
		'Seating at monthly conclaves',
		'10% reward on peer referrals',
		'Listing in the member directory'
	],
	note: 'Applications are reviewed by the secretariat within 24 business hours.'
};

/** Members earn this share of the fee for each entrepreneur they refer. */
export const REFERRAL_PERCENT = 10;

/** ₹5,000 · ₹1,00,000 (Indian digit grouping). */
export const rupees = (n: number) => '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

export const privileges = (m: Membership) => [
	{
		n: '01',
		title: 'Digital Member Card',
		body: 'A gold-foiled digital pass with a QR code that links to your verified profile and portfolio.'
	},
	{
		n: '02',
		title: 'Referral Rewards',
		body: `Earn ${REFERRAL_PERCENT}% — ${rupees(Math.round((m.fee * REFERRAL_PERCENT) / 100))} — for every entrepreneur you bring into the forum.`
	},
	{
		n: '03',
		title: 'Conclave Seating',
		body: 'Complimentary or subsidised seats at conclaves, masterclasses and roundtables.'
	}
];

/**
 * Scroll-story chapters. `at` is the scroll progress (0–1) at which the chapter
 * text is fully on screen; frames for the video are mapped to the same progress.
 */
export const chapters = [
	{
		at: 0.04,
		eyebrow: 'Salem, Tamil Nadu',
		title: 'Where the Hills Meet Industry!',
		body: 'Salem – A city of Opportunities, Entrepreneurs, and growing Business.',
		tagline: '🤝 Networking. Business Talks. Travel. Public Branding.'
	},
	{
		at: 0.22,
		eyebrow: 'Multiple industries',
		title: 'Looms. Steel. Sago. Code.',
		body: 'From traditional looms 🧵 to modern technology, Tamil Nadu thrives on diverse industries and entrepreneurial spirit.',
		tagline:
			'Celebrating 150+ founders shaping industries, creating opportunities, and driving growth.'
	},
	{
		at: 0.4,
		eyebrow: 'The gathering',
		title: 'We talk more than Business.',
		body: 'Collaborations, Sports, Mental Healing Programs, Business Retreat & Travel Experiences.'
	},
	{
		at: 0.58,
		eyebrow: 'The exchange',
		title: 'Knowledge, shared freely.',
		body: 'Interact with like-minded people who never judge.'
	},
	{
		at: 0.76,
		eyebrow: 'The network',
		title: '150+ Members in Salem.',
		body: 'Exclusive Branding & Marketing Support for each Member, both online and offline.'
	},
	{
		at: 0.93,
		eyebrow: 'Your seat',
		title: 'Meet. Learn. Collaborate. Grow.',
		body: 'Surround yourself with like-minded entrepreneurs, build meaningful connections, exchange ideas, and unlock new business opportunities.',
		tagline:
			'Salem Entrepreneurs Forum – Where the right connections create the next big opportunities.'
	}
];
