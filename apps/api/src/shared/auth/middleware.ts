import { Elysia } from 'elysia';
import { SessionExpiredError, UnauthorizedError } from '../errors';
import { auth } from './auth';

export const authMiddleware = new Elysia().derive({ as: 'scoped' }, async ({ request }) => {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    throw new UnauthorizedError();
  }

  const now = new Date();
  if (session.session.expiresAt < now) {
    throw new SessionExpiredError();
  }

  return {
    user: session.user,
    session: session.session,
  };
});
