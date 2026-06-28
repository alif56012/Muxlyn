import { Elysia, t } from 'elysia';
import { authMiddleware } from '../../shared/auth/middleware';
import { buildMonthlyReport, listFields, reportToCsv } from './report-service';

export const reportRoutes = new Elysia({ prefix: '/api/worklog/reports' })
  .use(authMiddleware)

  // GET /fields — list Jira custom fields
  .get(
    '/fields',
    async ({ user }) => {
      const fields = await listFields(user.id);
      return { success: true, message: 'ok', data: { fields } };
    },
    {
      detail: {
        tags: ['Reports'],
        summary: 'List Jira custom epics',
        description: 'Returns all custom fields available in Jira, useful for report customization.',
      },
      response: {
        200: t.Object({
          success: t.Boolean(),
          message: t.String(),
          data: t.Object({
            fields: t.Array(
              t.Object({
                id: t.String(),
                name: t.String(),
                custom: t.Boolean(),
                schema: t.Optional(t.Record(t.String(), t.Unknown())),
              }),
            ),
          }),
        }),
      },
    },
  )

  // POST /monthly — my worklogs grouped by epic
  .post(
    '/monthly',
    async ({ user, body, query }) => {
      const report = await buildMonthlyReport(user.id, {
        startDate: body.startDate,
        endDate: body.endDate,
        customFields: body.customFields,
        onlyMyWorklogs: true,
      });

      if (query?.format === 'csv') {
        return new Response(reportToCsv(report), {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="my-epics-report-${body.startDate}-${body.endDate}.csv"`,
          },
        });
      }

      return { success: true, message: 'ok', data: report };
    },
    {
      detail: {
        tags: ['Reports'],
        summary: 'Monthly worklog report (my worklogs)',
        description:
          'Groups all your worklogs in the date range by Epic. Use ?format=csv for CSV download.',
      },
      query: t.Optional(
        t.Object({
          format: t.Optional(t.String({ enum: ['csv'] })),
        }),
      ),
      body: t.Object({
        startDate: t.String({ format: 'date' }),
        endDate: t.String({ format: 'date' }),
        customFields: t.Optional(t.Array(t.String())),
        onlyMyWorklogs: t.Optional(t.Boolean()),
      }),
    },
  )

  // POST /monthly-by-project
  .post(
    '/monthly-by-project',
    async ({ user, body, query }) => {
      const report = await buildMonthlyReport(user.id, {
        startDate: body.startDate,
        endDate: body.endDate,
        projectKey: body.projectKey,
        customFields: body.customFields,
        onlyMyWorklogs: body.onlyMyWorklogs,
      });

      if (query?.format === 'csv') {
        return new Response(reportToCsv(report), {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="project-report-${body.projectKey}-${body.startDate}-${body.endDate}.csv"`,
          },
        });
      }

      return { success: true, message: 'ok', data: report };
    },
    {
      detail: {
        tags: ['Reports'],
        summary: 'Monthly report by project',
        description:
          'Group worklogs by Epic within a specific project. Use ?format=csv for CSV download.',
      },
      query: t.Optional(
        t.Object({
          format: t.Optional(t.String({ enum: ['csv'] })),
        }),
      ),
      body: t.Object({
        projectKey: t.String(),
        startDate: t.String({ format: 'date' }),
        endDate: t.String({ format: 'date' }),
        customFields: t.Optional(t.Array(t.String())),
        onlyMyWorklogs: t.Optional(t.Boolean()),
      }),
    },
  )

  // POST /monthly-by-board
  .post(
    '/monthly-by-board',
    async ({ user, body, query }) => {
      const report = await buildMonthlyReport(user.id, {
        startDate: body.startDate,
        endDate: body.endDate,
        boardId: body.boardId,
        customFields: body.customFields,
        onlyMyWorklogs: body.onlyMyWorklogs,
      });

      if (query?.format === 'csv') {
        return new Response(reportToCsv(report), {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="board-report-${body.boardId}-${body.startDate}-${body.endDate}.csv"`,
          },
        });
      }

      return { success: true, message: 'ok', data: report };
    },
    {
      detail: {
        tags: ['Reports'],
        summary: 'Monthly report by board',
        description:
          'Group worklogs by Epic within a specific Jira board. Use ?format=csv for CSV download.',
      },
      query: t.Optional(
        t.Object({
          format: t.Optional(t.String({ enum: ['csv'] })),
        }),
      ),
      body: t.Object({
        boardId: t.String(),
        startDate: t.String({ format: 'date' }),
        endDate: t.String({ format: 'date' }),
        customFields: t.Optional(t.Array(t.String())),
        onlyMyWorklogs: t.Optional(t.Boolean()),
      }),
    },
  )

  // POST /monthly-by-epic
  .post(
    '/monthly-by-epic',
    async ({ user, body, query }) => {
      const report = await buildMonthlyReport(user.id, {
        startDate: body.startDate,
        endDate: body.endDate,
        epicKey: body.epicKey,
        customFields: body.customFields,
        onlyMyWorklogs: body.onlyMyWorklogs,
      });

      if (query?.format === 'csv') {
        return new Response(reportToCsv(report), {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="epic-report-${body.epicKey}-${body.startDate}-${body.endDate}.csv"`,
          },
        });
      }

      return { success: true, message: 'ok', data: report };
    },
    {
      detail: {
        tags: ['Reports'],
        summary: 'Monthly report by epic',
        description:
          'Detailed worklog breakdown for a single epic. Use ?format=csv for CSV download.',
      },
      query: t.Optional(
        t.Object({
          format: t.Optional(t.String({ enum: ['csv'] })),
        }),
      ),
      body: t.Object({
        epicKey: t.String(),
        startDate: t.String({ format: 'date' }),
        endDate: t.String({ format: 'date' }),
        customFields: t.Optional(t.Array(t.String())),
        onlyMyWorklogs: t.Optional(t.Boolean()),
      }),
    },
  );
