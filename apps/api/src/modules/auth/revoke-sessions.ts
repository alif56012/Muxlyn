import { sql } from 'drizzle-orm';
import { Elysia, t } from 'elysia';
import { db } from '../../data/postgres';
import { auth } from '../../shared/auth/auth';
import { authMiddleware } from '../../shared/auth/middleware';

export const revokeSessionsRoute = new Elysia({ prefix: '/api/auth' }).use(authMiddleware).post(
  '/revoke-sessions',
  async ({ session, request, user }) => {
    const result = await db.execute(
      sql`SELECT token FROM "session" WHERE "userId" = ${user.id} AND "expiresAt" > NOW()`,
    );

    const sessions = result.rows as { token: string }[];

    for (const s of sessions) {
      await auth.api.revokeSession({
        body: { token: s.token },
        headers: request.headers,
      });
    }

    return {
      success: true,
      message: `Revoked ${sessions.length} session(s)`,
    };
  },
  {
    detail: {
      tags: ['Custom Auth'],
      summary: 'Revoke all sessions',
      description: 'Revokes all active sessions for the current user across all devices.',
    },
    response: {
      200: t.Object({
        success: t.Boolean(),
        message: t.String(),
      }),
      401: t.Object({
        success: t.Boolean(),
        message: t.String(),
        error: t.Object({ code: t.String() }),
      }),
    },
  },
);
