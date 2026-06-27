import { and, eq } from 'drizzle-orm';
import { Elysia, t } from 'elysia';
import { db } from '../../data/postgres';
import { serviceConnections, serviceGroups } from '../../data/schema';
import { authMiddleware } from '../../shared/auth/middleware';
import { NotFoundError } from '../../shared/errors';

function toApiGroup(g: typeof serviceGroups.$inferSelect) {
  return {
    id: g.id,
    name: g.name,
    color: g.color ?? '#6b7280',
    icon: g.icon ?? null,
    sort_order: g.sortOrder ?? 0,
    collapsed: g.collapsed ?? false,
    created_at: g.createdAt?.toISOString() ?? new Date().toISOString(),
    updated_at: g.updatedAt?.toISOString() ?? new Date().toISOString(),
  };
}

export const serviceGroupsRoutes = new Elysia({ prefix: '/api/service-groups' })
  .use(authMiddleware)

  .get('/', async ({ user }) => {
    const groups = await db
      .select()
      .from(serviceGroups)
      .where(eq(serviceGroups.userId, user.id))
      .orderBy(serviceGroups.sortOrder);

    return { success: true, message: 'ok', data: { groups: groups.map(toApiGroup) } };
  }, {
    detail: { tags: ['Service Groups'], summary: 'List service groups' },
  })

  .post(
    '/',
    async ({ body, user, set }) => {
      const [group] = await db
        .insert(serviceGroups)
        .values({
          id: crypto.randomUUID(),
          userId: user.id,
          name: body.name,
          color: body.color ?? '#6b7280',
          icon: body.icon ?? null,
          sortOrder: body.sort_order ?? 0,
        })
        .returning();

      set.status = 201;
      return { success: true, message: 'Group created', data: { group: toApiGroup(group) } };
    },
    {
      detail: { tags: ['Service Groups'], summary: 'Create service group' },
      body: t.Object({
        name: t.String(),
        color: t.Optional(t.String()),
        icon: t.Optional(t.String()),
        sort_order: t.Optional(t.Number()),
      }),
    },
  )

  .put(
    '/:id',
    async ({ params, body, user }) => {
      const [existing] = await db
        .select()
        .from(serviceGroups)
        .where(and(eq(serviceGroups.id, params.id), eq(serviceGroups.userId, user.id)))
        .limit(1);

      if (!existing) throw new NotFoundError();

      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (body.name !== undefined) updateData.name = body.name;
      if (body.color !== undefined) updateData.color = body.color;
      if (body.icon !== undefined) updateData.icon = body.icon;
      if (body.sort_order !== undefined) updateData.sortOrder = body.sort_order;
      if (body.collapsed !== undefined) updateData.collapsed = body.collapsed;

      const [updated] = await db
        .update(serviceGroups)
        .set(updateData)
        .where(eq(serviceGroups.id, params.id))
        .returning();

      return { success: true, message: 'Group updated', data: { group: toApiGroup(updated) } };
    },
    {
      detail: { tags: ['Service Groups'], summary: 'Update service group' },
      body: t.Object({
        name: t.Optional(t.String()),
        color: t.Optional(t.String()),
        icon: t.Optional(t.Nullable(t.String())),
        sort_order: t.Optional(t.Number()),
        collapsed: t.Optional(t.Boolean()),
      }),
    },
  )

  .delete('/:id', async ({ params, user, set }) => {
    const [existing] = await db
      .select()
      .from(serviceGroups)
      .where(and(eq(serviceGroups.id, params.id), eq(serviceGroups.userId, user.id)))
      .limit(1);

    if (!existing) throw new NotFoundError();

    await db
      .update(serviceConnections)
      .set({ groupId: null, updatedAt: new Date() })
      .where(and(eq(serviceConnections.groupId, params.id), eq(serviceConnections.userId, user.id)));

    await db.delete(serviceGroups).where(eq(serviceGroups.id, params.id));

    set.status = 204;
    return null;
  }, {
    detail: { tags: ['Service Groups'], summary: 'Delete service group' },
  });
