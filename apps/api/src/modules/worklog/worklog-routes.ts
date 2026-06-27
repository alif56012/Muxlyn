import { Elysia, t } from 'elysia';
import { authMiddleware } from '../../shared/auth/middleware';
import { JiraInvalidTokenError, ValidationError } from '../../shared/errors';
import {
  getActiveJiraConnection,
  getJiraIssue,
  createJiraWorklog,
  getJiraWorklog,
  updateJiraWorklog,
  deleteJiraWorklog,
} from './jira-worklog-client';
import { searchWorklogs, searchIssues } from './worklog-search-service';

export const worklogRoutes = new Elysia({ prefix: '/api' })
  .use(authMiddleware)

  .post(
    '/worklogs',
    async ({ user, body, set }) => {
      const connection = await getActiveJiraConnection(user.id);

      const issue = await getJiraIssue(connection, body.issueId);

      if (issue.isSubtask) {
        throw new ValidationError(
          'Cannot log work on sub-tasks. Please select a parent issue.',
          { code: 'SUBTASK' },
        );
      }

      if (body.durationSeconds <= 0) {
        throw new ValidationError(
          'Duration must be greater than 0.',
          { code: 'ZERO_DURATION' },
        );
      }

      const started = `${body.date}T00:00:00.000+0000`;

      const worklog = await createJiraWorklog(
        connection,
        body.issueId,
        {
          timeSpentSeconds: body.durationSeconds,
          started,
          comment: body.comment,
        },
      );

      const hours =
        Math.round((worklog.timeSpentSeconds / 3600) * 100) / 100;

      set.status = 201;
      return {
        success: true,
        message: `Logged ${hours}h on ${issue.key}`,
        data: {
          worklogId: worklog.id,
          issueId: body.issueId,
          issueKey: issue.key,
          hours,
          date: body.date,
          comment: body.comment,
        },
      };
    },
    {
      detail: {
        tags: ['Worklogs'],
        summary: 'Create a worklog',
        description:
          'Creates a single worklog on a Jira issue. Validates the issue is not a sub-task.',
      },
      body: t.Object({
        issueId: t.String(),
        date: t.String({ format: 'date' }),
        durationSeconds: t.Number({ minimum: 1 }),
        comment: t.Optional(t.String()),
      }),
      response: {
        201: t.Object({
          success: t.Boolean(),
          message: t.String(),
          data: t.Object({
            worklogId: t.String(),
            issueId: t.String(),
            issueKey: t.String(),
            hours: t.Number(),
            date: t.String(),
            comment: t.Optional(t.String()),
          }),
        }),
        400: t.Object({
          success: t.Boolean(),
          message: t.String(),
          error: t.Object({
            code: t.String(),
            details: t.Optional(t.Record(t.String(), t.Unknown())),
          }),
        }),
      },
    },
  )

  .get(
    '/worklogs/:worklogId',
    async ({ user, params, query }) => {
      const connection = await getActiveJiraConnection(user.id);

      if (!query.issueId) {
        throw new ValidationError('issueId query parameter is required.');
      }

      const worklog = await getJiraWorklog(
        connection,
        query.issueId,
        params.worklogId,
      );

      const hours =
        Math.round((worklog.timeSpentSeconds / 3600) * 100) / 100;

      return {
        success: true,
        message: 'ok',
        data: {
          worklogId: worklog.id,
          issueId: worklog.issueId,
          timeSpentSeconds: worklog.timeSpentSeconds,
          started: worklog.started,
          hours,
          comment: worklog.comment,
        },
      };
    },
    {
      detail: {
        tags: ['Worklogs'],
        summary: 'Get a worklog',
        description:
          'Fetches a single worklog by its Jira ID. Requires issueId query param.',
      },
      query: t.Object({
        issueId: t.String(),
      }),
      response: {
        200: t.Object({
          success: t.Boolean(),
          message: t.String(),
          data: t.Object({
            worklogId: t.String(),
            issueId: t.String(),
            timeSpentSeconds: t.Number(),
            started: t.String(),
            hours: t.Number(),
            comment: t.Optional(t.String()),
          }),
        }),
      },
    },
  )

  .put(
    '/worklogs/:worklogId',
    async ({ user, params, body, query }) => {
      const connection = await getActiveJiraConnection(user.id);

      if (!query.issueId) {
        throw new ValidationError('issueId query parameter is required.');
      }

      const existing = await getJiraWorklog(
        connection,
        query.issueId,
        params.worklogId,
      );

      if (body.durationSeconds !== undefined && body.durationSeconds <= 0) {
        throw new ValidationError('Duration must be greater than 0.');
      }

      const updated = await updateJiraWorklog(
        connection,
        query.issueId,
        params.worklogId,
        {
          timeSpentSeconds: body.durationSeconds ?? existing.timeSpentSeconds,
          started:
            body.started ??
            (body.date ? `${body.date}T00:00:00.000+0000` : existing.started),
          comment:
            body.comment !== undefined ? body.comment : existing.comment,
        },
      );

      const hours =
        Math.round((updated.timeSpentSeconds / 3600) * 100) / 100;

      return {
        success: true,
        message: `Worklog updated (${hours}h)`,
        data: {
          worklogId: updated.id,
          issueId: query.issueId,
          hours,
        },
      };
    },
    {
      detail: {
        tags: ['Worklogs'],
        summary: 'Update a worklog',
        description:
          'Updates date, duration, and/or comment on an existing worklog.',
      },
      query: t.Object({
        issueId: t.String(),
      }),
      body: t.Object({
        date: t.Optional(t.String({ format: 'date' })),
        started: t.Optional(t.String()),
        durationSeconds: t.Optional(t.Number({ minimum: 1 })),
        comment: t.Optional(t.String()),
      }),
      response: {
        200: t.Object({
          success: t.Boolean(),
          message: t.String(),
          data: t.Object({
            worklogId: t.String(),
            issueId: t.String(),
            hours: t.Number(),
          }),
        }),
      },
    },
  )

  .delete(
    '/worklogs/:worklogId',
    async ({ user, params, query, set }) => {
      const connection = await getActiveJiraConnection(user.id);

      if (!query.issueId) {
        throw new ValidationError('issueId query parameter is required.');
      }

      await deleteJiraWorklog(
        connection,
        query.issueId,
        params.worklogId,
      );

      set.status = 204;
      return null;
    },
    {
      detail: {
        tags: ['Worklogs'],
        summary: 'Delete a worklog',
        description: 'Permanently deletes a worklog from Jira.',
      },
      query: t.Object({
        issueId: t.String(),
      }),
      response: {
        204: t.Void(),
      },
    },
  )

  .post(
    '/worklogs/search',
    async ({ user, body }) => {
      const result = await searchWorklogs(
        user.id,
        body,
        body.page ?? 1,
        body.pageSize ?? 50,
      );
      return { success: true, message: 'ok', data: result };
    },
    {
      detail: {
        tags: ['Worklogs'],
        summary: 'Search worklog history',
        description:
          'Search worklogs across issues with JQL filters. Returns paginated results with total hours.',
      },
      body: t.Object({
        project: t.Optional(t.String()),
        assignee: t.Optional(t.String()),
        status: t.Optional(t.String()),
        freeText: t.Optional(t.String()),
        dateFrom: t.Optional(t.String({ format: 'date' })),
        dateTo: t.Optional(t.String({ format: 'date' })),
        page: t.Optional(t.Number({ minimum: 1 })),
        pageSize: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
      }),
    },
  )

  .post(
    '/issues/search',
    async ({ user, body }) => {
      const result = await searchIssues(
        user.id,
        body,
        body.page ?? 1,
        body.pageSize ?? 50,
      );
      return { success: true, message: 'ok', data: result };
    },
    {
      detail: {
        tags: ['Worklogs'],
        summary: 'Search Jira issues',
        description:
          'Search issues by project, assignee, status, or free text. Used for task selection before logging work.',
      },
      body: t.Object({
        project: t.Optional(t.String()),
        assignee: t.Optional(t.String()),
        status: t.Optional(t.String()),
        freeText: t.Optional(t.String()),
        page: t.Optional(t.Number({ minimum: 1 })),
        pageSize: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
      }),
    },
  )

  .get(
    '/issues/:issueId',
    async ({ user, params }) => {
      const connection = await getActiveJiraConnection(user.id);

      const issue = await getJiraIssue(connection, params.issueId);

      return {
        success: true,
        message: 'ok',
        data: {
          id: issue.id,
          key: issue.key,
          isSubtask: issue.isSubtask,
          summary: issue.summary,
        },
      };
    },
    {
      detail: {
        tags: ['Worklogs'],
        summary: 'Get Jira issue info',
        description:
          'Returns issue key, summary, and subtask status for validation.',
      },
      response: {
        200: t.Object({
          success: t.Boolean(),
          message: t.String(),
          data: t.Object({
            id: t.String(),
            key: t.String(),
            isSubtask: t.Boolean(),
            summary: t.String(),
          }),
        }),
      },
    },
  );


