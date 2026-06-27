import { and, eq } from 'drizzle-orm';
import { Elysia, t } from 'elysia';
import { getEnv } from '../../config/env';
import { db } from '../../data/postgres';
import { serviceConnections } from '../../data/schema';
import { authMiddleware } from '../../shared/auth/middleware';
import { NotFoundError } from '../../shared/errors';
import { encryptToken, validateServiceType } from './service-connections-service';

const env = getEnv();

const connectionSchema = t.Object({
  id: t.String({ examples: ['01J...'] }),
  service_type: t.String({ examples: ['jira'] }),
  display_name: t.String({ examples: ['nipas@company.atlassian.net'] }),
  url: t.Nullable(t.String({ examples: ['https://company.atlassian.net'] })),
  status: t.String({ examples: ['active'] }),
  metadata: t.Record(t.String(), t.Unknown()),
  is_active: t.Boolean({ examples: [true] }),
});

const connectionWithTimestamps = t.Object({
  ...connectionSchema.properties,
  created_at: t.String({ examples: ['2026-06-27T10:00:00.000Z'] }),
  updated_at: t.String({ examples: ['2026-06-27T10:00:00.000Z'] }),
});

const successResponse = <T extends ReturnType<typeof t.Object>>(dataSchema: T) =>
  t.Object({
    success: t.Boolean({ examples: [true] }),
    message: t.String({ examples: ['ok'] }),
    data: dataSchema,
  });

const errorResponse = t.Object({
  success: t.Boolean({ examples: [false] }),
  message: t.String({ examples: ['Error description'] }),
  error: t.Object({
    code: t.String({ examples: ['ERROR_CODE'] }),
    details: t.Optional(t.Record(t.String(), t.Unknown())),
  }),
});

function toApiConnection(c: {
  id: string;
  userId: string;
  serviceType: string;
  displayName: string;
  url: string | null;
  status: string;
  metadata: Record<string, unknown> | null;
  isActive: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
}) {
  return {
    id: c.id,
    service_type: c.serviceType,
    display_name: c.displayName,
    url: c.url,
    status: c.status,
    metadata: c.metadata ?? {},
    is_active: c.isActive,
    created_at: (c.createdAt ?? new Date()).toISOString(),
    updated_at: (c.updatedAt ?? new Date()).toISOString(),
  };
}

