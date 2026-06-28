import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Workflow, WorkflowEdge, WorkflowNode, WorkflowRun } from '@/features/workflow/types';
import { api } from '@/shared/api/client';

interface ApiWorkflowStep {
  id: string;
  type: string;
  label: string;
  config: Record<string, unknown>;
  positionX: number;
  positionY: number;
}

interface ApiWorkflowEdgeItem {
  id: string;
  sourceStepId: string;
  sourceHandle?: string;
  targetStepId: string;
  targetHandle?: string;
  label?: string;
}

interface ApiWorkflow {
  id: string;
  connectionId: string;
  name: string;
  description?: string;
  args: { name: string; default_value?: string }[] | Record<string, unknown>;
  stepCount?: number;
  steps: ApiWorkflowStep[];
  edges: ApiWorkflowEdgeItem[];
  created_at?: string;
  updated_at?: string;
}

interface ApiWorkflowRunStep {
  id: string;
  stepId: string;
  status: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  duration?: number;
}

interface ApiWorkflowRun {
  id: string;
  workflowId: string;
  status: string;
  started_at: string;
  finished_at?: string;
  error?: string;
  args?: Record<string, string>;
  steps?: ApiWorkflowRunStep[];
}

function toWorkflow(api: ApiWorkflow): Workflow {
  return {
    id: api.id,
    connectionId: api.connectionId,
    name: api.name,
    description: api.description,
    stepCount: api.stepCount ?? (api.steps ?? []).length,
    args: Array.isArray(api.args)
      ? api.args.map((a) => ({
          name: a.name,
          defaultValue: a.default_value,
        }))
      : [],
    nodes: (api.steps ?? []).map(
      (s): WorkflowNode => ({
        id: s.id,
        type: 'custom',
        position: { x: s.positionX ?? 0, y: s.positionY ?? 0 },
        data: {
          stepType: s.type as WorkflowNode['data']['stepType'],
          label: s.label,
          config: s.config as WorkflowNode['data']['config'],
        },
      }),
    ),
    edges: (api.edges ?? []).map(
      (e): WorkflowEdge => ({
        id: e.id,
        source: e.sourceStepId,
        sourceHandle: e.sourceHandle,
        target: e.targetStepId,
        targetHandle: e.targetHandle,
        label: e.label,
      }),
    ),
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}

function toWorkflowRun(api: ApiWorkflowRun): WorkflowRun {
  return {
    id: api.id,
    workflowId: api.workflowId,
    status: api.status as WorkflowRun['status'],
    startedAt: api.started_at,
    finishedAt: api.finished_at,
    error: api.error,
    args: api.args,
    steps: (api.steps ?? []).map((s) => ({
      id: s.id,
      stepId: s.stepId,
      status: s.status as NonNullable<WorkflowRun['steps']>[number]['status'],
      input: s.input,
      output: s.output,
      error: s.error,
      duration: s.duration,
    })),
  };
}

export function useWorkflows(connectionId?: string) {
  return useQuery({
    queryKey: ['workflows', connectionId],
    queryFn: async () => {
      const url = connectionId
        ? `/api/workflows?connection_id=${encodeURIComponent(connectionId)}`
        : '/api/workflows';
      const res = await api.get<{ workflows: ApiWorkflow[] }>(url);
      if (!res.success) {
        throw new Error(res.error?.code ?? 'Failed to fetch workflows');
      }
      return (res.data?.workflows ?? []).map(toWorkflow);
    },
  });
}

export function useWorkflow(id: string | undefined) {
  return useQuery({
    queryKey: ['workflow', id],
    queryFn: async () => {
      const res = await api.get<{ workflow: ApiWorkflow }>(`/api/workflows/${id}`);
      if (!res.success || !res.data) {
        throw new Error(res.error?.code ?? 'Failed to fetch workflow');
      }
      return toWorkflow(res.data.workflow);
    },
    enabled: !!id,
  });
}

export function useCreateWorkflow() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: {
      connection_id: string;
      name: string;
      description?: string;
      args?: { name: string; default_value?: string }[];
      steps?: unknown[];
      edges?: unknown[];
    }) => api.post('/api/workflows', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflows'] }),
  });
}

export function useUpdateWorkflow() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      name?: string;
      description?: string;
      args?: { name: string; default_value?: string }[];
      steps?: unknown[];
      edges?: unknown[];
    }) => api.put(`/api/workflows/${id}`, body),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['workflows'] });
      qc.invalidateQueries({ queryKey: ['workflow', vars.id] });
    },
  });
}

export function useDeleteWorkflow() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/workflows/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflows'] }),
  });
}

export function useWorkflowRuns(workflowId: string | undefined) {
  return useQuery({
    queryKey: ['workflow-runs', workflowId],
    queryFn: async () => {
      const res = await api.get<{ runs: ApiWorkflowRun[] }>(`/api/workflows/${workflowId}/runs`);
      if (!res.success) {
        throw new Error(res.error?.code ?? 'Failed to fetch runs');
      }
      return (res.data?.runs ?? []).map(toWorkflowRun);
    },
    enabled: !!workflowId,
  });
}

export function useStartRun() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ workflowId, args }: { workflowId: string; args: Record<string, string> }) =>
      api.post(`/api/workflows/${workflowId}/runs`, { args }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflow-runs'] }),
  });
}

export function useSaveRunStep() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      runId,
      stepId,
      status,
      output,
      error,
      duration,
    }: {
      runId: string;
      stepId: string;
      status: string;
      output?: Record<string, unknown>;
      error?: string;
      duration?: number;
    }) =>
      api.post(`/api/workflows/runs/${runId}/steps`, {
        step_id: stepId,
        status,
        output,
        error,
        duration,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workflow-runs'] });
    },
  });
}
