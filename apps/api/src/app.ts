import { swagger } from '@elysiajs/swagger';
import { Elysia } from 'elysia';
import { registerDependencies } from './config/di-container';
import { plugins } from './config/plugins';
import { rememberMeRoutes, revokeSessionsRoute } from './modules/auth';
import { healthModule } from './modules/health';
import { jiraRoutes } from './modules/jira/jira-routes';
import { serviceConnectionsRoutes } from './modules/service-connections';
import { serviceAdvancedRoutes } from './modules/service-connections/service-advanced-routes';
import { serviceGroupsRoutes } from './modules/service-groups/service-groups-routes';
import { workflowRoutes } from './modules/workflows/workflow-routes';
import { bulkWorklogRoutes, worklogRoutes } from './modules/worklog';
import { authHandler } from './shared/auth/handler';
import { AuthOpenAPI } from './shared/auth/openapi';
import { errorMiddleware } from './shared/errors/middleware';

registerDependencies();

const [betterAuthPaths, betterAuthComponents] = await Promise.all([
  AuthOpenAPI.getPaths(),
  AuthOpenAPI.getComponents(),
]);

export const app = new Elysia()
  .use(
    swagger({
      path: '/docs',
      documentation: {
        info: {
          title: 'Muxlyn API',
          version: '1.0.0',
          description: 'Muxlyn — Jira Worklog Automation Platform',
        },
        tags: [
          { name: 'Custom Auth', description: 'Session management and remember-me' },
          {
            name: 'Better Auth',
            description: 'Built-in auth endpoints (OAuth, email/password, sessions)',
          },
          { name: 'Jira', description: 'Jira account connection management' },
          { name: 'Service Connections', description: 'Generalized external service connection management' },
          { name: 'Service Groups', description: 'Service group management' },
          { name: 'Workflows', description: 'Workflow engine — design, run, and monitor workflows' },
          { name: 'Worklogs', description: 'Jira worklog management — bulk create, edit, and delete' },
          { name: 'Health', description: 'Health check' },
        ],
        paths: betterAuthPaths,
        components: betterAuthComponents,
      } as Record<string, unknown>,
    }),
  )
  .use(plugins)
  .use(errorMiddleware)
  .use(authHandler)
  .use(rememberMeRoutes)
  .use(revokeSessionsRoute)
  .use(jiraRoutes)
  .use(serviceConnectionsRoutes)
  .use(serviceAdvancedRoutes)
  .use(serviceGroupsRoutes)
  .use(workflowRoutes)
  .use(bulkWorklogRoutes)
  .use(worklogRoutes)
  .use(healthModule)
  .all('*', ({ set }) => {
    set.status = 404;
    return {
      success: false,
      message: 'Route not found',
      error: { code: 'NOT_FOUND' },
    };
  });
