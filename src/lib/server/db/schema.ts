import {
	pgTable,
	serial,
	text,
	timestamp,
	boolean,
	integer,
	jsonb,
	index
} from 'drizzle-orm/pg-core';
import { user } from './auth.schema';

export const contactMessage = pgTable('contact_message', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	phone: text('phone').notNull(),
	email: text('email').notNull(),
	business: text('business'),
	message: text('message').notNull(),
	handled: boolean('handled').notNull().default(false),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const event = pgTable('event', {
	id: serial('id').primaryKey(),
	slug: text('slug').notNull().unique(),
	title: text('title').notNull(),
	category: text('category').notNull(),
	/** One or two lines for cards on the home page and the events list. */
	summary: text('summary').notNull(),
	/** Full write-up; blank lines separate paragraphs. */
	description: text('description'),
	startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
	endsAt: timestamp('ends_at', { withTimezone: true }),
	venue: text('venue').notNull(),
	address: text('address'),
	mapUrl: text('map_url'),
	price: text('price'),
	seats: integer('seats'),
	/** External sign-up link; when empty, visitors reserve through the secretariat's WhatsApp. */
	registrationUrl: text('registration_url'),
	/** How people sign up: whatsapp (message the secretariat) | link (registrationUrl) | form (ours). */
	registration: text('registration').notNull().default('whatsapp'),
	/** Rupees for a registration through our form; 0 = free. */
	fee: integer('fee').notNull().default(0),
	/** Optional lower fee for signed-in, active members. */
	memberFee: integer('member_fee'),
	registrationClosesAt: timestamp('registration_closes_at', { withTimezone: true }),
	/** The admin-built registration form (see src/lib/forms.ts), beyond name, email and phone. */
	formFields: jsonb('form_fields').notNull().default([]),
	published: boolean('published').notNull().default(false),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date())
});

