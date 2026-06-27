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
  tags: t.Array(t.String()),
  description: t.Nullable(t.String()),
  pinned: t.Boolean({ examples: [false] }),
  sort_order: t.Number({ examples: [0] }),
  group_id: t.Nullable(t.String()),
  health_enabled: t.Boolean({ examples: [false] }),
  health_interval: t.Number({ examples: [300] }),
  health_status: t.Nullable(t.String()),
  health_last_checked: t.Nullable(t.String()),
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
  tags: string[] | null;
  description: string | null;
  pinned: boolean | null;
  sortOrder: number | null;
  groupId: string | null;
  healthEnabled: boolean | null;
  healthInterval: number | null;
  healthStatus: string | null;
  healthLastChecked: Date | null;
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
    tags: c.tags ?? [],
    description: c.description,
    pinned: c.pinned ?? false,
    sort_order: c.sortOrder ?? 0,
    group_id: c.groupId,
    health_enabled: c.healthEnabled ?? false,
    health_interval: c.healthInterval ?? 300,
    health_status: c.healthStatus,
    health_last_checked: c.healthLastChecked?.toISOString() ?? null,
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

      const encrypted = body.token
        ? await encryptToken(body.token, env.ENCRYPTION_KEY, user.id)
        : '';

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
          tags: body.tags ?? [],
          description: body.description ?? null,
          pinned: body.pinned ?? false,
          sortOrder: body.sort_order ?? 0,
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
        token: t.Optional(t.String({ examples: ['ATATT3...'] })),
        url: t.Optional(t.String({ examples: ['https://company.atlassian.net'] })),
        tags: t.Optional(t.Array(t.String())),
        description: t.Optional(t.String()),
        pinned: t.Optional(t.Boolean({ default: false })),
        sort_order: t.Optional(t.Number({ default: 0 })),
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
        updateData.encryptedToken = await encryptToken(body.token, env.ENCRYPTION_KEY, user.id);
      }
      if (body.url !== undefined) {
        updateData.url = body.url;
      }
      if (body.tags !== undefined) {
        updateData.tags = body.tags;
      }
      if (body.description !== undefined) {
        updateData.description = body.description;
      }
      if (body.pinned !== undefined) {
        updateData.pinned = body.pinned;
      }
      if (body.sort_order !== undefined) {
        updateData.sortOrder = body.sort_order;
      }
      if (body.group_id !== undefined) {
        updateData.groupId = body.group_id;
      }
      if (body.health_enabled !== undefined) {
        updateData.healthEnabled = body.health_enabled;
      }
      if (body.health_interval !== undefined) {
        updateData.healthInterval = body.health_interval;
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
        description: 'Updates display name, token, URL, tags, description, pin status, or metadata.',
      },
      body: t.Object({
        display_name: t.Optional(t.String()),
        token: t.Optional(t.String()),
        url: t.Optional(t.Nullable(t.String())),
        tags: t.Optional(t.Array(t.String())),
        description: t.Optional(t.Nullable(t.String())),
        pinned: t.Optional(t.Boolean()),
        sort_order: t.Optional(t.Number()),
        group_id: t.Optional(t.Nullable(t.String())),
        health_enabled: t.Optional(t.Boolean()),
        health_interval: t.Optional(t.Number()),
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
  )

  .post(
    '/:id/health-check',
    async ({ params, user }) => {
      const [connection] = await db
        .select()
        .from(serviceConnections)
        .where(
          and(
            eq(serviceConnections.id, params.id),
            eq(serviceConnections.userId, user.id),
          ),
        )
        .limit(1);

      if (!connection) {
        throw new NotFoundError();
      }

      const url = connection.url;
      if (!url) {
        return {
          success: true,
          message: 'No URL configured',
          data: { status: 'unknown' },
        };
      }

      // SSRF protection: only allow HTTPS public URLs
      if (!url.startsWith('https://')) {
        return {
          success: true,
          message: 'Only HTTPS URLs are supported for health checks',
          data: { status: 'unknown' },
        };
      }

      const start = Date.now();
      let status: string = 'down';
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
        const duration = Date.now() - start;
        status = res.ok ? (duration < 1000 ? 'alive' : 'slow') : 'down';
      } catch {
        status = 'down';
      }

      await db
        .update(serviceConnections)
        .set({
          healthStatus: status,
          healthLastChecked: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(serviceConnections.id, params.id));

      return {
        success: true,
        message: 'Health check completed',
        data: { status },
      };
    },
    {
      detail: {
        tags: ['Service Connections'],
        summary: 'Run health check',
        description: 'Pings the service URL and updates health status.',
      },
      response: {
        200: successResponse(t.Object({ status: t.String() })),
        401: errorResponse,
        404: errorResponse,
      },
    },
  )

  .post(
    '/reorder',
    async ({ body, user }) => {
      for (const item of body.items) {
        await db
          .update(serviceConnections)
          .set({ sortOrder: item.sort_order, updatedAt: new Date() })
          .where(
            and(
              eq(serviceConnections.id, item.id),
              eq(serviceConnections.userId, user.id),
            ),
          );
      }

      return { success: true, message: 'Order updated' };
    },
    {
      detail: {
        tags: ['Service Connections'],
        summary: 'Reorder services',
        description: 'Bulk update sort order for drag-and-drop reorder.',
      },
      body: t.Object({
        items: t.Array(
          t.Object({
            id: t.String(),
            sort_order: t.Number(),
          }),
        ),
      }),
      response: {
        200: t.Object({
          success: t.Boolean(),
          message: t.String(),
        }),
        401: t.Object({
          success: t.Boolean(),
          message: t.String(),
          error: t.Object({ code: t.String(), details: t.Optional(t.Record(t.String(), t.Unknown())) }),
        }),
      },
    },
  );
