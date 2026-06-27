export type StepType = 'http' | 'condition' | 'delay' | 'notification';

export interface WorkflowStepConfig {
  method?: string;
  urlTemplate?: string;
  headers?: { key: string; value: string }[];
  bodyTemplate?: string;
  field?: string;
  operator?: string;
  value?: string;
  duration?: number;
  unit?: string;
  title?: string;
  message?: string;
  target?: string;
}

export interface WorkflowNode {
  id: string;
  type: 'custom';
  position: { x: number; y: number };
  data: {
    stepType: StepType;
    label: string;
    config: WorkflowStepConfig;
    status?: 'pending' | 'running' | 'success' | 'error';
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  sourceHandle?: string;
  target: string;
  targetHandle?: string;
  label?: string;
}

export interface Workflow {
  id: string;
  connectionId: string;
  name: string;
  description?: string;
  args: { name: string; defaultValue?: string }[];
  stepCount: number;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  status: 'running' | 'success' | 'error';
  startedAt: string;
  finishedAt?: string;
  error?: string;
  args?: Record<string, string>;
  steps?: WorkflowRunStep[];
}

export interface WorkflowRunStep {
  id: string;
  stepId: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  duration?: number;
}
