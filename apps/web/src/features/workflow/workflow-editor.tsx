import {
  ArrowLeft,
  Bell,
  Clock,
  GitBranch,
  Globe,
  Play,
  Save,
  Settings2,
  X,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Connection,
  type Node,
  type Edge,
  type NodeMouseHandler,
  type ReactFlowInstance,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useWorkflow, useUpdateWorkflow, useCreateWorkflow, useStartRun } from '@/features/workflow/hooks/use-workflows';
import type { WorkflowNode, StepType } from '@/features/workflow/types';
import { runWorkflow } from '@/features/workflow/workflow-runner';
import { useServiceConnections } from '@/shared/api/service-connections';
import { StepConfigPanel } from '@/features/workflow/step-config-panel';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { cn } from '@/shared/lib/utils';

const STEP_PALETTE: { type: StepType; label: string; icon: typeof Globe; color: string }[] = [
  { type: 'http', label: 'HTTP Request', icon: Globe, color: 'bg-blue-500/20 border-blue-500' },
  { type: 'condition', label: 'Condition', icon: GitBranch, color: 'bg-yellow-500/20 border-yellow-500' },
  { type: 'delay', label: 'Delay', icon: Clock, color: 'bg-purple-500/20 border-purple-500' },
  { type: 'notification', label: 'Notification', icon: Bell, color: 'bg-green-500/20 border-green-500' },
];

function WorkflowNodeComponent({ id, data }: { id: string; data: WorkflowNode['data'] & { onDelete?: (id: string) => void } }) {
  const def = STEP_PALETTE.find((p) => p.type === data.stepType);
  const Icon = def?.icon ?? Globe;
  const color = def?.color ?? 'bg-gray-500/20 border-gray-500';

  return (
    <div
      className={cn(
        'rounded-md border-2 px-3 py-2 min-w-[140px] shadow-sm group/node relative',
        color,
        data.status === 'running' && 'animate-pulse',
        data.status === 'error' && 'border-red-500',
      )}
    >
      <button
        type="button"
        className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center sm:opacity-0 sm:group-hover/node:opacity-100 transition-opacity"
        onClick={(e) => { e.stopPropagation(); data.onDelete?.(id); }}
      >
        <X className="h-3 w-3" />
      </button>
      <Handle type="target" position={Position.Top} className="!w-2.5 !h-2.5" />
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="text-sm font-medium truncate">{data.label}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-2.5 !h-2.5" />
    </div>
  );
}

const nodeTypes = { custom: WorkflowNodeComponent };

