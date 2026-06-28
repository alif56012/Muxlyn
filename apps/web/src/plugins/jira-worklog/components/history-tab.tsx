import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Filter,
  Loader2,
  Search,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { Input } from '@/shared/components/ui/input';
import { cn } from '@/shared/lib/utils';
import { useWorklogSearch, type WorklogSearchFilters, type WorklogSearchItem } from '../api/search';
import { useBulkSelection } from '../hooks/use-bulk-selection';
import { BulkActionToolbar } from './bulk-action-toolbar';
import { BulkDeleteDialog } from './bulk-delete-dialog';
import { BulkEditDialog } from './bulk-edit-dialog';
import { WorklogDeleteDialog } from './worklog-delete-dialog';
import { WorklogEditDialog } from './worklog-edit-dialog';

type SortField = 'date' | 'hours' | 'issueKey' | 'projectKey' | 'author';
type SortDir = 'asc' | 'desc';

const ALL_COLUMNS = [
  { key: 'author', label: 'Author' },
  { key: 'issueKey', label: 'Issue Key' },
  { key: 'issueSummary', label: 'Summary' },
  { key: 'projectKey', label: 'Project' },
  { key: 'status', label: 'Status' },
  { key: 'assignee', label: 'Assignee' },
  { key: 'date', label: 'Date' },
  { key: 'hours', label: 'Hours' },
  { key: 'comment', label: 'Comment' },
] as const;

type ColumnKey = (typeof ALL_COLUMNS)[number]['key'];

const DEFAULT_VISIBLE: ColumnKey[] = [
  'issueKey',
  'issueSummary',
  'projectKey',
  'date',
  'hours',
  'comment',
];

