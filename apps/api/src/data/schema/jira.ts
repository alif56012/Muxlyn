import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

export const jiraConnections = pgTable(
  'jira_connections',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(),
    jiraUrl: text('jira_url').notNull(),
    jiraAccountId: text('jira_account_id').notNull(),
    displayName: text('display_name'),
    email: text('email'),
    avatarUrl: text('avatar_url'),
    apiTokenEncrypted: text('api_token_encrypted').notNull(),
    isActive: boolean('is_active').default(false),
    status: text('status').default('connected'),
    lastValidatedAt: timestamp('last_validated_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_jira_connections_user_account').on(table.userId, table.jiraAccountId),
    index('idx_jira_connections_user_id').on(table.userId),
    index('idx_jira_connections_active').on(table.userId),
  ],
);
