import { Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/modal';
import {
  useBulkDeleteWorklogs,
  type BulkDeleteResult,
} from '../api/bulk-worklog';

interface WorklogForDelete {
  worklogId: string;
  issueId: string;
  issueKey: string;
  date: string;
  hours: number;
}

interface BulkDeleteDialogProps {
  entries: WorklogForDelete[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: (result: BulkDeleteResult) => void;
}

export function BulkDeleteDialog({
  entries,
  open,
  onOpenChange,
  onComplete,
}: BulkDeleteDialogProps) {
  const deleteMutation = useBulkDeleteWorklogs();

  const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);
  const result = deleteMutation.data?.data;

  const handleDelete = () => {
    deleteMutation.mutate(
      entries.map((e) => ({
        worklogId: e.worklogId,
        issueId: e.issueId,
      })),
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
    if (!deleteMutation.isPending) {
      deleteMutation.reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Worklogs
          </DialogTitle>
          <DialogDescription>
            {entries.length} worklog{entries.length !== 1 ? 's' : ''}{' '}
            selected · {totalHours}h total
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="font-semibold">
                {result.succeeded} worklogs deleted
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
            <div className="max-h-48 overflow-y-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-1.5 text-left font-medium text-xs">
                      Task
                    </th>
                    <th className="px-3 py-1.5 text-left font-medium text-xs">
                      Date
                    </th>
                    <th className="px-3 py-1.5 text-right font-medium text-xs">
                      Hours
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr
                      key={e.worklogId}
                      className="border-b last:border-b-0"
                    >
                      <td className="px-3 py-1.5 font-medium">
                        {e.issueKey}
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground">
                        {e.date}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        {e.hours}h
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/50 font-medium">
                    <td
                      colSpan={2}
                      className="px-3 py-1.5 text-right text-xs"
                    >
                      Total
                    </td>
                    <td className="px-3 py-1.5 text-right text-xs">
                      {totalHours}h
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <p className="text-sm text-destructive">
              This action cannot be undone. These worklogs will be permanently
              deleted from Jira.
            </p>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending && (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                )}
                Delete {entries.length} Worklogs
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
