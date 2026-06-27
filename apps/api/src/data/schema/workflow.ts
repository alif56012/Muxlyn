import { boolean, jsonb, pgTable, real, text, timestamp } from 'drizzle-orm/pg-core';

export const workflows = pgTable('workflows', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  connectionId: text('connection_id'),
  name: text('name').notNull(),
  description: text('description'),
  args: jsonb('args').$type<Record<string, unknown>>().default({}),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const workflowSteps = pgTable('workflow_steps', {
  id: text('id').primaryKey(),
  workflowId: text('workflow_id').notNull(),
  type: text('type').notNull(),
  label: text('label').notNull(),
  config: jsonb('config').$type<Record<string, unknown>>().default({}),
  positionX: real('position_x').notNull().default(0),
  positionY: real('position_y').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const workflowEdges = pgTable('workflow_edges', {
  id: text('id').primaryKey(),
  workflowId: text('workflow_id').notNull(),
  sourceStepId: text('source_step_id').notNull(),
  sourceHandle: text('source_handle'),
  targetStepId: text('target_step_id').notNull(),
  targetHandle: text('target_handle'),
  label: text('label'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const workflowRuns = pgTable('workflow_runs', {
  id: text('id').primaryKey(),
  workflowId: text('workflow_id').notNull(),
  userId: text('user_id').notNull(),
  status: text('status').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  error: text('error'),
  args: jsonb('args').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
