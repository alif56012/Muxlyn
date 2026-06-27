import { useState, useCallback } from 'react';
import { Search, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/modal';
import { cn } from '@/shared/lib/utils';
import {
  useIssueSearch,
  type IssueSearchItem,
} from '../api/search';
import {
  useCreateWorklog,
  type CreateWorklogInput,
} from '../api/worklog';

interface CalendarCreateDialogProps {
  date: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export function CalendarCreateDialog({
  date,
  open,
  onOpenChange,
  onCreated,
}: CalendarCreateDialogProps) {
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState<IssueSearchItem[] | null>(null);
  const [selectedIssue, setSelectedIssue] =
    useState<IssueSearchItem | null>(null);
  const [hours, setHours] = useState(2);
  const [minutes, setMinutes] = useState(0);
  const [comment, setComment] = useState('');
  const [created, setCreated] = useState(false);

  const searchMutation = useIssueSearch();
  const createMutation = useCreateWorklog();
  const isLoading = searchMutation.isPending || createMutation.isPending;

  const handleSearch = useCallback(() => {
    if (!searchText.trim()) return;
    searchMutation.mutate(
      { freeText: searchText.trim() },
      {
        onSuccess: (res) => {
          if (res.data) setResults(res.data.items);
        },
      },
    );
  }, [searchText, searchMutation]);

  const handleSelectIssue = useCallback((issue: IssueSearchItem) => {
    setSelectedIssue(issue);
    setResults(null);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!selectedIssue) return;
    const input: CreateWorklogInput = {
      issueId: selectedIssue.id,
      date,
      durationSeconds: hours * 3600 + minutes * 60,
      comment: comment || undefined,
    };
    createMutation.mutate(input, {
      onSuccess: () => {
        setCreated(true);
        onCreated?.();
      },
    });
  }, [selectedIssue, date, hours, minutes, comment, createMutation, onCreated]);

  const handleClose = () => {
    onOpenChange(false);
    if (!createMutation.isPending) {
      setTimeout(() => {
        setSearchText('');
        setResults(null);
        setSelectedIssue(null);
        setHours(2);
        setMinutes(0);
        setComment('');
        setCreated(false);
        searchMutation.reset();
        createMutation.reset();
      }, 200);
    }
  };

  const errorText =
    createMutation.data && !createMutation.data.success
      ? createMutation.data.message
      : null;

  const displayDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Work</DialogTitle>
          <DialogDescription>{displayDate}</DialogDescription>
        </DialogHeader>

        {created ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
            <p className="text-lg font-semibold">Worklog saved</p>
            <p className="text-sm text-muted-foreground">
              {selectedIssue?.key} · {hours}h {minutes > 0 ? `${minutes}m` : ''} · {displayDate}
            </p>
            <Button onClick={handleClose} className="w-full">
              Close
            </Button>
          </div>
        ) : selectedIssue ? (
          <div className="space-y-4">
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedIssue(null);
                    setResults([]);
                    setSearchText('');
                  }}
                  className="text-muted-foreground hover:text-foreground text-xs"
                >
                  ← Change
                </button>
              </div>
              <p className="font-medium mt-1">{selectedIssue.key}</p>
              <p className="text-sm text-muted-foreground truncate">
                {selectedIssue.summary}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedIssue.issueType} · {selectedIssue.status} ·{' '}
                {selectedIssue.projectKey}
              </p>
              {selectedIssue.isSubtask && (
                <p className="text-xs text-destructive mt-1">
                  Cannot log work on sub-tasks
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Duration</Label>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  max={24}
                  value={hours}
                  onChange={(e) =>
                    setHours(Math.max(0, Number(e.target.value)))
                  }
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">h</span>
                <Input
                  type="number"
                  min={0}
                  max={59}
                  value={minutes}
                  onChange={(e) =>
                    setMinutes(
                      Math.min(59, Math.max(0, Number(e.target.value))),
                    )
                  }
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">m</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cal-comment">Comment</Label>
              <Input
                id="cal-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What did you work on?"
              />
            </div>

            {errorText && (
              <p className="text-sm text-destructive">{errorText}</p>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  isLoading ||
                  selectedIssue.isSubtask ||
                  (hours === 0 && minutes === 0)
                }
              >
                {createMutation.isPending && (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                )}
                Log {hours}h {minutes > 0 ? `${minutes}m` : ''}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search issue by key or summary..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-8"
                autoFocus
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={isLoading || !searchText.trim()}
              className="w-full"
            >
              {searchMutation.isPending && (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              )}
              Search
            </Button>

            {results && results.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">
                No issues found.
              </p>
            )}

            {results && results.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-md border">
                {results.map((issue) => (
                  <button
                    key={issue.id}
                    type="button"
                    onClick={() => handleSelectIssue(issue)}
                    disabled={issue.isSubtask}
                    className={cn(
                      'w-full text-left px-3 py-2 border-b last:border-b-0 hover:bg-muted/50 transition-colors',
                      issue.isSubtask && 'opacity-50',
                    )}
                  >
                    <span className="font-medium text-sm">
                      {issue.key}
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground truncate">
                      {issue.summary}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
