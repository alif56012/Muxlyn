import { AlertTriangle, Clock, Filter, Loader2, Search } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Input } from '@/shared/components/ui/input';
import { cn } from '@/shared/lib/utils';
import { type IssueSearchItem, useIssueSearch, type WorklogSearchFilters } from '../api/search';
import { type CreateWorklogInput, useCreateWorklog } from '../api/worklog';
import { BulkCreateForm } from './bulk-create-form';

interface LogWorkTabProps {
  onWorklogCreated?: () => void;
}

export function LogWorkTab({ onWorklogCreated }: LogWorkTabProps) {
  const [freeText, setFreeText] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkTasks, setBulkTasks] = useState<IssueSearchItem[]>([]);
  const [searchFilters, setSearchFilters] = useState<WorklogSearchFilters | null>(null);
  const [suggestQ, setSuggestQ] = useState<string | null>(null);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const { data: issueResult, isLoading } = useIssueSearch(searchFilters, !!searchFilters);
  const { data: suggestResult, isLoading: suggestLoading } = useIssueSearch(
    suggestQ ? { freeText: suggestQ } : null,
    !!suggestQ,
  );
  const createMutation = useCreateWorklog();

  const issues = issueResult?.items ?? [];
  const suggestions = (suggestResult?.items ?? []).slice(0, 5);

  const [creating, setCreating] = useState<Record<string, boolean>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleInputChange = useCallback((val: string) => {
    setFreeText(val);
    setShowResults(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length >= 2) {
      debounceRef.current = setTimeout(() => {
        setSuggestQ(val.trim());
        setSuggestOpen(true);
      }, 250);
    } else {
      setSuggestQ(null);
      setSuggestOpen(false);
    }
  }, []);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  const handleSearch = useCallback(() => {
    if (!freeText.trim()) return;
    setShowResults(true);
    setBulkMode(false);
    setBulkTasks([]);
    setSuggestOpen(false);
    setSearchFilters({ freeText: freeText.trim() });
  }, [freeText]);

  const handleSuggestionClick = useCallback((issue: IssueSearchItem) => {
    setFreeText(issue.key);
    setSuggestOpen(false);
    setShowResults(true);
    setBulkMode(false);
    setBulkTasks([]);
    setSearchFilters({ freeText: issue.key });
  }, []);

  const handleQuickLog = useCallback(
    (issue: IssueSearchItem) => {
      if (issue.isSubtask) return;
      setCreating((prev) => ({ ...prev, [issue.id]: true }));
      const now = new Date();
      const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const started = new Date(`${date}T00:00:00`)
        .toISOString()
        .replace('Z', '+0000');
      const input: CreateWorklogInput = {
        issueId: issue.id,
        date,
        durationSeconds: 7200,
        started,
      };
      createMutation.mutate(input, {
        onSuccess: (res) => {
          setCreating((prev) => ({ ...prev, [issue.id]: false }));
          if (res.success && res.data) {
            setSuccessMessage(`Logged ${res.data.hours}h on ${res.data.issueKey}`);
            onWorklogCreated?.();
            setTimeout(() => setSuccessMessage(null), 3000);
          }
        },
        onError: () => {
          setCreating((prev) => ({ ...prev, [issue.id]: false }));
        },
      });
    },
    [createMutation, onWorklogCreated],
  );

  const toggleBulkSelect = useCallback((issue: IssueSearchItem) => {
    if (issue.isSubtask) return;
    setBulkTasks((prev) => {
      const exists = prev.find((t) => t.id === issue.id);
      if (exists) return prev.filter((t) => t.id !== issue.id);
      return [...prev, issue];
    });
  }, []);

  if (bulkMode && bulkTasks.length > 0) {
    return (
      <BulkCreateForm
        tasks={bulkTasks.map((t) => ({
          issueId: t.id,
          issueKey: t.key,
          summary: t.summary,
        }))}
        onRemoveTask={(issueId) => setBulkTasks((prev) => prev.filter((t) => t.id !== issueId))}
        onCancel={() => {
          setBulkMode(false);
          setBulkTasks([]);
        }}
        onComplete={() => {
          setBulkMode(false);
          setBulkTasks([]);
          setShowResults(false);
          onWorklogCreated?.();
        }}
      />
    );
  }

  if (bulkMode) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <AlertTriangle className="h-8 w-8 text-muted-foreground" />
        <p className="text-muted-foreground">No tasks selected for bulk logging.</p>
        <Button variant="outline" onClick={() => setBulkMode(false)}>
          Back to Search
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by issue key or summary..."
            value={freeText}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => suggestions.length > 0 && setSuggestOpen(true)}
            onBlur={() => setTimeout(() => setSuggestOpen(false), 200)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-8"
          />

          {/* Suggestion dropdown */}
          {suggestOpen && suggestions.length > 0 && !showResults && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border bg-popover shadow-md">
              <div className="p-1">
                {suggestions.map((issue) => (
                  <button
                    key={issue.id}
                    type="button"
                    onClick={() => handleSuggestionClick(issue)}
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                  >
                    <span className="font-mono text-xs text-primary shrink-0">{issue.key}</span>
                    <span className="truncate text-muted-foreground">{issue.summary}</span>
                    {issue.isSubtask && (
                      <span className="text-[10px] text-destructive shrink-0 ml-auto">sub-task</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {suggestOpen && suggestLoading && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border bg-popover shadow-md">
              <div className="flex items-center justify-center py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>
        <Button onClick={handleSearch} disabled={isLoading} size="sm">
          {isLoading && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
          Search
        </Button>
      </div>

      {successMessage && (
        <div className="rounded-md bg-green-50 dark:bg-green-950/20 px-4 py-2 text-sm text-green-700 dark:text-green-300">
          {successMessage}
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && showResults && issues.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
          <Filter className="h-8 w-8" />
          <p>No issues found. Try a different search term.</p>
        </div>
      )}

      {!isLoading && issues.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {issues.length} issue{issues.length !== 1 ? 's' : ''} found
            </p>
            {bulkTasks.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setBulkMode(true)}>
                Bulk Log ({bulkTasks.length})
              </Button>
            )}
          </div>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="w-10 px-3 py-2">
                    <Checkbox
                      checked={
                        issues.length > 0 &&
                        issues
                          .filter((i) => !i.isSubtask)
                          .every((i) => bulkTasks.find((t) => t.id === i.id))
                      }
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setBulkTasks(issues.filter((i) => !i.isSubtask));
                        } else {
                          setBulkTasks([]);
                        }
                      }}
                    />
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-xs">Issue</th>
                  <th className="px-3 py-2 text-left font-medium text-xs">Type</th>
                  <th className="px-3 py-2 text-left font-medium text-xs">Status</th>
                  <th className="px-3 py-2 text-left font-medium text-xs">Project</th>
                  <th className="w-10 px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {issues.map((issue) => (
                  <tr
                    key={issue.id}
                    className={cn(
                      'border-b last:border-b-0 hover:bg-muted/30',
                      issue.isSubtask && 'opacity-50',
                    )}
                  >
                    <td className="w-10 px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        disabled={issue.isSubtask}
                        checked={bulkTasks.some((t) => t.id === issue.id)}
                        onCheckedChange={() => toggleBulkSelect(issue)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{issue.key}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {issue.summary}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {issue.issueType}
                      {issue.isSubtask && (
                        <AlertTriangle className="ml-1 inline h-3 w-3 text-destructive" />
                      )}
                    </td>
                    <td className="px-3 py-2">{issue.status}</td>
                    <td className="px-3 py-2 text-muted-foreground">{issue.projectKey}</td>
                    <td className="px-3 py-2">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={issue.isSubtask || creating[issue.id]}
                        onClick={() => handleQuickLog(issue)}
                        title={issue.isSubtask ? 'Cannot log on sub-tasks' : 'Quick Log 2h'}
                      >
                        {creating[issue.id] ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Clock className="h-4 w-4" />
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!showResults && !isLoading && (
        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          <Search className="h-8 w-8" />
          <p>Search for Jira issues to log work</p>
          <p className="text-xs">
            Click the clock icon for quick 2h log, or select multiple for bulk logging
          </p>
        </div>
      )}
    </div>
  );
}
