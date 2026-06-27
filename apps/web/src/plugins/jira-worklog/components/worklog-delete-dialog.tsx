import type React from 'react';
import { Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/modal';
import {
  useWorklog,
  useDeleteWorklog,
} from '../api/worklog';

interface WorklogDeleteDialogProps {
  worklogId: string;
  issueId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function WorklogDeleteDialog({
  worklogId,
  issueId,
  open,
  onOpenChange,
  onSuccess,
}: WorklogDeleteDialogProps) {
  const { data: worklog, isLoading } = useWorklog(worklogId, issueId);
  const deleteMutation = useDeleteWorklog();

  const handleDelete = () => {
    deleteMutation.mutate(
      { worklogId, issueId },
      {
        onSuccess: (res) => {
          if (res.success) {
            onSuccess?.();
            onOpenChange(false);
            deleteMutation.reset();
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

  const errorMessage =
    deleteMutation.error instanceof Error
      ? deleteMutation.error.message
      : deleteMutation.data && !deleteMutation.data.success
        ? deleteMutation.data.message
        : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Worklog
          </DialogTitle>
          <DialogDescription>
            {isLoading
              ? 'Loading...'
              : 'This action cannot be undone.'}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : worklog ? (
          <div className="space-y-4">
            <div className="rounded-md border bg-muted/30 p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Task</span>
                <span className="font-medium">{worklog.issueId}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Date</span>
                <span>{worklog.started.slice(0, 10)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Hours</span>
                <span className="font-medium">{worklog.hours}h</span>
              </div>
              {worklog.comment && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Comment</span>
                  <span className="max-w-[160px] truncate">
                    {worklog.comment}
                  </span>
                </div>
              )}
            </div>

            {errorMessage && (
              <p className="text-sm text-destructive">{errorMessage}</p>
            )}

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
                Delete
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground py-8">
            Worklog not found.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
