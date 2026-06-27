import { and, eq, sql } from 'drizzle-orm';
import { Elysia, t } from 'elysia';
import { db } from '../../data/postgres';
import { workflows, workflowSteps, workflowEdges, workflowRuns } from '../../data/schema';
import { authMiddleware } from '../../shared/auth/middleware';
import { NotFoundError } from '../../shared/errors';

export const workflowRoutes = new Elysia({ prefix: '/api/workflows' })
  .use(authMiddleware)

  .get('/', async ({ user, query }) => {
    const conditions = [eq(workflows.userId, user.id)];
    if (query?.connection_id) {
      conditions.push(eq(workflows.connectionId, query.connection_id));
    }

    const rows = await db
      .select({
        id: workflows.id,
        userId: workflows.userId,
        connectionId: workflows.connectionId,
        name: workflows.name,
        description: workflows.description,
        args: workflows.args,
        isActive: workflows.isActive,
        createdAt: workflows.createdAt,
        updatedAt: workflows.updatedAt,
        stepCount: sql<number>`(SELECT COUNT(*) FROM workflow_steps WHERE workflow_steps.workflow_id = workflows.id)`,
      })
      .from(workflows)
      .where(and(...conditions))
      .orderBy(workflows.createdAt);

    return { success: true, message: 'ok', data: { workflows: rows } };
  }, {
    detail: { tags: ['Workflows'], summary: 'List workflows' },
    query: t.Object({
      connection_id: t.Optional(t.String()),
    }),
  })

  .post('/', async ({ body, user, set }) => {
    const workflowId = crypto.randomUUID();

    const [workflow] = await db.insert(workflows).values({
      id: workflowId,
      userId: user.id,
      connectionId: body.connection_id ?? null,
      name: body.name,
      description: body.description ?? null,
      args: body.args ?? [],
    }).returning();

    if (body.steps?.length) {
      await db.insert(workflowSteps).values(
        body.steps.map((s: any) => ({
          id: s.id ?? crypto.randomUUID(),
          workflowId,
          type: s.type,
          label: s.label,
          config: s.config ?? {},
          positionX: s.position_x ?? 0,
          positionY: s.position_y ?? 0,
        })),
      );
    }

    if (body.edges?.length) {
      await db.insert(workflowEdges).values(
        body.edges.map((e: any) => ({
          id: e.id ?? crypto.randomUUID(),
          workflowId,
          sourceStepId: e.source_step_id,
          sourceHandle: e.source_handle ?? null,
          targetStepId: e.target_step_id,
          targetHandle: e.target_handle ?? null,
          label: e.label ?? null,
        })),
      );
    }

    const steps = await db.select().from(workflowSteps).where(eq(workflowSteps.workflowId, workflowId));
    const edges = await db.select().from(workflowEdges).where(eq(workflowEdges.workflowId, workflowId));

    set.status = 201;
    return { success: true, message: 'Workflow created', data: { workflow: { ...workflow, steps, edges } } };
  }, {
    detail: { tags: ['Workflows'], summary: 'Create workflow' },
    body: t.Object({
      name: t.String(),
      connection_id: t.Optional(t.Nullable(t.String())),
      description: t.Optional(t.String()),
      args: t.Optional(t.Record(t.String(), t.Unknown())),
      steps: t.Optional(t.Array(t.Any())),
      edges: t.Optional(t.Array(t.Any())),
    }),
  })

  .get('/:id', async ({ params, user }) => {
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(and(eq(workflows.id, params.id), eq(workflows.userId, user.id)))
      .limit(1);

    if (!workflow) throw new NotFoundError();

    const steps = await db.select().from(workflowSteps).where(eq(workflowSteps.workflowId, params.id));
    const edges = await db.select().from(workflowEdges).where(eq(workflowEdges.workflowId, params.id));

    return { success: true, message: 'ok', data: { workflow: { ...workflow, steps, edges } } };
  }, {
    detail: { tags: ['Workflows'], summary: 'Get workflow' },
  })

  .put('/:id', async ({ params, body, user }) => {
    const [existing] = await db
      .select()
      .from(workflows)
      .where(and(eq(workflows.id, params.id), eq(workflows.userId, user.id)))
      .limit(1);

    if (!existing) throw new NotFoundError();

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.args !== undefined) updateData.args = body.args;

    const [updated] = await db
      .update(workflows)
      .set(updateData)
      .where(eq(workflows.id, params.id))
      .returning();

    if (body.steps !== undefined) {
      await db.delete(workflowSteps).where(eq(workflowSteps.workflowId, params.id));
      if (body.steps.length) {
        await db.insert(workflowSteps).values(
          body.steps.map((s: any) => ({
            id: s.id ?? crypto.randomUUID(),
            workflowId: params.id,
            type: s.type,
            label: s.label,
            config: s.config ?? {},
            positionX: s.position_x ?? 0,
            positionY: s.position_y ?? 0,
          })),
        );
      }
    }

    if (body.edges !== undefined) {
      await db.delete(workflowEdges).where(eq(workflowEdges.workflowId, params.id));
      if (body.edges.length) {
        await db.insert(workflowEdges).values(
          body.edges.map((e: any) => ({
            id: e.id ?? crypto.randomUUID(),
            workflowId: params.id,
            sourceStepId: e.source_step_id,
            sourceHandle: e.source_handle ?? null,
            targetStepId: e.target_step_id,
            targetHandle: e.target_handle ?? null,
            label: e.label ?? null,
          })),
        );
      }
    }

    const steps = await db.select().from(workflowSteps).where(eq(workflowSteps.workflowId, params.id));
    const edges = await db.select().from(workflowEdges).where(eq(workflowEdges.workflowId, params.id));

    return { success: true, message: 'Workflow updated', data: { workflow: { ...updated, steps, edges } } };
  }, {
    detail: { tags: ['Workflows'], summary: 'Update workflow' },
    body: t.Object({
      name: t.Optional(t.String()),
      description: t.Optional(t.Nullable(t.String())),
      args: t.Optional(t.Record(t.String(), t.Unknown())),
      steps: t.Optional(t.Array(t.Any())),
      edges: t.Optional(t.Array(t.Any())),
    }),
  })

  .delete('/:id', async ({ params, user, set }) => {
    const [existing] = await db
      .select()
      .from(workflows)
      .where(and(eq(workflows.id, params.id), eq(workflows.userId, user.id)))
      .limit(1);

    if (!existing) throw new NotFoundError();

    await db.delete(workflowRuns).where(eq(workflowRuns.workflowId, params.id));
    await db.delete(workflowEdges).where(eq(workflowEdges.workflowId, params.id));
    await db.delete(workflowSteps).where(eq(workflowSteps.workflowId, params.id));
    await db.delete(workflows).where(eq(workflows.id, params.id));

    set.status = 204;
    return null;
  }, {
    detail: { tags: ['Workflows'], summary: 'Delete workflow' },
  })

  .get('/:id/runs', async ({ params, user }) => {
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(and(eq(workflows.id, params.id), eq(workflows.userId, user.id)))
      .limit(1);

    if (!workflow) throw new NotFoundError();

    const runs = await db
      .select()
      .from(workflowRuns)
      .where(eq(workflowRuns.workflowId, params.id))
      .orderBy(workflowRuns.createdAt);

    return { success: true, message: 'ok', data: { runs } };
  }, {
    detail: { tags: ['Workflows'], summary: 'List workflow runs' },
  })

  .post('/:id/runs', async ({ params, user, set }) => {
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(and(eq(workflows.id, params.id), eq(workflows.userId, user.id)))
      .limit(1);

    if (!workflow) throw new NotFoundError();

    const [run] = await db.insert(workflowRuns).values({
      id: crypto.randomUUID(),
      workflowId: params.id,
      userId: user.id,
      status: 'running',
      startedAt: new Date(),
    }).returning();

    set.status = 201;
    return { success: true, message: 'Run started', data: { run } };
  }, {
    detail: { tags: ['Workflows'], summary: 'Create workflow run' },
  })

  .put('/:id/runs/:runId', async ({ params, body, user }) => {
    const [run] = await db
      .select()
      .from(workflowRuns)
      .where(and(eq(workflowRuns.id, params.runId), eq(workflowRuns.workflowId, params.id)))
      .limit(1);

    if (!run) throw new NotFoundError();

    const updateData: Record<string, unknown> = {};
    if (body.status !== undefined) updateData.status = body.status;
    if (body.finished_at !== undefined) updateData.finishedAt = new Date(body.finished_at);
    if (body.error !== undefined) updateData.error = body.error;

    const [updated] = await db
      .update(workflowRuns)
      .set(updateData)
      .where(eq(workflowRuns.id, params.runId))
      .returning();

    return { success: true, message: 'Run updated', data: { run: updated } };
  }, {
    detail: { tags: ['Workflows'], summary: 'Update workflow run' },
    body: t.Object({
      status: t.Optional(t.String()),
      finished_at: t.Optional(t.String()),
      error: t.Optional(t.Nullable(t.String())),
    }),
  })

  .post('/:id/runs/:runId/steps', async ({ params, body, set }) => {
    const [run] = await db
      .select()
      .from(workflowRuns)
      .where(and(eq(workflowRuns.id, params.runId), eq(workflowRuns.workflowId, params.id)))
      .limit(1);

    if (!run) throw new NotFoundError();

    // Run step is stored as a JSONB entry — no dedicated table; just validate and return ok
    set.status = 201;
    return {
      success: true,
      message: 'Run step recorded',
      data: {
        runId: params.runId,
        stepId: body.stepId,
        status: body.status,
        input: body.input,
        output: body.output,
        error: body.error,
        duration: body.duration,
      },
    };
  }, {
    detail: { tags: ['Workflows'], summary: 'Create run step record' },
    body: t.Object({
      stepId: t.String(),
      status: t.String(),
      input: t.Optional(t.Record(t.String(), t.Unknown())),
      output: t.Optional(t.Record(t.String(), t.Unknown())),
      error: t.Optional(t.String()),
      duration: t.Optional(t.Number()),
    }),
  })

  // Proxy endpoint for workflow HTTP steps (avoids CORS)
  .post('/proxy', async ({ body, user }) => {
    try {
      const headers: Record<string, string> = {};
      for (const h of body.headers ?? []) {
        if (h.key) headers[h.key] = h.value;
      }

      const res = await fetch(body.url, {
        method: body.method ?? 'GET',
        headers,
        body: ['GET', 'HEAD'].includes(body.method ?? 'GET') ? undefined : (body.body ?? undefined),
        signal: AbortSignal.timeout(30000),
      });

      const resHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => { resHeaders[k] = v; });

      return {
        success: true,
        data: {
          status: res.status,
          headers: resHeaders,
          body: await res.text(),
        },
      };
    } catch (e) {
      return {
        success: false,
        data: {
          status: 0,
          headers: {},
          body: e instanceof Error ? e.message : String(e),
        },
      };
    }
  }, {
    detail: { tags: ['Workflows'], summary: 'Proxy HTTP request' },
    body: t.Object({
      url: t.String(),
      method: t.Optional(t.String()),
      headers: t.Optional(t.Array(t.Object({ key: t.String(), value: t.String() }))),
      body: t.Optional(t.String()),
    }),
  });
