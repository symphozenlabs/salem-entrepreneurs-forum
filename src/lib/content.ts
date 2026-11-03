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

export const stats = [
	{ value: 150, suffix: '+', label: 'Salem founders' },
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
	{ title: 'Network', body: 'Sit across the table from entrepreneurs and manufacturers from every major Salem industry.' },
	{ title: 'Business', body: 'Warm leads, vetted referrals and supplier contracts — exchanged between people who know each other.' },
	{ title: 'Collaboration', body: 'Find partners, vendors, co-founders and joint-venture allies without cold outreach.' },
	{ title: 'Knowledge', body: 'Learn from industrialists, chartered accountants, technology leaders and exporters.' },
	{ title: 'Events', body: 'Monthly dinners, workshops and masterclasses — from Fairlands to the Yercaud hills.' },
	{ title: 'Trust', body: 'Members vouch for one another, so every introduction starts on credibility and every deal on accountability.' },
	{ title: 'Visibility', body: 'A verified profile, digital member card and directory listing across the region.' },
	{ title: 'Growth', body: 'Raise your valuation, open export doors and scale with the forum behind you.' }
];

export const privileges = [
	{
		n: '01',
		title: 'Digital Member Card',
		body: 'A gold-foiled digital pass with a QR code that links to your verified profile and portfolio.'
	},
	{
		n: '02',
		title: 'Referral Rewards',
		body: 'Earn 10% — ₹500 — for every entrepreneur you bring into the forum.'
	},
	{
		n: '03',
		title: 'Conclave Seating',
		body: 'Complimentary or subsidised seats at conclaves, masterclasses and roundtables.'
	}
];

export const membership = {
	price: '₹5,000',
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

/**
 * Scroll-story chapters. `at` is the scroll progress (0–1) at which the chapter
 * text is fully on screen; frames for the video are mapped to the same progress.
 */
export const chapters = [
	{
		at: 0.04,
		eyebrow: 'Salem, Tamil Nadu',
		title: 'Where the hills meet industry.',
		body: 'Every morning, the Shevaroys watch a city of makers go to work.'
	},
	{
		at: 0.22,
		eyebrow: 'Multiple industries',
		title: 'Looms. Steel. Sago. Code.',
		body: '150+ founders who build what Tamil Nadu runs on.'
	},
	{
		at: 0.4,
		eyebrow: 'The gathering',
		title: 'Built on handshakes.',
		body: 'Once a month, the people behind those businesses sit at the same table.'
	},
	{
		at: 0.58,
		eyebrow: 'The exchange',
		title: 'Knowledge, shared freely.',
		body: 'Exporters, auditors and technologists — answering the questions you can’t google.'
	},
	{
		at: 0.76,
		eyebrow: 'The network',
		title: '₹12 Cr of trust, in motion.',
		body: 'Every referral is a promise between members. The pipeline keeps growing.'
	},
	{
		at: 0.93,
		eyebrow: 'Your seat',
		title: 'Meet. Learn. Collaborate. Grow.',
		body: 'The forum is invite-reviewed and limited. Your seat is waiting.'
	}
];
