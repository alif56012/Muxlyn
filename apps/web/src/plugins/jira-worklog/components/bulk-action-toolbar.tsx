import { Trash2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';

interface BulkActionToolbarProps {
  selectedCount: number;
  onBulkEdit?: () => void;
  onBulkDelete?: () => void;
  onClear?: () => void;
  className?: string;
}

export function BulkActionToolbar({
  selectedCount,
  onBulkEdit,
  onBulkDelete,
  onClear,
  className,
}: BulkActionToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-2',
        className,
      )}
    >
      <span className="text-sm font-medium text-muted-foreground">
        {selectedCount} selected
      </span>

      <div className="flex-1" />

      {onBulkEdit && (
        <Button variant="outline" size="sm" onClick={onBulkEdit}>
          Bulk Edit
        </Button>
      )}

      {onBulkDelete && (
        <Button
          variant="destructive"
          size="sm"
          onClick={onBulkDelete}
        >
          <Trash2 className="mr-1.5 h-4 w-4" />
          Delete
        </Button>
      )}

      {onClear && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear
        </Button>
      )}
    </div>
  );
}
