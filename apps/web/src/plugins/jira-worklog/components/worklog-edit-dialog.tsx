import { useState, useEffect } from 'react';
import { Calendar, Clock, Loader2, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { DatePicker } from '@/shared/components/ui/date-picker';
import { TimePicker } from '@/shared/components/ui/time-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/modal';
import {
  useWorklog,
  useUpdateWorklog,
  useIssueInfo,
} from '../api/worklog';

interface WorklogEditDialogProps {
  worklogId: string;
  issueId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  onDelete?: () => void;
}

export function WorklogEditDialog({
  worklogId,
  issueId,
  open,
  onOpenChange,
  onSuccess,
  onDelete,
}: WorklogEditDialogProps) {
  const { t } = useTranslation();
  const { data: worklog, isLoading } = useWorklog(worklogId, issueId);
  const { data: issue } = useIssueInfo(issueId);

  const [date, setDate] = useState('');
  const [startH, setStartH] = useState(0);
  const [startM, setStartM] = useState(0);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [comment, setComment] = useState('');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (worklog && !initialized) {
      const utc = new Date(worklog.started);
      const d = `${utc.getFullYear()}-${String(utc.getMonth() + 1).padStart(2, '0')}-${String(utc.getDate()).padStart(2, '0')}`;
      const h = Math.floor(worklog.timeSpentSeconds / 3600);
      const m = Math.floor((worklog.timeSpentSeconds % 3600) / 60);
      setDate(d);
      setStartH(utc.getHours());
      setStartM(utc.getMinutes());
      setHours(h);
      setMinutes(m);
      setComment(worklog.comment ?? '');
      setInitialized(true);
    }
  }, [worklog, initialized]);

  useEffect(() => {
    if (!open) {
      setInitialized(false);
      updateMutation.reset();
    }
  }, [open]);

  const updateMutation = useUpdateWorklog();

  const handleSubmit = () => {
    if (hours <= 0 && minutes <= 0) return;

    const durationSeconds = hours * 3600 + minutes * 60;
    const local = new Date(
      `${date}T${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}:00`,
    );
    const started = local.toISOString().replace('Z', '+0000');

    updateMutation.mutate(
      {
        worklogId,
        issueId,
        started,
        durationSeconds,
        comment: comment || undefined,
      },
      {
        onSuccess: (res) => {
          if (res.success) {
            onSuccess?.();
            onOpenChange(false);
          }
        },
      },
    );
  };

  const handleClose = () => {
    if (!updateMutation.isPending) {
      onOpenChange(false);
    }
  };

  const errorMessage =
    updateMutation.error instanceof Error
      ? updateMutation.error.message
      : updateMutation.data && !updateMutation.data.success
        ? updateMutation.data.message
        : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[400px] gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-base font-semibold">
            {t('worklog.edit_worklog')}
          </DialogTitle>
          <DialogDescription className="text-xs leading-normal pt-1 w-full overflow-hidden">
            {issue ? (
              <span className="grid grid-cols-[auto_1fr] gap-1.5 items-baseline min-w-0">
                <span className="font-mono font-medium text-foreground/80 whitespace-nowrap">{issue.key}</span>
                <span className="truncate">{issue.summary}</span>
              </span>
            ) : (
              t('common.loading')
            )}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col gap-4 px-6 py-8">
            <div className="h-9 w-full rounded-md bg-muted animate-pulse" />
            <div className="h-9 w-full rounded-md bg-muted animate-pulse" />
            <div className="h-9 w-full rounded-md bg-muted animate-pulse" />
            <div className="h-16 w-full rounded-md bg-muted animate-pulse" />
          </div>
        ) : worklog ? (
          <div className="px-6 py-5 space-y-6">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {t('worklog.date_start')}
              </Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <DatePicker
                  value={date}
                  onChange={setDate}
                  className="w-full sm:flex-1"
                />
                <TimePicker
                  value={`${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`}
                  onChange={(timeVal) => {
                    const [h, m] = timeVal.split(':').map(Number);
                    setStartH(h);
                    setStartM(m);
                  }}
                  className="w-full sm:w-auto"
                />
              </div>
            </div>

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

            <div className="space-y-1.5">
              <Label htmlFor="edit-comment" className="text-xs text-muted-foreground">
                {t('worklog.comment')}
              </Label>
              <Textarea
                id="edit-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What did you work on?"
                className="h-20 resize-none text-sm"
              />
            </div>

            {errorMessage && (
              <p className="text-sm text-destructive bg-destructive/5 rounded-md px-3 py-2">
                {errorMessage}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
            <Clock className="h-8 w-8 opacity-40" />
            <p className="text-sm">Worklog not found</p>
          </div>
        )}

        {worklog && (
          <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/30">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1.5 text-xs px-2.5 h-8"
              onClick={onDelete}
              disabled={updateMutation.isPending}
            >
              <Trash2 className="h-4 w-4" />
              {t('common.delete')}
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClose}
                disabled={updateMutation.isPending}
              >
                {t('common.cancel')}
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={updateMutation.isPending || (hours <= 0 && minutes <= 0)}
              >
                {updateMutation.isPending && (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                )}
                {updateMutation.isPending ? t('worklog.saving') : t('worklog.save_changes')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