export function HistoryTab() {
  const [freeText, setFreeText] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(DEFAULT_VISIBLE);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const [editTarget, setEditTarget] = useState<WorklogSearchItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorklogSearchItem | null>(null);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [searchFilters, setSearchFilters] = useState<WorklogSearchFilters | null>(null);

  const { data: result, isLoading } = useWorklogSearch(searchFilters);
  const selection = useBulkSelection();

  const buildFilters = useCallback(
    (p: number): WorklogSearchFilters => {
      const filters: WorklogSearchFilters = { page: p, pageSize: 50 };
      if (freeText) filters.freeText = freeText;
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;
      return filters;
    },
    [freeText, dateFrom, dateTo],
  );

  const handleSearch = useCallback(() => {
    setPage(1);
    selection.clear();
    setSearchFilters(buildFilters(1));
  }, [buildFilters, selection]);

  const handlePage = useCallback(
    (p: number) => {
      setPage(p);
      selection.clear();
      setSearchFilters(buildFilters(p));
    },
    [buildFilters, selection],
  );

  const sortedItems = useMemo(() => {
    if (!result?.items) return [];
    const sorted = [...result.items];
    sorted.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') {
        cmp = a.date.localeCompare(b.date);
      } else if (sortField === 'hours') {
        cmp = a.hours - b.hours;
      } else if (sortField === 'issueKey') {
        cmp = a.issueKey.localeCompare(b.issueKey);
      } else if (sortField === 'projectKey') {
        cmp = a.projectKey.localeCompare(b.projectKey);
      } else if (sortField === 'author') {
        cmp = (a.author ?? '').localeCompare(b.author ?? '');
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [result, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const sortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-30" />;
    return sortDir === 'asc' ? (
      <ArrowUp className="ml-1 h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3" />
    );
  };

  const allIds = useMemo(() => sortedItems.map((i) => i.worklogId), [sortedItems]);

  const cellValue = (item: WorklogSearchItem, col: ColumnKey) => {
    switch (col) {
      case 'author':
        return item.author ?? '-';
      case 'issueKey':
        return item.issueKey;
      case 'issueSummary':
        return item.issueSummary;
      case 'projectKey':
        return item.projectKey;
      case 'status':
        return item.status;
      case 'assignee':
        return item.assignee ?? '-';
      case 'date':
        return item.date;
      case 'hours':
        return `${item.hours}h`;
      case 'comment':
        return item.comment ?? '-';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by issue key or summary..."
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-8"
          />
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-36"
            placeholder="From"
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-36"
            placeholder="To"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleSearch} disabled={isLoading} size="sm">
            {isLoading && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Search
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Columns3 className="mr-1.5 h-4 w-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {ALL_COLUMNS.map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.key}
                  checked={visibleColumns.includes(col.key)}
                  onCheckedChange={(checked) =>
                    setVisibleColumns((prev) =>
                      checked ? [...prev, col.key] : prev.filter((c) => c !== col.key),
                    )
                  }
                >
                  {col.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <BulkActionToolbar
        selectedCount={selection.count}
        onBulkEdit={() => setBulkEditOpen(true)}
        onBulkDelete={() => setBulkDeleteOpen(true)}
        onClear={selection.clear}
      />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !result ? (
        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          <Filter className="h-8 w-8" />
          <p>Search to view your worklog history</p>
        </div>
      ) : sortedItems.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          <Search className="h-8 w-8" />
          <p>No worklogs found</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="w-10 px-3 py-2">
                    <Checkbox
                      checked={selection.isAllSelected(allIds)}
                      onCheckedChange={() => selection.toggleAll(allIds)}
                    />
                  </th>
                  {visibleColumns.map((col) => (
                    <th
                      key={col}
                      className={cn(
                        'px-3 py-2 text-left font-medium text-xs',
                        (col === 'date' ||
                          col === 'hours' ||
                          col === 'issueKey' ||
                          col === 'projectKey') &&
                          'cursor-pointer hover:text-foreground',
                      )}
                      onClick={() => {
                        if (
                          col === 'date' ||
                          col === 'hours' ||
                          col === 'issueKey' ||
                          col === 'projectKey'
                        ) {
                          toggleSort(col);
                        }
                      }}
                    >
                      <span className="inline-flex items-center">
                        {ALL_COLUMNS.find((c) => c.key === col)?.label}
                        {(col === 'date' ||
                          col === 'hours' ||
                          col === 'issueKey' ||
                          col === 'projectKey') &&
                          sortIcon(col)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((item) => (
                  <tr
                    key={item.worklogId}
                    className={cn(
                      'border-b last:border-b-0 hover:bg-muted/30 cursor-pointer',
                      selection.isSelected(item.worklogId) && 'bg-primary/5',
                    )}
                    onClick={() => setEditTarget(item)}
                  >
                    <td className="w-10 px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selection.isSelected(item.worklogId)}
                        onCheckedChange={() => selection.toggle(item.worklogId)}
                      />
                    </td>
                    {visibleColumns.map((col) => (
                      <td
                        key={col}
                        className={cn(
                          'px-3 py-2',
                          col === 'issueSummary' && 'max-w-[200px] truncate',
                          col === 'comment' && 'max-w-[150px] truncate',
                          col === 'hours' && 'text-right tabular-nums',
                          col === 'date' && 'whitespace-nowrap',
                        )}
                      >
                        {col === 'issueKey' ? (
                          <span className="font-medium">{cellValue(item, col)}</span>
                        ) : (
                          cellValue(item, col)
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/30 font-medium text-sm">
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2" colSpan={visibleColumns.length - 1}>
                    Total
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{result.totalHours}h</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {result.totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Page {result.page} of {result.totalPages} · {result.total} worklogs
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => handlePage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= result.totalPages}
                  onClick={() => handlePage(page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {editTarget && (
        <WorklogEditDialog
          worklogId={editTarget.worklogId}
          issueId={editTarget.issueId}
          open={!!editTarget}
          onOpenChange={(open) => {
            if (!open) setEditTarget(null);
          }}
          onSuccess={() => {
            setEditTarget(null);
            handleSearch();
          }}
        />
      )}

      {deleteTarget && (
        <WorklogDeleteDialog
          worklogId={deleteTarget.worklogId}
          issueId={deleteTarget.issueId}
          open={!!deleteTarget}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          onSuccess={() => {
            setDeleteTarget(null);
            handleSearch();
          }}
        />
      )}

      <BulkEditDialog
        entries={sortedItems
          .filter((i) => selection.isSelected(i.worklogId))
          .map((i) => ({
            worklogId: i.worklogId,
            issueId: i.issueId,
            issueKey: i.issueKey,
          }))}
        open={bulkEditOpen}
        onOpenChange={setBulkEditOpen}
        onComplete={() => {
          setBulkEditOpen(false);
          selection.clear();
          handleSearch();
        }}
      />

      <BulkDeleteDialog
        entries={sortedItems
          .filter((i) => selection.isSelected(i.worklogId))
          .map((i) => ({
            worklogId: i.worklogId,
            issueId: i.issueId,
            issueKey: i.issueKey,
            date: i.date,
            hours: i.hours,
          }))}
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        onComplete={() => {
          setBulkDeleteOpen(false);
          selection.clear();
          handleSearch();
        }}
      />
    </div>
  );
}
