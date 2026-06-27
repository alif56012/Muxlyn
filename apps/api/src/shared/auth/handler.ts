import { Elysia } from 'elysia';
import { UnauthorizedError } from '../errors';
import { auth } from './auth';

export const authHandler = new Elysia()
  .all('/auth/api/*', ({ request }) => auth.handler(request))
  .get('/api/auth/me', async ({ request }) => {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      throw new UnauthorizedError();
    }

    return {
      success: true,
      message: 'ok',
      data: {
        user: session.user,
        session: {
          id: session.session.id,
          expiresAt: session.session.expiresAt,
        },
      },
    };
  });