export function WorkflowEditor() {
  const { t } = useTranslation();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const connectionId = params.get('c') ?? undefined;
  const [workflowId, setWorkflowId] = useState(params.get('w') ?? undefined);

  const { data: workflow } = useWorkflow(workflowId);
  const { data: allConnections = [] } = useServiceConnections();
  const serviceName = connectionId
    ? allConnections.find((c) => c.id === connectionId)?.displayName
    : undefined;
  const updateMutation = useUpdateWorkflow();
  const createMutation = useCreateWorkflow();
  const startRun = useStartRun();

  const [name, setName] = useState(workflow?.name ?? 'New Workflow');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [argInputs, setArgInputs] = useState<Record<string, string>>({});
  const [runningSteps, setRunningSteps] = useState<Set<string>>(new Set());
  const [showPalette, setShowPalette] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const deleteNode = (id: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  };

  const addNode = useCallback(
    (stepType: StepType, position?: { x: number; y: number }) => {
      const def = STEP_PALETTE.find((p) => p.type === stepType);
      const pos = position ?? {
        x: Math.random() * 300 + 50,
        y: nodes.length * 100 + 50,
      };
      const newNode: Node = {
        id: crypto.randomUUID(),
        type: 'custom',
        position: pos,
        data: {
          stepType,
          label: def?.label ?? stepType,
          config: {},
          onDelete: deleteNode,
        },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes, nodes.length],
  );

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance<Node, Edge> | null>(null);

  useEffect(() => {
    if (workflow) {
      setName(workflow.name);
      const flowNodes: Node[] = workflow.nodes.map((n) => ({
        id: n.id,
        type: 'custom',
        position: n.position,
        data: { ...n.data, onDelete: deleteNode },
      }));
      const flowEdges: Edge[] = workflow.edges.map((e) => ({
        id: e.id,
        source: e.source,
        sourceHandle: e.sourceHandle,
        target: e.target,
        targetHandle: e.targetHandle,
        label: e.label,
      }));
      setNodes(flowNodes);
      setEdges(flowEdges);
      const initArgs: Record<string, string> = {};
      for (const a of workflow.args ?? []) {
        initArgs[a.name] = a.defaultValue ?? '';
      }
      setArgInputs(initArgs);
    } else {
      setName('New Workflow');
      setNodes([]);
      setEdges([]);
      setArgInputs({});
    }
  }, [workflow, setNodes, setEdges]);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return nodes.find((n) => n.id === selectedNodeId);
  }, [selectedNodeId, nodes]);

  const argNames = useMemo(() => {
    const names = new Set<string>();
    for (const n of nodes) {
      const config = (n.data as WorkflowNode['data']).config ?? {};
      for (const field of ['urlTemplate', 'bodyTemplate', 'field', 'value', 'title', 'message'] as const) {
        const val = config[field];
        if (typeof val === 'string') {
          for (const m of val.matchAll(/\{\{(\w+)\}\}/g)) {
            names.add(m[1]);
          }
        }
      }
    }
    return [...names];
  }, [nodes]);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      const edge: Edge = {
        id: `e-${connection.source}-${connection.target}`,
        source: connection.source,
        sourceHandle: connection.sourceHandle ?? undefined,
        target: connection.target,
        targetHandle: connection.targetHandle ?? undefined,
      };
      setEdges((eds) => [...eds, edge]);
    },
    [setEdges],
  );

  const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const stepType = event.dataTransfer.getData('application/reactflow') as StepType;
      if (!stepType || !rfInstance || !reactFlowWrapper.current) return;

      const wrapperBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = rfInstance.screenToFlowPosition({
        x: event.clientX - wrapperBounds.left,
        y: event.clientY - wrapperBounds.top,
      });

      const def = STEP_PALETTE.find((p) => p.type === stepType);
      addNode(stepType, position);
    },
    [rfInstance, addNode],
  );

  const updateSelectedConfig = (key: string, value: unknown) => {
    if (!selectedNodeId) return;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedNodeId
          ? { ...n, data: { ...n.data, config: { ...(n.data as WorkflowNode['data']).config, [key]: value } } }
          : n,
      ),
    );
  };

  const handleLabelChange = (label: string) => {
    if (!selectedNodeId) return;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedNodeId ? { ...n, data: { ...n.data, label } } : n,
      ),
    );
  };

  const handleSave = async () => {
    try {
      const steps = nodes.map((n) => {
      const d = n.data as WorkflowNode['data'];
      return {
        id: n.id,
        type: d.stepType,
        label: d.label,
        config: d.config,
        position_x: Math.round(n.position.x),
        position_y: Math.round(n.position.y),
      };
    });
    const edgeData = edges.map((e) => ({
      id: e.id,
      source_step_id: e.source,
      source_handle: e.sourceHandle ?? undefined,
      target_step_id: e.target,
      target_handle: e.targetHandle ?? undefined,
      label: e.label ?? undefined,
    }));
    const args = argNames.map((name) => ({ name, default_value: argInputs[name] }));

    if (workflowId) {
      await updateMutation.mutateAsync({ id: workflowId, name, steps, edges: edgeData, args });
      window.dispatchEvent(new CustomEvent('toast:show', {
        detail: { message: t('workflow.saved', 'Workflow saved'), variant: 'success' as const },
      }));
    } else if (connectionId) {
      const result = await createMutation.mutateAsync({
        connection_id: connectionId,
        name,
        steps,
        edges: edgeData,
        args,
      });
      const createdId = (result as { data?: { workflow?: { id: string } } }).data?.workflow?.id;
      if (createdId) {
        window.history.replaceState(null, '', `/workflows/editor?c=${connectionId}&w=${createdId}`);
        setWorkflowId(createdId);
        window.dispatchEvent(new CustomEvent('toast:show', {
          detail: { message: t('workflow.created', 'Workflow created'), variant: 'success' as const },
        }));
      }
    }
  } catch {
    window.dispatchEvent(new CustomEvent('toast:show', {
      detail: { message: t('workflow.save_error', 'Failed to save'), variant: 'error' as const },
    }));
  }
  };

  const handleRun = async () => {
    const workflowData: import('@/features/workflow/types').Workflow = {
      id: workflowId ?? 'local',
      connectionId: connectionId ?? '',
      name,
      stepCount: nodes.length,
      args: argNames.map((n) => ({ name: n })),
      nodes: nodes.map((n) => {
        const d = n.data as WorkflowNode['data'];
        return {
          id: n.id,
          type: 'custom',
          position: n.position,
          data: d,
        };
      }),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        sourceHandle: e.sourceHandle ?? undefined,
        target: e.target,
        targetHandle: e.targetHandle ?? undefined,
        label: (e.label as string) ?? undefined,
      })),
    };

    setRunningSteps(new Set());

    try {
      await runWorkflow(workflowData, argInputs, '', (stepId, status, data) => {
        setRunningSteps((prev) => {
          const next = new Set(prev);
          if (status === 'success' || status === 'error') {
            next.delete(stepId);
          } else {
            next.add(stepId);
          }
          return next;
        });
        setNodes((nds) =>
          nds.map((n) =>
            n.id === stepId ? { ...n, data: { ...n.data, status: status as WorkflowNode['data']['status'] } } : n,
          ),
        );
      });
    } catch {
      // Errors handled per-step in runWorkflow callbacks
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Top Toolbar */}
      <div className="flex items-center gap-1.5 sm:gap-3 px-2 sm:px-4 py-2 border-b shrink-0 flex-wrap">
        <Link to="/workflows" search={{ c: connectionId } as never} className="hover:bg-accent rounded p-1 shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex flex-col min-w-0 flex-1 sm:flex-initial">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full sm:max-w-xs h-8 text-sm"
            placeholder={t('workflow.name_placeholder', 'Workflow name')}
          />
          {serviceName && (
            <span className="text-xs text-muted-foreground truncate hidden sm:block">{serviceName}</span>
          )}
        </div>
        <div className="flex items-center gap-1 ml-auto sm:ml-0">
          <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={() => setShowPalette((v) => !v)} title="Steps">
            <GitBranch className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={() => setShowConfig((v) => !v)} title="Config">
            <Settings2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleSave} disabled={updateMutation.isPending}>
            <Save className="h-4 w-4" />
            <span className="hidden sm:inline">{t('common.save', 'Save')}</span>
          </Button>
          <Button size="sm" className="gap-1.5" onClick={handleRun} disabled={runningSteps.size > 0}>
            <Play className="h-4 w-4" />
            <span className="hidden sm:inline">{runningSteps.size > 0 ? t('common.loading', 'Running...') : t('workflow.run', 'Run')}</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar — Step Palette */}
        <div className="hidden lg:block w-48 border-r shrink-0 p-3 space-y-2 overflow-auto">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            {t('workflow.steps', 'Steps')}
          </h3>
          {STEP_PALETTE.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.type}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/reactflow', item.type);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onClick={() => addNode(item.type)}
                className={cn(
                  'flex items-center gap-2 rounded-md border px-3 py-2 cursor-grab text-sm',
                  item.color,
                  'hover:opacity-80 transition-opacity',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </div>
            );
          })}
        </div>

        {/* Center — ReactFlow Canvas */}
        <div ref={reactFlowWrapper} className="flex-1 relative" onDragOver={onDragOver} onDrop={onDrop}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onInit={setRfInstance}
            nodeTypes={nodeTypes}
            fitView
            deleteKeyCode={['Backspace', 'Delete']}
            className="bg-background"
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>

        {/* Right Sidebar — Step Config */}
        <div className="hidden lg:block w-72 border-l shrink-0 p-3 overflow-auto">
          <StepConfigPanel
            selectedNode={selectedNode}
            onConfigChange={updateSelectedConfig}
            onLabelChange={handleLabelChange}
          />
        </div>

        {/* Mobile — Step Palette Overlay */}
        {showPalette && (
          <div className="lg:hidden absolute inset-0 z-20 bg-background/95 backdrop-blur-sm overflow-auto p-4 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">{t('workflow.steps', 'Steps')}</h3>
              <Button variant="ghost" size="icon-sm" onClick={() => setShowPalette(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
              <p className="text-xs text-muted-foreground mb-3">{t('workflow.tap_hint', 'Tap a step to add it to the canvas')}</p>
            {STEP_PALETTE.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.type}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/reactflow', item.type);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onClick={() => { addNode(item.type); setShowPalette(false); }}
                  className={cn(
                    'flex items-center gap-3 rounded-md border px-4 py-3 cursor-pointer text-sm active:opacity-70',
                    item.color,
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{item.label}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Mobile — Config Panel Overlay */}
        {showConfig && (
          <div className="lg:hidden absolute inset-0 z-20 bg-background/95 backdrop-blur-sm overflow-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">{t('workflow.step_config', 'Step Config')}</h3>
              <Button variant="ghost" size="icon-sm" onClick={() => setShowConfig(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <StepConfigPanel
              selectedNode={selectedNode}
              onConfigChange={updateSelectedConfig}
              onLabelChange={handleLabelChange}
            />
          </div>
        )}
      </div>

      {/* Bottom Bar — Arguments + Run */}
      {argNames.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 border-t shrink-0 overflow-x-auto">
          <span className="text-xs font-semibold text-muted-foreground shrink-0">
            {t('workflow.args', 'Args')}:
          </span>
          {argNames.map((name) => (
            <div key={name} className="flex items-center gap-1 shrink-0">
              <span className="text-xs font-mono">{`{{${name}}}`}</span>
              <Input
                value={argInputs[name] ?? ''}
                onChange={(e) => setArgInputs((prev) => ({ ...prev, [name]: e.target.value }))}
                className="h-7 w-24 text-xs"
              />
            </div>
          ))}
          <div className="flex-1" />
          <Button size="sm" className="gap-1.5 shrink-0" onClick={handleRun} disabled={runningSteps.size > 0}>
            <Play className="h-3.5 w-3.5" />
            {t('workflow.run', 'Run')}
          </Button>
        </div>
      )}
    </div>
  );
}
