import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const serviceCredentials = pgTable('service_credentials', {
  id: text('id').primaryKey(),
  connectionId: text('connection_id').notNull(),
  userId: text('user_id').notNull(),
  keyName: text('key_name').notNull(),
  encryptedValue: text('encrypted_value').notNull(),
  iv: text('iv').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const serviceActivityLog = pgTable('service_activity_log', {
  id: text('id').primaryKey(),
  connectionId: text('connection_id').notNull(),
  userId: text('user_id').notNull(),
  action: text('action').notNull(),
  detail: text('detail'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
