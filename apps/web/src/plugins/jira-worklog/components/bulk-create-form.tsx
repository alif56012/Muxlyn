import { useState, useCallback, useMemo } from 'react';
import {
  Loader2,
  Plus,
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { cn } from '@/shared/lib/utils';
import {
  useBulkCreateWorklogs,
  type BulkCreateEntry,
  type BulkCreateResult,
} from '../api/bulk-worklog';

interface TaskInfo {
  issueId: string;
  issueKey: string;
  summary: string;
}

interface PerRowOverride {
  durationHours?: number;
  durationMinutes?: number;
  comment?: string;
}

interface BulkCreateFormProps {
  tasks: TaskInfo[];
  onAddTasks?: () => void;
  onRemoveTask?: (issueId: string) => void;
  onCancel?: () => void;
  onComplete?: (result: BulkCreateResult) => void;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function durationToSeconds(hours: number, minutes: number): number {
  return hours * 3600 + minutes * 60;
}

function secondsToDisplay(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function BulkCreateForm({
  tasks,
  onAddTasks,
  onRemoveTask,
  onCancel,
  onComplete,
}: BulkCreateFormProps) {
  const [commonDate, setCommonDate] = useState(todayISO);
  const [commonHours, setCommonHours] = useState(2);
  const [commonMinutes, setCommonMinutes] = useState(0);
  const [overrides, setOverrides] = useState<
    Record<string, PerRowOverride>
  >({});

  const createMutation = useBulkCreateWorklogs();
  const isPending = createMutation.isPending;

  const hasOverride = useCallback(
    (issueId: string) => issueId in overrides,
    [overrides],
  );

  const getDurationDisplay = useCallback(
    (issueId: string) => {
      const over = overrides[issueId];
      const h =
        over?.durationHours !== undefined ? over.durationHours : commonHours;
      const m =
        over?.durationMinutes !== undefined
          ? over.durationMinutes
          : commonMinutes;
      return `${h}h ${m}m`;
    },
    [overrides, commonHours, commonMinutes],
  );

  const updateOverride = useCallback(
    (issueId: string, field: keyof PerRowOverride, value: number | string) => {
      setOverrides((prev) => ({
        ...prev,
        [issueId]: { ...prev[issueId], [field]: value },
      }));
    },
    [],
  );

  const clearOverride = useCallback((issueId: string) => {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[issueId];
      return next;
    });
  }, []);

  const entries: BulkCreateEntry[] = useMemo(
    () =>
      tasks.map((t) => {
        const over = overrides[t.issueId];
        return {
          issueId: t.issueId,
          date: commonDate,
          durationSeconds: durationToSeconds(
            over?.durationHours ?? commonHours,
            over?.durationMinutes ?? commonMinutes,
          ),
          comment: over?.comment,
        };
      }),
    [tasks, overrides, commonDate, commonHours, commonMinutes],
  );

  const hasEntries = tasks.length > 0;

  const handleSubmit = useCallback(() => {
    if (!hasEntries) return;
    createMutation.mutate(entries, {
      onSuccess: (res) => {
        const data = res.data;
        if (data && res.success) {
          onComplete?.(data);
        }
      },
    });
  }, [entries, hasEntries, createMutation, onComplete]);

  const result = createMutation.data?.data;

  if (result) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <span className="font-semibold text-lg">
            {result.succeeded} worklogs saved
            {result.failed > 0 && (
              <span className="text-destructive">
                {' '}
                · {result.failed} failed
              </span>
            )}
          </span>
        </div>

        <p className="text-sm text-muted-foreground">
          Total: {result.totalHours}h
        </p>

        <div className="max-h-64 overflow-y-auto space-y-1 rounded-md border p-3">
          {result.results.map((r, i) => (
            <div
              key={i}
              className={cn(
                'flex items-center gap-2 rounded px-2 py-1 text-sm',
                r.status === 'success'
                  ? 'bg-green-50 dark:bg-green-950/20'
                  : 'bg-red-50 dark:bg-red-950/20',
              )}
            >
              {r.status === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive shrink-0" />
              )}
              <span className="font-medium">{r.issueKey || r.issueId}</span>
              {r.status === 'success' ? (
                <span className="text-muted-foreground">({r.hours}h)</span>
              ) : (
                <span className="text-destructive">{r.error}</span>
              )}
            </div>
          ))}
        </div>

        <Button variant="outline" onClick={onCancel} className="w-full">
          Close
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="mb-3 text-sm font-medium text-muted-foreground">
          Common values
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Date</label>
            <Input
              type="date"
              value={commonDate}
              onChange={(e) => setCommonDate(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Duration</label>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min={0}
                max={24}
                value={commonHours}
                onChange={(e) =>
                  setCommonHours(Math.max(0, Number(e.target.value)))
                }
                className="w-16"
              />
              <span className="text-xs text-muted-foreground">h</span>
              <Input
                type="number"
                min={0}
                max={59}
                value={commonMinutes}
                onChange={(e) =>
                  setCommonMinutes(
                    Math.min(59, Math.max(0, Number(e.target.value))),
                  )
                }
                className="w-16"
              />
              <span className="text-xs text-muted-foreground">m</span>
            </div>
          </div>
        </div>
      </div>

      {!hasEntries ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed p-8">
          <AlertTriangle className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No tasks selected. Add tasks to start bulk logging.
          </p>
          {onAddTasks && (
            <Button variant="outline" size="sm" onClick={onAddTasks}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add Tasks
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium">
                    Task
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    Duration
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    Comment
                  </th>
                  <th className="w-10 px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr
                    key={task.issueId}
                    className="border-b last:border-b-0 hover:bg-muted/30"
                  >
                    <td className="px-3 py-2">
                      <span className="font-medium">
                        {task.issueKey}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground truncate max-w-[120px] inline-block align-middle">
                        {task.summary}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {hasOverride(task.issueId) ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min={0}
                            max={24}
                            value={
                              overrides[task.issueId].durationHours ?? 0
                            }
                            onChange={(e) =>
                              updateOverride(
                                task.issueId,
                                'durationHours',
                                Math.max(0, Number(e.target.value)),
                              )
                            }
                            className="w-14 h-8 text-xs"
                          />
                          <span className="text-xs text-muted-foreground">
                            h
                          </span>
                          <Input
                            type="number"
                            min={0}
                            max={59}
                            value={
                              overrides[task.issueId].durationMinutes ??
                              0
                            }
                            onChange={(e) =>
                              updateOverride(
                                task.issueId,
                                'durationMinutes',
                                Math.min(
                                  59,
                                  Math.max(0, Number(e.target.value)),
                                ),
                              )
                            }
                            className="w-14 h-8 text-xs"
                          />
                          <span className="text-xs text-muted-foreground">
                            m
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              clearOverride(task.issueId)
                            }
                            className="ml-1 text-muted-foreground hover:text-foreground"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setOverrides((prev) => ({
                              ...prev,
                              [task.issueId]: {},
                            }))
                          }
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {getDurationDisplay(task.issueId)}{' '}
                          <span className="text-xs">⬇</span>
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {hasOverride(task.issueId) &&
                      overrides[task.issueId].comment !==
                        undefined ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={
                              overrides[task.issueId].comment ?? ''
                            }
                            onChange={(e) =>
                              updateOverride(
                                task.issueId,
                                'comment',
                                e.target.value,
                              )
                            }
                            className="h-8 text-xs w-full max-w-[160px]"
                            placeholder="Add comment..."
                          />
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setOverrides((prev) => ({
                              ...prev,
                              [task.issueId]: {
                                ...prev[task.issueId],
                                comment: '',
                              },
                            }))
                          }
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          + Add comment
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() =>
                          onRemoveTask?.(task.issueId)
                        }
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {onAddTasks && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onAddTasks}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add Task
            </Button>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="text-sm text-muted-foreground">
              {tasks.length} task{tasks.length !== 1 ? 's' : ''} ·{' '}
              {secondsToDisplay(
                entries.reduce(
                  (sum, e) => sum + e.durationSeconds,
                  0,
                ),
              )}{' '}
              total
            </div>
            <div className="flex gap-2">
              {onCancel && (
                <Button
                  variant="outline"
                  onClick={onCancel}
                  disabled={isPending}
                >
                  Cancel
                </Button>
              )}
              <Button
                onClick={handleSubmit}
                disabled={isPending || !hasEntries}
              >
                {isPending && (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                )}
                Submit All
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
