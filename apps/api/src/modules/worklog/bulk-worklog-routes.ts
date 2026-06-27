import { Elysia, t } from 'elysia';
import { authMiddleware } from '../../shared/auth/middleware';
import {
  processBulkCreate,
  processBulkEdit,
  processBulkDelete,
} from './bulk-worklog-service';

const bulkResultItem = t.Object({
  issueId: t.String(),
  issueKey: t.String(),
  hours: t.Number(),
  status: t.Union([t.Literal('success'), t.Literal('failed')]),
  worklogId: t.Optional(t.String()),
  error: t.Optional(t.String()),
  errorCode: t.Optional(
    t.Union([
      t.Literal('SUBTASK'),
      t.Literal('ZERO_DURATION'),
      t.Literal('NETWORK'),
      t.Literal('UNAUTHORIZED'),
      t.Literal('PERMISSION'),
      t.Literal('RATE_LIMIT'),
      t.Literal('UNKNOWN'),
    ]),
  ),
});

const bulkCreateEntry = t.Object({
  issueId: t.String(),
  date: t.String({ format: 'date' }),
  durationSeconds: t.Number({ minimum: 1 }),
  comment: t.Optional(t.String()),
});

const bulkEditEntry = t.Object({
  worklogId: t.String(),
  issueId: t.String(),
});

const bulkEditUpdates = t.Object({
  date: t.Optional(t.String({ format: 'date' })),
  comment: t.Optional(t.String()),
});

const bulkDeleteEntry = t.Object({
  worklogId: t.String(),
  issueId: t.String(),
});

export const bulkWorklogRoutes = new Elysia({ prefix: '/api/bulk' })
  .use(authMiddleware)

  .post(
    '/worklogs',
    async ({ user, body }) => {
      const result = await processBulkCreate(user.id, body.entries);
      return { success: true, message: 'ok', data: result };
    },
    {
      detail: {
        tags: ['Worklogs'],
        summary: 'Bulk create worklogs',
        description:
          'Creates multiple worklogs sequentially. Returns per-item results with aggregated summary.',
      },
      body: t.Object({
        entries: t.Array(bulkCreateEntry),
      }),
      response: {
        200: t.Object({
          success: t.Boolean(),
          message: t.String(),
          data: t.Object({
            total: t.Number(),
            succeeded: t.Number(),
            failed: t.Number(),
            totalHours: t.Number(),
            results: t.Array(bulkResultItem),
          }),
        }),
      },
    },
  )

  .put(
    '/worklogs',
    async ({ user, body }) => {
      const result = await processBulkEdit(
        user.id,
        body.entries,
        body.updates,
      );
      return { success: true, message: 'ok', data: result };
    },
    {
      detail: {
        tags: ['Worklogs'],
        summary: 'Bulk edit worklogs',
        description:
          'Updates date and/or comment on multiple worklogs sequentially. Returns per-item results.',
      },
      body: t.Object({
        entries: t.Array(bulkEditEntry),
        updates: bulkEditUpdates,
      }),
      response: {
        200: t.Object({
          success: t.Boolean(),
          message: t.String(),
          data: t.Object({
            total: t.Number(),
            succeeded: t.Number(),
            failed: t.Number(),
            results: t.Array(bulkResultItem),
          }),
        }),
      },
    },
  )

  .delete(
    '/worklogs',
    async ({ user, body }) => {
      const result = await processBulkDelete(user.id, body.entries);
      return { success: true, message: 'ok', data: result };
    },
    {
      detail: {
        tags: ['Worklogs'],
        summary: 'Bulk delete worklogs',
        description:
          'Deletes multiple worklogs sequentially. Returns per-item results with aggregated total hours deleted.',
      },
      body: t.Object({
        entries: t.Array(bulkDeleteEntry),
      }),
      response: {
        200: t.Object({
          success: t.Boolean(),
          message: t.String(),
          data: t.Object({
            total: t.Number(),
            succeeded: t.Number(),
            failed: t.Number(),
            totalHours: t.Number(),
            results: t.Array(bulkResultItem),
          }),
        }),
      },
    },
  );
