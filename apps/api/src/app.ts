import { Elysia } from 'elysia';
import { registerDependencies } from './config/di-container';
import { plugins } from './config/plugins';
import { healthModule } from './modules/health';
import { authHandler } from './shared/auth/handler';
import { errorMiddleware } from './shared/errors/middleware';

registerDependencies();

export const app = new Elysia()
  .use(plugins)
  .use(errorMiddleware)
  .use(authHandler)
  .use(healthModule)
  .all('*', ({ set }) => {
    set.status = 404;
    return {
      success: false,
      message: 'Route not found',
      error: { code: 'NOT_FOUND' },
    };
  });
