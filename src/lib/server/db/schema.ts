import { pgTable, serial, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';

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
	published: boolean('published').notNull().default(false),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date())
});

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

export * from './auth.schema';
