import { boolean, integer, jsonb, pgTable, text, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';

export const serviceConnections = pgTable(
  'service_connections',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    serviceType: text('service_type').notNull(),
    displayName: text('display_name').notNull(),
    url: text('url'),
    encryptedToken: text('encrypted_token').notNull(),
    status: text('status').notNull().default('active'),
    tags: jsonb('tags').$type<string[]>().default([]),
    description: text('description'),
    pinned: boolean('pinned').default(false),
    sortOrder: integer('sort_order').default(0),
    groupId: text('group_id'),
    healthEnabled: boolean('health_enabled').default(false),
    healthInterval: integer('health_interval').default(300),
    healthStatus: text('health_status'),
    healthLastChecked: timestamp('health_last_checked', { withTimezone: true }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_service_connections_user_service_url').on(
      table.userId,
      table.serviceType,
      table.url,
    ),
    index('idx_service_connections_user_type').on(table.userId, table.serviceType),
    index('idx_service_connections_user_active').on(table.userId, table.isActive),
  ],
);
