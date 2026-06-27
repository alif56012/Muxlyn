import type { Workflow, WorkflowNode, WorkflowStepConfig } from '@/features/workflow/types';
import { api } from '@/shared/api/client';
import { resolveTemplate } from '@/shared/lib/workflow-utils';

function getStartNodes(nodes: WorkflowNode[], edgeSources: Set<string>): WorkflowNode[] {
  return nodes.filter((n) => !edgeSources.has(n.id));
}

function getNextNodes(
  nodeId: string,
  edgesMap: Map<string, { source: string; sourceHandle?: string; target: string }[]>,
  branch?: string,
): { target: string }[] {
  const outgoing = edgesMap.get(nodeId) ?? [];
  if (!branch) return outgoing;
  const match = outgoing.filter((e) => (e.sourceHandle === branch || e.sourceHandle === undefined));
  return match;
}

interface StepContext {
  outputs: Map<string, unknown>;
}

function evaluateCondition(
  config: WorkflowStepConfig,
  context: StepContext,
): boolean {
  const { field, operator, value } = config;
  if (!field || !operator) return true;

  const fieldValue = String(context.outputs.get(field) ?? '');

  switch (operator) {
    case 'eq':
      return String(value ?? '') === fieldValue;
    case 'neq':
      return String(value ?? '') !== fieldValue;
    case 'contains':
      return fieldValue.includes(String(value ?? ''));
    case 'gt':
      return Number(fieldValue) > Number(value ?? 0);
    case 'lt':
      return Number(fieldValue) < Number(value ?? 0);
    case 'gte':
      return Number(fieldValue) >= Number(value ?? 0);
    case 'lte':
      return Number(fieldValue) <= Number(value ?? 0);
    default:
      return true;
  }
}

export async function runWorkflow(
  workflow: Workflow,
  args: Record<string, string>,
  serviceUrl: string,
  onStepUpdate: (stepId: string, status: string, data?: unknown) => void,
): Promise<void> {
  const nodes = workflow.nodes;
  const edges = workflow.edges;

  const edgesMap = new Map<string, { source: string; sourceHandle?: string; target: string }[]>();
  for (const e of edges) {
    const list = edgesMap.get(e.source) ?? [];
    list.push({ source: e.source, sourceHandle: e.sourceHandle, target: e.target });
    edgesMap.set(e.source, list);
  }

  const edgeSources = new Set(edges.map((e) => e.source));
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const context: StepContext = { outputs: new Map() };

  async function processNode(nodeId: string): Promise<void> {
    const node = nodeMap.get(nodeId);
    if (!node) return;

    onStepUpdate(nodeId, 'running');

    try {
      switch (node.data.stepType) {
        case 'http': {
          const config = node.data.config;
          const url = resolveTemplate(config.urlTemplate ?? '', { ...args, url: serviceUrl });
          const method = config.method ?? 'GET';

          const reqHeaders: Record<string, string> = {};
          for (const h of config.headers ?? []) {
            if (h.key.trim()) reqHeaders[h.key.trim()] = resolveTemplate(h.value, args);
          }

          const body = config.bodyTemplate ? resolveTemplate(config.bodyTemplate, args) : undefined;

          if (!['GET', 'HEAD'].includes(method) && body && !reqHeaders['content-type']) {
            reqHeaders['Content-Type'] = 'application/json';
          }

          const proxyRes = await api.post<{
            success: boolean;
            data: { status: number; headers: Record<string, string>; body: string };
          }>('/api/workflows/proxy', {
            url,
            method,
            headers: Object.entries(reqHeaders).map(([key, value]) => ({ key, value })),
            body,
          });

          const result = (proxyRes as { data?: { status: number; headers: Record<string, string>; body: string } }).data ?? null;
          let responseData: unknown = null;
          if (result) {
            try { responseData = JSON.parse(result.body); } catch { responseData = result.body; }
            context.outputs.set(nodeId, { status: result.status, data: responseData });
          }
          onStepUpdate(nodeId, 'success', { status: result?.status, data: responseData });
          break;
        }

        case 'condition': {
          const result = evaluateCondition(node.data.config, context);
          context.outputs.set(nodeId, { result, field: node.data.config.field });
          onStepUpdate(nodeId, 'success', { result });

          const branch = result ? 'true' : 'false';
          const next = getNextNodes(nodeId, edgesMap, branch);
          for (const n of next) {
            await processNode(n.target);
          }
          return;
        }

        case 'delay': {
          const duration = node.data.config.duration ?? 1000;
          const unit = node.data.config.unit ?? 'ms';
          const ms = unit === 's' ? duration * 1000 : unit === 'm' ? duration * 60000 : duration;

          await new Promise<void>((resolve) => setTimeout(resolve, ms));
          context.outputs.set(nodeId, { delayed: ms });
          onStepUpdate(nodeId, 'success', { delayed: ms });
          break;
        }

        case 'notification': {
          const title = node.data.config.title ?? 'Workflow Notification';
          const message = node.data.config.message ?? '';
          const target = node.data.config.target ?? 'toast';

          if (target === 'toast') {
            window.dispatchEvent(
              new CustomEvent('toast:show', {
                detail: { title, message },
              }),
            );
          }

          context.outputs.set(nodeId, { title, message, target });
          onStepUpdate(nodeId, 'success', { title, message, target });
          break;
        }

        default:
          onStepUpdate(nodeId, 'success');
      }

      const defaultNext = getNextNodes(nodeId, edgesMap);
      for (const n of defaultNext) {
        await processNode(n.target);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      context.outputs.set(nodeId, { error: message });
      onStepUpdate(nodeId, 'error', { error: message });
      throw err;
    }
  }

  const startNodes = getStartNodes(nodes, edgeSources);
  for (const start of startNodes) {
    await processNode(start.id);
  }
}