/** Someone signed up for an event through our registration form. */
export const eventRegistration = pgTable(
	'event_registration',
	{
		id: serial('id').primaryKey(),
		eventId: integer('event_id')
			.notNull()
			.references(() => event.id, { onDelete: 'cascade' }),
		/** Short reference shown to the registrant, e.g. "K7MP4Q". */
		code: text('code').notNull().unique(),
		name: text('name').notNull(),
		email: text('email').notNull(),
		phone: text('phone').notNull(),
		/** Answers to the event's own fields, with the question as it read then: [{ label, value }]. */
		answers: jsonb('answers').notNull().default([]),
		/** Rupees due; 0 for free events. */
		amount: integer('amount').notNull().default(0),
		/** The member who registered, when signed in. */
		userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
		/** pending (payment to verify) | confirmed | rejected */
		status: text('status').notNull().default('pending'),
		note: text('note'),
		reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
		reviewedBy: text('reviewed_by'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('registration_event_idx').on(t.eventId)]
);

/** Kept apart from `event` so listing events never drags image bytes along. */
export const eventCover = pgTable('event_cover', {
	eventId: integer('event_id')
		.primaryKey()
		.references(() => event.id, { onDelete: 'cascade' }),
	mime: text('mime').notNull(),
	/** Base64-encoded image, resized in the browser before upload. */
	data: text('data').notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

/** Admin-editable site content, one JSON document per key (e.g. "membership"). */
export const siteSetting = pgTable('site_setting', {
	key: text('key').primaryKey(),
	value: jsonb('value').notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

// ---- Membership ------------------------------------------------------------

/** Someone asking to join, with the details of the UPI payment they made. */
export const membershipApplication = pgTable('membership_application', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull(),
	phone: text('phone').notNull(),
	business: text('business').notNull(),
	industry: text('industry').notNull(),
	designation: text('designation'),
	city: text('city'),
	website: text('website'),
	about: text('about'),
	referredBy: text('referred_by'),
	/** pending | approved | rejected */
	status: text('status').notNull().default('pending'),
	adminNote: text('admin_note'),
	reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
	reviewedBy: text('reviewed_by'),
	/** The member account created on approval. */
	userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

/** A UPI payment awaiting or past manual verification: a joining fee or a renewal. */
export const payment = pgTable(
	'payment',
	{
		id: serial('id').primaryKey(),
		applicationId: integer('application_id').references(() => membershipApplication.id, {
			onDelete: 'cascade'
		}),
		registrationId: integer('registration_id').references(() => eventRegistration.id, {
			onDelete: 'cascade'
		}),
		userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
		/** joining | renewal | event */
		purpose: text('purpose').notNull(),
		/** Rupees. */
		amount: integer('amount').notNull(),
		/** UPI transaction reference (UTR) the payer entered. */
		utr: text('utr').notNull(),
		/** pending | verified | rejected */
		status: text('status').notNull().default('pending'),
		note: text('note'),
		reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
		reviewedBy: text('reviewed_by'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('payment_user_idx').on(t.userId), index('payment_utr_idx').on(t.utr)]
);

/** Optional payment screenshot, kept apart so payment lists stay light. */
export const paymentProof = pgTable('payment_proof', {
	paymentId: integer('payment_id')
		.primaryKey()
		.references(() => payment.id, { onDelete: 'cascade' }),
	mime: text('mime').notNull(),
	data: text('data').notNull()
});

export const memberProfile = pgTable('member_profile', {
	userId: text('user_id')
		.primaryKey()
		.references(() => user.id, { onDelete: 'cascade' }),
	/** SEF-2026-0001 */
	memberNumber: text('member_number').notNull().unique(),
	phone: text('phone').notNull(),
	business: text('business').notNull(),
	industry: text('industry').notNull(),
	designation: text('designation'),
	city: text('city'),
	website: text('website'),
	about: text('about'),
	/** What the member's business offers. */
	offerings: text('offerings'),
	/** The connections, suppliers or partners the member is looking for. */
	lookingFor: text('looking_for'),
	showInDirectory: boolean('show_in_directory').notNull().default(true),
	joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date())
});

export const memberPhoto = pgTable('member_photo', {
	userId: text('user_id')
		.primaryKey()
		.references(() => user.id, { onDelete: 'cascade' }),
	mime: text('mime').notNull(),
	data: text('data').notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

// ---- Member business activity -------------------------------------------------

/**
 * A "connect": one member passing business to another. Either the giver needs the
 * other member's product or service themselves (`self`), or they refer someone
 * else (`referral`, with that person's contact details).
 */
export const connect = pgTable(
	'connect',
	{
		id: serial('id').primaryKey(),
		fromId: text('from_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		toId: text('to_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		/** self | referral */
		kind: text('kind').notNull(),
		contactName: text('contact_name'),
		contactPhone: text('contact_phone'),
		notes: text('notes'),
		/** new | contacted | converted | not_converted — kept up to date by the receiver. */
		status: text('status').notNull().default('new'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('connect_from_idx').on(t.fromId), index('connect_to_idx').on(t.toId)]
);

/**
 * Business closed between two members, recorded by either side and confirmed by
 * the other. Unanswered records confirm themselves after a week.
 */
export const businessTransaction = pgTable(
	'business_transaction',
	{
		id: serial('id').primaryKey(),
		/** The member who received the business (earned the money). */
		receiverId: text('receiver_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		/** The member the business came from. */
		giverId: text('giver_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		recordedById: text('recorded_by_id').notNull(),
		/** direct (the giver bought themselves) | referral (from someone the giver referred) */
		kind: text('kind').notNull(),
		/** Rupees. */
		amount: integer('amount').notNull(),
		description: text('description'),
		connectId: integer('connect_id').references(() => connect.id, { onDelete: 'set null' }),
		/** pending | confirmed | declined */
		status: text('status').notNull().default('pending'),
		autoConfirmed: boolean('auto_confirmed').notNull().default(false),
		declineReason: text('decline_reason'),
		respondedAt: timestamp('responded_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('txn_receiver_idx').on(t.receiverId), index('txn_giver_idx').on(t.giverId)]
);

export * from './auth.schema';
