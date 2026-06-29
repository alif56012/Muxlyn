import { PieChart, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { usePlannerStore } from '../../state/planner-store';
import { IssueSearchSelect } from '../issue-search-select';

const MAX_TASKS = 20;

export function DistributeTaskEditor() {
  const { t } = useTranslation();
  const distributeTasks = usePlannerStore((s) => s.distributeTasks);
  const addDistributeTask = usePlannerStore((s) => s.addDistributeTask);
  const updateDistributeTask = usePlannerStore((s) => s.updateDistributeTask);
  const removeDistributeTask = usePlannerStore((s) => s.removeDistributeTask);
  const autoDistribute = usePlannerStore((s) => s.autoDistribute);

  const [showForm, setShowForm] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<{
    id: string;
    key: string;
    summary: string;
  } | null>(null);

  const totalPct = distributeTasks.reduce((sum, t) => sum + t.percentage, 0);
  const isValid = Math.abs(totalPct - 100) <= 0.5;

  function handleAdd() {
    if (distributeTasks.length >= MAX_TASKS) return;
    if (!selectedIssue) return;

    addDistributeTask({
      id: '',
      issueId: selectedIssue.id,
      issueKey: selectedIssue.key,
      issueSummary: selectedIssue.summary,
      percentage: 0,
    });
    setSelectedIssue(null);
    setShowForm(false);
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 text-sm font-medium">
            <PieChart size={14} className="text-muted-foreground" />
            {t('smartWorklog.distributeTasks')}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('smartWorklog.distributeTasks_desc')}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Total badge */}
          {distributeTasks.length > 0 && (
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${
                isValid
                  ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                  : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
              }`}
            >
              {totalPct.toFixed(0)}%
            </span>
          )}
          {distributeTasks.length > 0 && (
            <Button size="sm" variant="ghost" onClick={autoDistribute}>
              Auto
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowForm(!showForm)}
            disabled={distributeTasks.length >= MAX_TASKS}
          >
            <Plus size={14} className="mr-1" />
            <span className="hidden sm:inline">{t('smartWorklog.addDistributeTask')}</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* Add form */}
      {showForm && distributeTasks.length < MAX_TASKS && (
        <div className="flex gap-2 rounded-lg border bg-muted/30 p-3 items-end">
          <IssueSearchSelect
            value={selectedIssue}
            onChange={setSelectedIssue}
            placeholder={t('smartWorklog.searchTask')}
            className="h-9 text-sm"
          />
          <Button size="sm" onClick={handleAdd} disabled={!selectedIssue} className="shrink-0 h-9">
            Add
          </Button>
        </div>
      )}

      {/* Empty state */}
      {distributeTasks.length === 0 && !showForm && (
        <p className="text-xs text-muted-foreground italic">No distribute tasks added</p>
      )}

      {/* Validation message */}
      {distributeTasks.length > 0 && !isValid && (
        <p className="text-xs text-red-600 dark:text-red-400">
          {t('smartWorklog.allocationError', { percent: totalPct.toFixed(0) })}
        </p>
      )}

      {/* Task list */}
      {distributeTasks.length > 0 && (
        <div className="space-y-1.5">
          {distributeTasks.map((task) => (
            <div
              key={task.id}
              className="flex flex-col gap-1.5 rounded-lg border bg-card px-3 py-2.5 text-sm sm:flex-row sm:items-center sm:gap-3"
            >
              <div className="min-w-0 flex-1 sm:flex-initial sm:w-64 flex flex-col sm:flex-row sm:items-center gap-1.5">
                <span className="font-medium text-foreground shrink-0">{task.issueKey}</span>
                {task.issueSummary && (
                  <span className="text-muted-foreground truncate text-xs flex-1">
                    {task.issueSummary}
                  </span>
                )}
              </div>

              {/* Slider */}
              <div className="flex flex-1 items-center gap-2 min-w-0">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={task.percentage}
                  onChange={(e) =>
                    updateDistributeTask(task.id, {
                      percentage: Number(e.target.value),
                    })
                  }
                  className="flex-1 min-w-0 accent-blue-500 cursor-pointer"
                />
                {/* Number input for direct edit */}
                <div className="flex items-center gap-0.5 shrink-0">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={task.percentage}
                    onChange={(e) =>
                      updateDistributeTask(task.id, {
                        percentage: Math.min(100, Math.max(0, Number(e.target.value))),
                      })
                    }
                    className="h-7 w-14 text-right text-sm px-2 tabular-nums"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => removeDistributeTask(task.id)}
                className="shrink-0 self-end sm:self-auto text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