export const serviceConnectionsRoutes = new Elysia({ prefix: '/api/service-connections' })
  .use(authMiddleware)

  .get(
    '/',
    async ({ user }) => {
      const connections = await db
        .select()
        .from(serviceConnections)
        .where(eq(serviceConnections.userId, user.id))
        .orderBy(serviceConnections.createdAt);

      return {
        success: true,
        message: 'ok',
        data: { connections: connections.map(toApiConnection) },
      };
    },
    {
      detail: {
        tags: ['Service Connections'],
        summary: 'List service connections',
        description: 'Returns all service connections for the authenticated user.',
      },
      response: {
        200: successResponse(
          t.Object({ connections: t.Array(connectionWithTimestamps) }),
        ),
        401: errorResponse,
      },
    },
  )

  .post(
    '/',
    async ({ body, user, set }) => {
      validateServiceType(body.service_type);

      const existing = await db
        .select({ id: serviceConnections.id })
        .from(serviceConnections)
        .where(
          and(
            eq(serviceConnections.userId, user.id),
            eq(serviceConnections.serviceType, body.service_type),
          ),
        )
        .limit(1);

      const isFirst = existing.length === 0;

      const encrypted = await encryptToken(body.token, env.ENCRYPTION_KEY);

      const [connection] = await db
        .insert(serviceConnections)
        .values({
          id: crypto.randomUUID(),
          userId: user.id,
          serviceType: body.service_type,
          displayName: body.display_name,
          url: body.url ?? null,
          encryptedToken: encrypted,
          status: 'active',
          metadata: body.metadata ?? {},
          isActive: isFirst,
        })
        .returning();

      set.status = 201;
      return {
        success: true,
        message: 'Service connection created',
        data: { connection: toApiConnection(connection) },
      };
    },
    {
      detail: {
        tags: ['Service Connections'],
        summary: 'Create a service connection',
        description:
          'Creates a new service connection. The token is encrypted before storage.',
      },
      body: t.Object({
        service_type: t.String({ examples: ['jira'] }),
        display_name: t.String({ examples: ['nipas@company.atlassian.net'] }),
        token: t.String({ examples: ['ATATT3...'] }),
        url: t.Optional(t.String({ examples: ['https://company.atlassian.net'] })),
        metadata: t.Optional(t.Record(t.String(), t.Unknown())),
      }),
      response: {
        201: successResponse(t.Object({ connection: connectionWithTimestamps })),
        400: errorResponse,
        401: errorResponse,
      },
    },
  )

  .put(
    '/:id',
    async ({ params, body, user }) => {
      const [existing] = await db
        .select()
        .from(serviceConnections)
        .where(
          and(
            eq(serviceConnections.id, params.id),
            eq(serviceConnections.userId, user.id),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new NotFoundError();
      }

      const updateData: Record<string, unknown> = { updatedAt: new Date() };

      if (body.display_name !== undefined) {
        updateData.displayName = body.display_name;
      }
      if (body.token !== undefined) {
        updateData.encryptedToken = await encryptToken(body.token, env.ENCRYPTION_KEY);
      }
      if (body.url !== undefined) {
        updateData.url = body.url;
      }
      if (body.metadata !== undefined) {
        updateData.metadata = body.metadata;
      }

      const [updated] = await db
        .update(serviceConnections)
        .set(updateData)
        .where(eq(serviceConnections.id, params.id))
        .returning();

      return {
        success: true,
        message: 'Service connection updated',
        data: { connection: toApiConnection(updated) },
      };
    },
    {
      detail: {
        tags: ['Service Connections'],
        summary: 'Update a service connection',
        description: 'Updates display name, token, URL, or metadata.',
      },
      body: t.Object({
        display_name: t.Optional(t.String()),
        token: t.Optional(t.String()),
        url: t.Optional(t.Nullable(t.String())),
        metadata: t.Optional(t.Record(t.String(), t.Unknown())),
      }),
      response: {
        200: successResponse(t.Object({ connection: connectionWithTimestamps })),
        400: errorResponse,
        401: errorResponse,
        404: errorResponse,
      },
    },
  )

  .delete(
    '/:id',
    async ({ params, user, set }) => {
      const [existing] = await db
        .select()
        .from(serviceConnections)
        .where(
          and(
            eq(serviceConnections.id, params.id),
            eq(serviceConnections.userId, user.id),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new NotFoundError();
      }

      await db.delete(serviceConnections).where(eq(serviceConnections.id, params.id));

      if (existing.isActive) {
        const [nextActive] = await db
          .select()
          .from(serviceConnections)
          .where(
            and(
              eq(serviceConnections.userId, user.id),
              eq(serviceConnections.serviceType, existing.serviceType),
            ),
          )
          .orderBy(serviceConnections.createdAt)
          .limit(1);

        if (nextActive) {
          await db
            .update(serviceConnections)
            .set({ isActive: true, updatedAt: new Date() })
            .where(eq(serviceConnections.id, nextActive.id));
        }
      }

      set.status = 204;
      return null;
    },
    {
      detail: {
        tags: ['Service Connections'],
        summary: 'Delete a service connection',
        description: 'Removes the connection. If it was active, activates the next one.',
      },
      response: {
        204: t.Void(),
        401: errorResponse,
        404: errorResponse,
      },
    },
  )

  .post(
    '/:id/set-active',
    async ({ params, user }) => {
      const [existing] = await db
        .select()
        .from(serviceConnections)
        .where(
          and(
            eq(serviceConnections.id, params.id),
            eq(serviceConnections.userId, user.id),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new NotFoundError();
      }

      await db.transaction(async (tx) => {
        await tx
          .update(serviceConnections)
          .set({ isActive: false, updatedAt: new Date() })
          .where(
            and(
              eq(serviceConnections.userId, user.id),
              eq(serviceConnections.serviceType, existing.serviceType),
            ),
          );

        await tx
          .update(serviceConnections)
          .set({ isActive: true, updatedAt: new Date() })
          .where(eq(serviceConnections.id, params.id));
      });

      const [updated] = await db
        .select()
        .from(serviceConnections)
        .where(eq(serviceConnections.id, params.id));

      return {
        success: true,
        message: 'Active connection switched',
        data: { connection: toApiConnection(updated) },
      };
    },
    {
      detail: {
        tags: ['Service Connections'],
        summary: 'Set active service connection',
        description:
          'Sets the specified connection as active and deactivates all others of the same type.',
      },
      response: {
        200: successResponse(t.Object({ connection: connectionWithTimestamps })),
        401: errorResponse,
        404: errorResponse,
      },
    },
  );
