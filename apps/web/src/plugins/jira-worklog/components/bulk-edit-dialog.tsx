import { useState } from 'react';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
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
  useBulkEditWorklogs,
  type BulkEditResult,
} from '../api/bulk-worklog';

interface WorklogInfo {
  worklogId: string;
  issueId: string;
  issueKey: string;
}

interface BulkEditDialogProps {
  entries: WorklogInfo[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: (result: BulkEditResult) => void;
}

export function BulkEditDialog({
  entries,
  open,
  onOpenChange,
  onComplete,
}: BulkEditDialogProps) {
  const [date, setDate] = useState('');
  const [comment, setComment] = useState('');

  const editMutation = useBulkEditWorklogs();

  const hasChanges = date !== '' || comment !== '';

  const resetForm = () => {
    setDate('');
    setComment('');
    editMutation.reset();
  };

  const result = editMutation.data?.data;

  const handleSubmit = () => {
    if (!hasChanges) return;

    const updates: { date?: string; comment?: string } = {};
    if (date) updates.date = date;
    if (comment !== undefined && comment !== '') {
      updates.comment = comment;
    }

    editMutation.mutate(
      {
        entries: entries.map((e) => ({
          worklogId: e.worklogId,
          issueId: e.issueId,
        })),
        updates,
      },
      {
        onSuccess: (res) => {
          if (res.data && res.success) {
            onComplete?.(res.data);
          }
        },
      },
    );
  };

  const handleClose = () => {
    onOpenChange(false);
    if (!editMutation.isPending) {
      resetForm();
    }
  };

  const fieldsChanged: string[] = [];
  if (date) fieldsChanged.push('Date');
  if (comment !== '') fieldsChanged.push('Comment');

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Edit</DialogTitle>
          <DialogDescription>
            {entries.length} worklog{entries.length !== 1 ? 's' : ''} selected
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="font-semibold">
                {result.succeeded} worklogs updated
                {result.failed > 0 && (
                  <span className="text-destructive">
                    {' '}
                    · {result.failed} failed
                  </span>
                )}
              </span>
            </div>

            {result.failed > 0 && (
              <div className="max-h-32 overflow-y-auto space-y-1 rounded-md border p-2">
                {result.results
                  .filter((r) => r.status === 'failed')
                  .map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded px-2 py-1 text-sm bg-red-50 dark:bg-red-950/20"
                    >
                      <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                      <span className="text-destructive text-xs">
                        {r.error}
                      </span>
                    </div>
                  ))}
              </div>
            )}

            <Button
              variant="outline"
              onClick={handleClose}
              className="w-full"
            >
              Close
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-edit-date">Date</Label>
              <Input
                id="bulk-edit-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="Leave blank to keep current"
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to keep current date
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulk-edit-comment">Comment</Label>
              <Input
                id="bulk-edit-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Leave blank to keep current"
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to keep current comment
              </p>
            </div>

            {hasChanges && (
              <div className="rounded-md border bg-muted/30 p-3">
                <p className="text-sm font-medium">Preview</p>
                <p className="text-xs text-muted-foreground">
                  {entries.length} worklogs will be updated:
                </p>
                <ul className="mt-1 text-xs text-muted-foreground list-disc list-inside">
                  {fieldsChanged.map((f) => (
                    <li key={f}>{f} will be changed</li>
                  ))}
                  {!date && <li>Date: (unchanged)</li>}
                  {!comment && <li>Comment: (unchanged)</li>}
                </ul>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!hasChanges || editMutation.isPending}
              >
                {editMutation.isPending && (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                )}
                Update {entries.length} Worklogs
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
