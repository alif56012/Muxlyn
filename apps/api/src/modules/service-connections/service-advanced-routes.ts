import { and, desc, eq } from 'drizzle-orm';
import { Elysia, t } from 'elysia';
import { getEnv } from '../../config/env';
import { db } from '../../data/postgres';
import {
  serviceConnections,
  serviceCredentials,
  serviceActivityLog,
  serviceGroups,
} from '../../data/schema';
import { authMiddleware } from '../../shared/auth/middleware';
import { getCryptoKey } from '../../shared/crypto';
import { NotFoundError } from '../../shared/errors';

const env = getEnv();

function toApiCredential(c: typeof serviceCredentials.$inferSelect) {
  return {
    id: c.id,
    key_name: c.keyName,
    created_at: c.createdAt?.toISOString() ?? new Date().toISOString(),
  };
}

function toApiLogEntry(l: typeof serviceActivityLog.$inferSelect) {
  return {
    id: l.id,
    action: l.action,
    detail: l.detail,
    created_at: l.createdAt?.toISOString() ?? new Date().toISOString(),
  };
}

export const serviceAdvancedRoutes = new Elysia()
  .use(authMiddleware)

  .get(
    '/api/service-credentials/:connectionId',
    async ({ params, user }) => {
      const creds = await db
        .select()
        .from(serviceCredentials)
        .where(
          and(
            eq(serviceCredentials.connectionId, params.connectionId),
            eq(serviceCredentials.userId, user.id),
          ),
        );

      return {
        success: true,
        message: 'ok',
        data: { credentials: creds.map(toApiCredential) },
      };
    },
    { detail: { tags: ['Service Connections'], summary: 'List credentials' } },
  )

  .post(
    '/api/service-credentials/:connectionId',
    async ({ params, body, user, set }) => {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await getCryptoKey(env.ENCRYPTION_KEY, user.id);
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        new TextEncoder().encode(body.value),
      );

      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);
      const encoded = btoa(String.fromCharCode(...combined));

      const [cred] = await db
        .insert(serviceCredentials)
        .values({
          id: crypto.randomUUID(),
          connectionId: params.connectionId,
          userId: user.id,
          keyName: body.key_name,
          encryptedValue: encoded,
          iv: btoa(String.fromCharCode(...iv)),
        })
        .returning();

      set.status = 201;
      return {
        success: true,
        message: 'Credential saved',
        data: { credential: toApiCredential(cred) },
      };
    },
    {
      detail: { tags: ['Service Connections'], summary: 'Add credential' },
      body: t.Object({ key_name: t.String(), value: t.String() }),
    },
  )

  .delete(
    '/api/service-credentials/:connectionId/:credId',
    async ({ params, user, set }) => {
      const [existing] = await db
        .select()
        .from(serviceCredentials)
        .where(
          and(
            eq(serviceCredentials.id, params.credId),
            eq(serviceCredentials.connectionId, params.connectionId),
            eq(serviceCredentials.userId, user.id),
          ),
        )
        .limit(1);

      if (!existing) throw new NotFoundError();

      await db.delete(serviceCredentials).where(eq(serviceCredentials.id, params.credId));
      set.status = 204;
      return null;
    },
    { detail: { tags: ['Service Connections'], summary: 'Delete credential' } },
  )

  .get(
    '/api/service-activity/:connectionId',
    async ({ params, user }) => {
      const entries = await db
        .select()
        .from(serviceActivityLog)
        .where(
          and(
            eq(serviceActivityLog.connectionId, params.connectionId),
            eq(serviceActivityLog.userId, user.id),
          ),
        )
        .orderBy(desc(serviceActivityLog.createdAt))
        .limit(50);

      return {
        success: true,
        message: 'ok',
        data: { entries: entries.map(toApiLogEntry) },
      };
    },
    { detail: { tags: ['Service Connections'], summary: 'Get activity log' } },
  )

  .post(
    '/api/service-connections/export',
    async ({ user }) => {
      const [connections, groups, creds] = await Promise.all([
        db
          .select()
          .from(serviceConnections)
          .where(eq(serviceConnections.userId, user.id)),
        db
          .select()
          .from(serviceGroups)
          .where(eq(serviceGroups.userId, user.id)),
        db
          .select()
          .from(serviceCredentials)
          .where(eq(serviceCredentials.userId, user.id)),
      ]);

      return {
        success: true,
        data: {
          version: 1,
          exported_at: new Date().toISOString(),
          connections: connections.map((c) => ({
            service_type: c.serviceType,
            display_name: c.displayName,
            url: c.url,
            tags: c.tags,
            description: c.description,
            pinned: c.pinned,
            sort_order: c.sortOrder,
            group_id: c.groupId,
          })),
          groups: groups.map((g) => ({
            name: g.name,
            color: g.color,
            icon: g.icon,
            sort_order: g.sortOrder,
          })),
          credentials: creds.map((c) => ({
            connection_id: c.connectionId,
            key_name: c.keyName,
            encrypted_value: c.encryptedValue,
            iv: c.iv,
          })),
        },
      };
    },
    { detail: { tags: ['Service Connections'], summary: 'Export all data as JSON' } },
  );
