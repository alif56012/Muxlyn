import { useState, useCallback, useMemo } from 'react';
import { Search, Loader2, CheckCircle2, XCircle, Calendar, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { DatePicker } from '@/shared/components/ui/date-picker';
import { TimePicker } from '@/shared/components/ui/time-picker';
import { Checkbox } from '@/shared/components/ui/checkbox';
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
  useBulkCreateWorklogs,
  type BulkCreateEntry,
  type BulkCreateResult,
} from '../api/bulk-worklog';

interface CalendarCreateDialogProps {
  date: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function datesBetween(from: string, to: string): string[] {
  const dates: string[] = [];
  let current = from;
  while (current <= to) {
    dates.push(current);
    current = addDays(current, 1);
  }
  return dates;
}

function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  return day === 0 || day === 6;
}

function formatDisplayDate(d: string, locale: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function CalendarCreateDialog({
  date,
  open,
  onOpenChange,
  onCreated,
}: CalendarCreateDialogProps) {
  const { t, i18n } = useTranslation();
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState<IssueSearchItem[] | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<IssueSearchItem | null>(null);
  const [dateFrom, setDateFrom] = useState(date);
  const [dateTo, setDateTo] = useState(date);
  const [skipWeekends, setSkipWeekends] = useState(true);
  const [startH, setStartH] = useState(9);
  const [startM, setStartM] = useState(0);
  const [hours, setHours] = useState(2);
  const [minutes, setMinutes] = useState(0);
  const [comment, setComment] = useState('');
  const [result, setResult] = useState<BulkCreateResult | null>(null);

  const searchMutation = useIssueSearch();
  const createMutation = useBulkCreateWorklogs();
  const isLoading = searchMutation.isPending || createMutation.isPending;

  const dayCount = useMemo(() => {
    let days = datesBetween(dateFrom, dateTo);
    if (skipWeekends) {
      days = days.filter((d) => !isWeekend(d));
    }
    return Math.max(0, days.length);
  }, [dateFrom, dateTo, skipWeekends]);

  const totalHours = useMemo(() => {
    const durationSeconds = hours * 3600 + minutes * 60;
    return ((durationSeconds * dayCount) / 3600).toFixed(1);
  }, [hours, minutes, dayCount]);

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

  const handleSubmit = useCallback(() => {
    const targetIssueId = selectedIssue ? selectedIssue.id : searchText.trim();
    if (!targetIssueId) return;

    const durationSeconds = hours * 3600 + minutes * 60;
    let dates = datesBetween(dateFrom, dateTo);
    if (skipWeekends) {
      dates = dates.filter((d) => !isWeekend(d));
    }
    if (dates.length === 0) return;
    const started = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}:00`;
    const entries: BulkCreateEntry[] = dates.map((d) => ({
      issueId: targetIssueId,
      date: d,
      durationSeconds,
      comment: comment || undefined,
      started: `${d}T${started}.000+0000`,
    }));
    createMutation.mutate(entries, {
      onSuccess: (res) => {
        if (res.data && res.success) {
          setResult(res.data);
          onCreated?.();
        }
      },
    });
  }, [selectedIssue, searchText, dateFrom, dateTo, hours, minutes, comment, createMutation, onCreated, skipWeekends, startH, startM]);

  const handleClose = () => {
    onOpenChange(false);
    if (!createMutation.isPending) {
      setTimeout(() => {
        setSearchText('');
        setResults(null);
        setSelectedIssue(null);
        setDateFrom(date);
        setDateTo(date);
        setSkipWeekends(true);
        setStartH(9);
        setStartM(0);
        setHours(2);
        setMinutes(0);
        setComment('');
        setResult(null);
        searchMutation.reset();
        createMutation.reset();
      }, 200);
    }
  };

  const errorText =
    createMutation.data && !createMutation.data.success
      ? createMutation.data.message
      : null;

  const displayDate = formatDisplayDate(date, i18n.language);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[440px] gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-base font-semibold">{t('worklog.log_work')}</DialogTitle>
          <DialogDescription className="text-xs pt-1">{displayDate}</DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="px-6 py-6 space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="font-semibold text-sm">
                {t('worklog.saved_success', { count: result.succeeded })}
                {result.failed > 0 && <span className="text-destructive"> · {t('worklog.saved_failed', { count: result.failed })}</span>}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{t('worklog.total_hours', { hours: result.totalHours })}</p>
            {result.results.length > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-1 rounded-md border p-3">
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
                      <span className="text-destructive text-xs">{r.error}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
            <Button variant="outline" onClick={handleClose} className="w-full">{t('common.close')}</Button>
          </div>
        ) : (
          <>
            <div className="px-6 py-5 space-y-6 max-h-[60vh] overflow-y-auto">
              {/* Issue Input & Search */}
              <div className="space-y-1.5">
                <Label htmlFor="issue-key" className="text-xs text-muted-foreground">
                  {t('plugin.jiraWorklog.name')} ({t('worklog.search_button')} / Key)
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="issue-key"
                    placeholder={t('worklog.search_placeholder_dialog')}
                    value={searchText}
                    onChange={(e) => {
                      setSearchText(e.target.value);
                      setSelectedIssue(null);
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="h-9 text-sm flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={handleSearch}
                    disabled={isLoading || !searchText.trim()}
                    className="h-9 w-9 shrink-0"
                  >
                    {searchMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {selectedIssue && (
                  <div className="rounded-md border border-green-500/20 bg-green-50/50 dark:bg-green-950/10 p-2.5 mt-1.5 text-xs">
                    <p className="font-mono font-medium text-green-700 dark:text-green-400">Selected: {selectedIssue.key}</p>
                    <p className="text-muted-foreground truncate">{selectedIssue.summary}</p>
                  </div>
                )}
                {results && results.length === 0 && (
                  <p className="text-xs text-muted-foreground">No issues found.</p>
                )}
                {results && results.length > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded-md border divide-y bg-background mt-1.5">
                    {results.map((issue) => (
                      <button
                        key={issue.id}
                        type="button"
                        onClick={() => {
                          setSearchText(issue.key);
                          setSelectedIssue(issue);
                          setResults(null);
                        }}
                        disabled={issue.isSubtask}
                        className={cn(
                          'w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors text-xs flex justify-between items-center',
                          issue.isSubtask && 'opacity-50'
                        )}
                      >
                        <div className="truncate pr-2">
                          <span className="font-mono font-medium">{issue.key}</span>
                          <span className="ml-2 text-muted-foreground truncate">{issue.summary}</span>
                        </div>
                        {issue.isSubtask && <span className="text-[10px] text-destructive shrink-0">(sub-task)</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Date range */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {t('worklog.date_start')}
                </Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-[10px] text-muted-foreground">{t('worklog.start_date')}</Label>
                    <DatePicker
                      value={dateFrom}
                      onChange={(v) => {
                        setDateFrom(v);
                        if (v > dateTo) {
                          setDateTo(v);
                        }
                      }}
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-[10px] text-muted-foreground">{t('worklog.end_date')}</Label>
                    <DatePicker
                      value={dateTo}
                      onChange={(v) => {
                        setDateTo(v);
                        if (v < dateFrom) {
                          setDateFrom(v);
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="pt-1">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">{t('worklog.start_time')}</Label>
                    <TimePicker
                      value={`${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`}
                      onChange={(timeVal) => {
                        const [h, m] = timeVal.split(':').map(Number);
                        setStartH(h);
                        setStartM(m);
                      }}
                    />
                  </div>
                </div>
                {dayCount > 1 && (
                  <p className="text-[11px] text-muted-foreground">{t('worklog.entry', { count: dayCount })}</p>
                )}
              </div>

              {/* Duration */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {t('worklog.duration_per_day')}
                </Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-1.5">
                    <Input
                      type="number"
                      min={0}
                      max={24}
                      value={hours || ''}
                      placeholder="0"
                      onChange={(e) => setHours(Math.max(0, Math.min(24, parseInt(e.target.value) || 0)))}
                      className="h-9 text-center text-sm"
                    />
                    <span className="text-sm text-muted-foreground font-medium">{t('worklog.hours')}</span>
                  </div>
                  <div className="flex-1 flex items-center gap-1.5">
                    <Input
                      type="number"
                      min={0}
                      max={59}
                      value={minutes || ''}
                      placeholder="0"
                      onChange={(e) => setMinutes(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                      className="h-9 text-center text-sm"
                    />
                    <span className="text-sm text-muted-foreground font-medium">m</span>
                  </div>
                </div>
              </div>

              {/* Comment */}
              <div className="space-y-1.5">
                <Label htmlFor="create-comment" className="text-xs text-muted-foreground">{t('worklog.comment')}</Label>
                <Textarea
                  id="create-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="What did you work on?"
                  className="h-20 resize-none text-sm"
                />
              </div>

              {/* Skip weekends checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  id="skip-weekends-active"
                  checked={skipWeekends}
                  onCheckedChange={(checked) => setSkipWeekends(!!checked)}
                />
                <Label
                  htmlFor="skip-weekends-active"
                  className="text-xs text-muted-foreground font-normal cursor-pointer select-none"
                >
                  {t('worklog.skip_weekends')}
                </Label>
              </div>

              {errorText && (
                <p className="text-sm text-destructive bg-destructive/5 rounded-md px-3 py-2">
                  {errorText}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/30">
              <div className="text-sm text-muted-foreground">
                {t('worklog.entry', { count: dayCount })} · {t('worklog.total_hours', { hours: totalHours })}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleClose} disabled={isLoading}>
                  {t('common.cancel')}
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={
                    isLoading ||
                    (hours === 0 && minutes === 0) ||
                    dayCount === 0 ||
                    !searchText.trim() ||
                    (selectedIssue?.isSubtask || false)
                  }
                >
                  {createMutation.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                  {t('worklog.log_hours', { hours: totalHours })}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
