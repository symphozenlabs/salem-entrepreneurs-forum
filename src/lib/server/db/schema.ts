import { pgTable, serial, text, timestamp, boolean } from 'drizzle-orm/pg-core';

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

export * from './auth.schema';
