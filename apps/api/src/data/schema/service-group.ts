import { boolean, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const serviceGroups = pgTable('service_groups', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  color: text('color').default('#6b7280'),
  icon: text('icon'),
  sortOrder: integer('sort_order').default(0),
  collapsed: boolean('collapsed').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
