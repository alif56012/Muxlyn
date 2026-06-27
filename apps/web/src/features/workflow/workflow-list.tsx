import {
  Clock,
  MoreHorizontal,
  Play,
  Plus,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useWorkflows, useDeleteWorkflow, useStartRun, useWorkflowRuns } from '@/features/workflow/hooks/use-workflows';
import type { Workflow, WorkflowRun } from '@/features/workflow/types';
import { useServiceConnections } from '@/shared/api/service-connections';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/modal';
import { cn } from '@/shared/lib/utils';

function stepCountLabel(count: number) {
  return `${count} steps`;
}

function lastRunInfo(run?: WorkflowRun) {
  if (!run) return null;
  return {
    status: run.status,
    time: run.finishedAt ?? run.startedAt,
  };
}

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

const statusStyles: Record<string, string> = {
  running: 'bg-blue-500',
  success: 'bg-green-500',
  error: 'bg-red-500',
};

interface WorkflowListProps {
  connectionId?: string;
}

export function WorkflowList({ connectionId }: WorkflowListProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: workflows = [], isLoading } = useWorkflows(connectionId);
  const { data: allConnections = [] } = useServiceConnections();
  const serviceName = connectionId
    ? allConnections.find((c) => c.id === connectionId)?.displayName
    : undefined;
  const deleteMutation = useDeleteWorkflow();
  const startRun = useStartRun();

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const runsMap = useMemo(() => {
    const map = new Map<string, WorkflowRun[]>();
    for (const w of workflows) {
      map.set(w.id, []);
    }
    return map;
  }, [workflows]);

  const handleCreate = async () => {
    // Inline create since useCreateWorkflow needs connectionId in body;
    // navigate directly to editor with new flag
    if (connectionId) {
      navigate({ to: '/workflows/editor', search: { c: connectionId } });
    } else {
      navigate({ to: '/workflows/editor' });
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold">{t('workflow.title', 'Workflows')}</h1>
          {serviceName && (
            <p className="text-sm text-muted-foreground">{serviceName}</p>
          )}
        </div>
        <Button size="sm" className="gap-1.5" onClick={handleCreate}>
          <Plus className="h-4 w-4" />
          {t('workflow.create', 'Create Workflow')}
        </Button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader><div className="h-5 bg-muted rounded w-32 animate-pulse" /></CardHeader>
            <CardContent><div className="h-4 bg-muted rounded w-48 animate-pulse" /></CardContent>
          </Card>
        </div>
      )}

      {!isLoading && workflows.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8">
            <p className="text-sm text-muted-foreground">
              {t('workflow.empty', 'No workflows yet. Create one to get started.')}
            </p>
            <Button variant="outline" size="sm" onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-1.5" />
              {t('workflow.create', 'Create Workflow')}
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && workflows.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workflows.map((w) => {
            const runs = runsMap.get(w.id) ?? [];
            const lastRun = runs[0];
            const lastRunData = lastRunInfo(lastRun);

            return (
              <WorkflowCard
                key={w.id}
                workflow={w}
                lastRun={lastRunData}
                onRun={() => startRun.mutate({ workflowId: w.id, args: {} })}
                onEdit={() =>
                  navigate({
                    to: '/workflows/editor',
                    search: { c: w.connectionId, w: w.id },
                  })
                }
                onDelete={() => setDeleteTarget(w.id)}
              />
            );
          })}
        </div>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('workflow.delete_title', 'Delete Workflow')}</DialogTitle>
            <DialogDescription>
              {t('workflow.delete_desc', 'This action cannot be undone.')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t('common.cancel', 'Cancel')}</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteTarget) {
                  deleteMutation.mutate(deleteTarget);
                  setDeleteTarget(null);
                }
              }}
              disabled={deleteMutation.isPending}
            >
              {t('common.delete', 'Delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WorkflowCard({
  workflow,
  lastRun,
  onRun,
  onEdit,
  onDelete,
}: {
  workflow: Workflow;
  lastRun: { status: string; time: string } | null;
  onRun: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Card className="group">
      <CardHeader className="flex flex-row items-start gap-3 pb-3">
        <div className="flex-1 min-w-0">
          <CardTitle className="text-base truncate">{workflow.name}</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {stepCountLabel(workflow.stepCount)}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onRun} className="gap-2">
              <Play className="h-4 w-4" />
              {t('workflow.run', 'Run')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit} className="gap-2">
              <Clock className="h-4 w-4" />
              {t('workflow.edit', 'Edit')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="gap-2 text-destructive">
              <Trash2 className="h-4 w-4" />
              {t('common.delete', 'Delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent className="pt-0 pb-3">
        {lastRun && (
          <div className="flex items-center gap-2 text-xs">
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                statusStyles[lastRun.status] ?? 'bg-gray-400',
              )}
            />
            <span className="text-muted-foreground capitalize">{lastRun.status}</span>
            <span className="text-muted-foreground">{formatTime(lastRun.time)}</span>
          </div>
        )}
        {!lastRun && (
          <p className="text-xs text-muted-foreground">
            {t('workflow.no_runs', 'No runs yet')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
