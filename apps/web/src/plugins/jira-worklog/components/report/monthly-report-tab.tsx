import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  ChevronDown,
  Columns3,
  Download,
  Layers,
  RotateCw,
  Search,
  User,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { DatePicker } from '@/shared/components/ui/date-picker';
import {
  useMonthlyReport,
  useMonthlyReportByProject,
  useMonthlyReportByBoard,
  useMonthlyReportByEpic,
  useProjects,
  useBoards,
  useEpicSearch,
  useReportFields,
} from '../../api/report';
import type { ReportFilters, MonthlyReport, MonthlyUserEpicWorklog } from '../../api/report';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { AsyncCombobox } from '@/shared/components/ui/async-combobox';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { Switch } from '@/shared/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { useServiceConnections } from '@/shared/api/service-connections';
import { ContributionChart } from './contribution-chart';
import { cn } from '@/shared/lib/utils';

// ── Helpers ────────────────────────────────────────────────────

function formatHours(seconds: number): string {
  const h = Math.round((seconds / 3600) * 10) / 10;
  return `${h}h`;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function safeFilenamePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'report';
}

function firstOfMonth(y: number, m: number) {
  return `${y}-${String(m).padStart(2, '0')}-01`;
}

function lastOfMonth(y: number, m: number) {
  return `${y}-${String(m).padStart(2, '0')}-${new Date(y, m, 0).getDate()}`;
}

type FilterMode = 'my' | 'project' | 'board' | 'epic';
type DisplayColumn = 'epic' | 'user' | 'email' | 'hours' | 'issues';
type ReportViewMode = 'cards' | 'table';
type ReportSortKey = 'epic' | 'user' | 'issue' | 'hours';

const REPORT_FILTER_STORAGE_KEY = 'muxlyn:jira-worklog:report-filters';

interface StoredReportFilters {
  mode?: FilterMode;
  projectKey?: string;
  boardId?: string;
  epicKey?: string;
  dateFrom?: string;
  dateTo?: string;
  columns?: DisplayColumn[];
  customFields?: string[];
  onlyMyWorklogs?: boolean;
  viewMode?: ReportViewMode;
}

interface SelectedField {
  id: string;
  name: string;
}

interface ReportTableRow {
  id: string;
  epicKey: string;
  epicSummary: string;
  customFields: Record<string, string>;
  user: string;
  email: string;
  issueKey: string;
  issueSummary: string;
  timeSpentSeconds: number;
}

const ALL_COLS: { key: DisplayColumn; label: string }[] = [
  { key: 'epic', label: 'Epic' },
  { key: 'user', label: 'User' },
  { key: 'email', label: 'Email' },
  { key: 'hours', label: 'Hours' },
  { key: 'issues', label: 'Issues' },
];

const DEFAULT_COLUMNS: DisplayColumn[] = ['user', 'hours', 'issues'];

function getDefaultDateRange() {
  const now = new Date();
  return {
    from: firstOfMonth(now.getFullYear(), now.getMonth() + 1),
    to: now.toISOString().slice(0, 10),
  };
}

function isRangeLongerThanSixMonths(from: string, to: string): boolean {
  const fromTime = new Date(`${from}T00:00:00`).getTime();
  const toTime = new Date(`${to}T00:00:00`).getTime();
  if (!Number.isFinite(fromTime) || !Number.isFinite(toTime)) return false;
  return toTime - fromTime > 183 * 24 * 60 * 60 * 1000;
}

function isInvalidDateOrder(from: string, to: string): boolean {
  const fromTime = new Date(`${from}T00:00:00`).getTime();
  const toTime = new Date(`${to}T00:00:00`).getTime();
  if (!Number.isFinite(fromTime) || !Number.isFinite(toTime)) return false;
  return fromTime > toTime;
}

function isFilterMode(value: unknown): value is FilterMode {
  return value === 'my' || value === 'project' || value === 'board' || value === 'epic';
}

function isDisplayColumn(value: unknown): value is DisplayColumn {
  return value === 'epic' || value === 'user' || value === 'email' || value === 'hours' || value === 'issues';
}

function isReportViewMode(value: unknown): value is ReportViewMode {
  return value === 'cards' || value === 'table';
}

function loadStoredReportFilters(): StoredReportFilters {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(REPORT_FILTER_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoredReportFilters;
    return {
      mode: isFilterMode(parsed.mode) ? parsed.mode : undefined,
      projectKey: typeof parsed.projectKey === 'string' ? parsed.projectKey : undefined,
      boardId: typeof parsed.boardId === 'string' ? parsed.boardId : undefined,
      epicKey: typeof parsed.epicKey === 'string' ? parsed.epicKey : undefined,
      dateFrom: typeof parsed.dateFrom === 'string' ? parsed.dateFrom : undefined,
      dateTo: typeof parsed.dateTo === 'string' ? parsed.dateTo : undefined,
      columns: Array.isArray(parsed.columns) ? parsed.columns.filter(isDisplayColumn) : undefined,
      customFields: Array.isArray(parsed.customFields)
        ? parsed.customFields.filter((field): field is string => typeof field === 'string')
        : undefined,
      onlyMyWorklogs: typeof parsed.onlyMyWorklogs === 'boolean' ? parsed.onlyMyWorklogs : undefined,
      viewMode: isReportViewMode(parsed.viewMode) ? parsed.viewMode : undefined,
    };
  } catch {
    return {};
  }
}

function flattenReportRows(epics: MonthlyReport[]): ReportTableRow[] {
  return epics.flatMap((epic) =>
    epic.users.flatMap((user) =>
      user.issues.map((issue) => ({
        id: `${epic.epicKey}:${user.accountId}:${issue.issueKey}`,
        epicKey: epic.epicKey,
        epicSummary: epic.epicSummary,
        customFields: epic.customFields ?? {},
        user: user.displayName,
        email: user.emailAddress ?? '',
        issueKey: issue.issueKey,
        issueSummary: issue.issueSummary,
        timeSpentSeconds: issue.timeSpentSeconds,
      })),
    ),
  );
}

// ── Stats Bar (memoized) ───────────────────────────────────────

const StatsBar = React.memo(function StatsBar({
  epics,
  totalSeconds,
}: {
  epics: MonthlyReport[];
  totalSeconds: number;
}) {
  const { t } = useTranslation();
  const contributorCount = useMemo(
    () => new Set(epics.flatMap((e) => e.users.map((u) => u.accountId))).size,
    [epics],
  );

  return (
    <div className="grid grid-cols-3 gap-3">
      <Card>
        <CardContent className="flex items-center gap-3 py-4">
          <Layers className="h-5 w-5 text-primary" />
          <div>
            <p className="text-2xl font-bold tabular-nums">{epics.length}</p>
            <p className="text-xs text-muted-foreground">{t('report.epics', 'Epics')}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-3 py-4">
          <Calendar className="h-5 w-5 text-primary" />
          <div>
            <p className="text-2xl font-bold tabular-nums">{formatHours(totalSeconds)}</p>
            <p className="text-xs text-muted-foreground">{t('report.total_time', 'Total Time')}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-3 py-4">
          <User className="h-5 w-5 text-primary" />
          <div>
            <p className="text-2xl font-bold tabular-nums">{contributorCount}</p>
            <p className="text-xs text-muted-foreground">{t('report.contributors', 'Contributors')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

// ── Epic User Row (memoized) ───────────────────────────────────

const EpicUserRow = React.memo(function EpicUserRow({
  user,
  columns,
  totalEpicSeconds,
}: {
  user: MonthlyUserEpicWorklog;
  columns: DisplayColumn[];
  totalEpicSeconds: number;
}) {
  const showCol = useCallback((c: DisplayColumn) => columns.includes(c), [columns]);
  const pct = totalEpicSeconds > 0 ? (user.totalTimeSeconds / totalEpicSeconds) * 100 : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {showCol('user') && <span className="text-sm font-medium">{user.displayName}</span>}
          {showCol('email') && user.emailAddress && (
            <span className="text-xs text-muted-foreground truncate">{user.emailAddress}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {showCol('hours') && (
            <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          )}
          {showCol('hours') && (
            <span className="text-sm font-medium tabular-nums w-14 text-right">
              {formatHours(user.totalTimeSeconds)}
            </span>
          )}
        </div>
      </div>

      {showCol('issues') && (
        <div className="flex flex-wrap gap-1.5 pl-1">
          {user.issues.map((issue) => (
            <span
              key={issue.issueKey}
              className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs"
            >
              <span className="font-mono">{issue.issueKey}</span>
              <span className="text-muted-foreground">{formatHours(issue.timeSpentSeconds)}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
});

// ── Epic Card (memoized) ───────────────────────────────────────

const EpicCard = React.memo(function EpicCard({
  epic,
  columns,
  fieldLabels,
}: {
  epic: MonthlyReport;
  columns: DisplayColumn[];
  fieldLabels: Map<string, string>;
}) {
  const [expanded, setExpanded] = useState(false);

  const bars = useMemo(
    () =>
      epic.users.map((u) => ({
        label: u.displayName,
        seconds: u.totalTimeSeconds,
        color: '',
      })),
    [epic.users],
  );
  const customFieldEntries = useMemo(
    () => Object.entries(epic.customFields ?? {}).filter(([, value]) => value && value !== '-'),
    [epic.customFields],
  );

  return (
    <Card className="group">
      <CardHeader className="cursor-pointer pb-3" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="font-mono text-sm text-primary">{epic.epicKey}</span>
              <span className="truncate">{epic.epicSummary}</span>
            </CardTitle>
            {customFieldEntries.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {customFieldEntries.map(([fieldId, value]) => (
                  <Badge
                    key={fieldId}
                    variant="secondary"
                    className="max-w-full gap-1 rounded-md border bg-muted/50 px-2 py-1 font-normal"
                  >
                    <span className="text-muted-foreground">{fieldLabels.get(fieldId) ?? fieldId}</span>
                    <span className="max-w-[220px] truncate font-medium text-foreground">{value}</span>
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-sm font-medium tabular-nums">{formatHours(epic.totalTimeSeconds)}</span>
            <ChevronDown
              className={cn('h-4 w-4 text-muted-foreground transition-transform', expanded && 'rotate-180')}
            />
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 pb-4 space-y-4">
          <ContributionChartMemo bars={bars} totalSeconds={epic.totalTimeSeconds} />
          {epic.users.map((user) => (
            <EpicUserRow key={user.accountId} user={user} columns={columns} totalEpicSeconds={epic.totalTimeSeconds} />
          ))}
        </CardContent>
      )}
    </Card>
  );
});

const ContributionChartMemo = React.memo(ContributionChart);

const ReportTable = React.memo(function ReportTable({
  rows,
  fields,
  totalSeconds,
  columns,
  jiraBaseUrl,
}: {
  rows: ReportTableRow[];
  fields: SelectedField[];
  totalSeconds: number;
  columns: DisplayColumn[];
  jiraBaseUrl?: string;
}) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<ReportSortKey>('hours');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = useCallback((key: ReportSortKey) => {
    setSortKey((current) => {
      if (current === key) {
        setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
        return current;
      }
      setSortDir(key === 'hours' ? 'desc' : 'asc');
      return key;
    });
  }, []);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? rows.filter((row) =>
          [
            row.epicKey,
            row.epicSummary,
            row.user,
            row.email,
            row.issueKey,
            row.issueSummary,
            ...fields.map((field) => row.customFields[field.id] ?? ''),
          ].some((value) => value.toLowerCase().includes(q)),
        )
      : rows;

    return [...base].sort((a, b) => {
      let result = 0;
      if (sortKey === 'hours') {
        result = a.timeSpentSeconds - b.timeSpentSeconds;
      } else if (sortKey === 'epic') {
        result = a.epicKey.localeCompare(b.epicKey);
      } else if (sortKey === 'user') {
        result = a.user.localeCompare(b.user);
      } else {
        result = a.issueKey.localeCompare(b.issueKey);
      }
      return sortDir === 'asc' ? result : -result;
    });
  }, [fields, query, rows, sortDir, sortKey]);

  const visibleSeconds = useMemo(
    () => filteredRows.reduce((sum, row) => sum + row.timeSpentSeconds, 0),
    [filteredRows],
  );

  const sortLabel = (key: ReportSortKey) => (sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '');
  const showEpic = columns.includes('epic');
  const showUser = columns.includes('user');
  const showEmail = columns.includes('email');
  const showIssues = columns.includes('issues');
  const showHours = columns.includes('hours');
  const visibleColumnCount =
    (showEpic ? 2 + fields.length : 0) +
    (showUser ? 1 : 0) +
    (showEmail ? 1 : 0) +
    (showIssues ? 2 : 0) +
    (showHours ? 2 : 0);

  const issueHref = useCallback(
    (issueKey: string) => (jiraBaseUrl ? `${jiraBaseUrl.replace(/\/$/, '')}/browse/${issueKey}` : undefined),
    [jiraBaseUrl],
  );

  return (
    <Card>
      <CardHeader className="gap-3 pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Report table</CardTitle>
            <p className="text-xs text-muted-foreground">
              {filteredRows.length} rows · {formatDuration(visibleSeconds)} shown · {formatDuration(totalSeconds)} total
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search table..."
              className="h-9 pl-8"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[620px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow>
                {showEpic && (
                  <>
                    <TableHead className="min-w-28">
                      <button type="button" onClick={() => handleSort('epic')} className="font-medium">
                        Epic{sortLabel('epic')}
                      </button>
                    </TableHead>
                    <TableHead className="min-w-64">Epic Summary</TableHead>
                    {fields.map((field) => (
                      <TableHead key={field.id} className="min-w-40">{field.name}</TableHead>
                    ))}
                  </>
                )}
                {showUser && (
                  <TableHead className="min-w-44">
                    <button type="button" onClick={() => handleSort('user')} className="font-medium">
                      User{sortLabel('user')}
                    </button>
                  </TableHead>
                )}
                {showEmail && <TableHead className="min-w-56">Email</TableHead>}
                {showIssues && (
                  <>
                    <TableHead className="min-w-28">
                      <button type="button" onClick={() => handleSort('issue')} className="font-medium">
                        Issue{sortLabel('issue')}
                      </button>
                    </TableHead>
                    <TableHead className="min-w-64">Issue Summary</TableHead>
                  </>
                )}
                {showHours && (
                  <>
                    <TableHead className="min-w-28">Time Spent</TableHead>
                    <TableHead className="min-w-24 text-right">
                      <button type="button" onClick={() => handleSort('hours')} className="font-medium">
                        Hours{sortLabel('hours')}
                      </button>
                    </TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((row) => (
                <TableRow key={row.id}>
                  {showEpic && (
                    <>
                      <TableCell className="font-mono text-xs text-primary">
                        {issueHref(row.epicKey) ? (
                          <a
                            href={issueHref(row.epicKey)}
                            target="_blank"
                            rel="noreferrer"
                            className="underline-offset-2 hover:underline"
                            title={`Open ${row.epicKey} in Jira`}
                          >
                            {row.epicKey}
                          </a>
                        ) : row.epicKey}
                      </TableCell>
                      <TableCell className="max-w-72 truncate" title={row.epicSummary}>{row.epicSummary}</TableCell>
                      {fields.map((field) => (
                        <TableCell key={field.id} className="max-w-48 truncate" title={row.customFields[field.id] || '-'}>
                          {row.customFields[field.id] || '-'}
                        </TableCell>
                      ))}
                    </>
                  )}
                  {showUser && <TableCell className="font-medium">{row.user}</TableCell>}
                  {showEmail && <TableCell className="max-w-56 truncate text-muted-foreground" title={row.email}>{row.email}</TableCell>}
                  {showIssues && (
                    <>
                      <TableCell className="font-mono text-xs">
                        {issueHref(row.issueKey) ? (
                          <a
                            href={issueHref(row.issueKey)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary underline-offset-2 hover:underline"
                            title={`Open ${row.issueKey} in Jira`}
                          >
                            {row.issueKey}
                          </a>
                        ) : row.issueKey}
                      </TableCell>
                      <TableCell className="max-w-72 truncate" title={row.issueSummary}>{row.issueSummary}</TableCell>
                    </>
                  )}
                  {showHours && (
                    <>
                      <TableCell>{formatDuration(row.timeSpentSeconds)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {Math.round((row.timeSpentSeconds / 3600) * 100) / 100}
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
              {filteredRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={Math.max(visibleColumnCount, 1)} className="py-10 text-center text-muted-foreground">
                    No rows match your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
});

// ── Date Presets ───────────────────────────────────────────────

function useDatePresets(onApply: (from: string, to: string) => void) {
  const { t } = useTranslation();
  return useMemo(
    () => [
      {
        label: t('report.this_month', 'This Month'),
        apply: () => {
          const now = new Date();
          onApply(firstOfMonth(now.getFullYear(), now.getMonth() + 1), lastOfMonth(now.getFullYear(), now.getMonth() + 1));
        },
      },
      {
        label: t('report.last_month', 'Last Month'),
        apply: () => {
          const now = new Date();
          const m = now.getMonth();
          const y = m === 0 ? now.getFullYear() - 1 : now.getFullYear();
          const mm = m === 0 ? 12 : m;
          onApply(firstOfMonth(y, mm), lastOfMonth(y, mm));
        },
      },
    ],
    [t, onApply],
  );
}

// ── Main Component ─────────────────────────────────────────────

export function MonthlyReportTab() {
  const { t } = useTranslation();
  const storedFilters = useMemo(() => loadStoredReportFilters(), []);
  const [mode, setMode] = useState<FilterMode>(() => storedFilters.mode ?? 'my');
  const [projectKey, setProjectKey] = useState(() => storedFilters.projectKey ?? '');
  const [boardId, setBoardId] = useState(() => storedFilters.boardId ?? '');
  const [epicKey, setEpicKey] = useState(() => storedFilters.epicKey ?? '');
  const [dateFrom, setDateFrom] = useState(() => storedFilters.dateFrom ?? getDefaultDateRange().from);
  const [dateTo, setDateTo] = useState(() => storedFilters.dateTo ?? getDefaultDateRange().to);
  const [columns, setColumns] = useState<DisplayColumn[]>(() => (
    storedFilters.columns?.length ? storedFilters.columns : DEFAULT_COLUMNS
  ));
  const [selectedCustomFields, setSelectedCustomFields] = useState<string[]>(() => storedFilters.customFields ?? []);
  const [onlyMyWorklogs, setOnlyMyWorklogs] = useState(() => storedFilters.onlyMyWorklogs ?? false);
  const [viewMode, setViewMode] = useState<ReportViewMode>(() => storedFilters.viewMode ?? 'cards');
  const [fieldSearch, setFieldSearch] = useState('');
  const [epicSearchQ, setEpicSearchQ] = useState(() => storedFilters.epicKey ?? '');
  const resultsRef = useRef<HTMLDivElement>(null);

  const setDateFromStable = useCallback((v: string) => setDateFrom(v), []);
  const setDateToStable = useCallback((v: string) => setDateTo(v), []);
  const handleMode = useCallback((m: FilterMode) => {
    setMode(m);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        REPORT_FILTER_STORAGE_KEY,
        JSON.stringify({
          mode,
          projectKey,
          boardId,
          epicKey,
          dateFrom,
          dateTo,
          columns,
          customFields: selectedCustomFields,
          onlyMyWorklogs,
          viewMode,
        }),
      );
    } catch {
      // Ignore storage errors; report filters still work for the current session.
    }
  }, [mode, projectKey, boardId, epicKey, dateFrom, dateTo, columns, selectedCustomFields, onlyMyWorklogs, viewMode]);

  const presets = useDatePresets((from, to) => {
    setDateFrom(from);
    setDateTo(to);
  });

  // Autocomplete data
  const { data: projects = [], isLoading: projectsQueryLoading } = useProjects();
  const { data: boards = [], isLoading: boardsLoading } = useBoards();
  const { data: fields = [], isLoading: fieldsLoading } = useReportFields();
  const { data: jiraConnections = [] } = useServiceConnections('jira');
  const { data: epicResults = [], isLoading: epicSearchLoading } = useEpicSearch(epicSearchQ || null);
  const activeJiraUrl = jiraConnections.find((connection) => connection.isActive)?.url;

  const projectOptions = useMemo(
    () => projects.map((p) => ({ value: p.key, label: p.name, sublabel: p.key })),
    [projects],
  );

  const boardOptions = useMemo(
    () =>
      boards.map((b) => ({
        value: b.id,
        label: b.name,
        sublabel: b.projectKey ? `Project: ${b.projectKey}` : undefined,
      })),
    [boards],
  );

  const epicOptions = useMemo(
    () => epicResults.map((e) => ({ value: e.key, label: `${e.key} — ${e.summary}` })),
    [epicResults],
  );

  const fieldLabels = useMemo(
    () => new Map(fields.map((field) => [field.id, field.name])),
    [fields],
  );

  const filteredFields = useMemo(() => {
    const q = fieldSearch.trim().toLowerCase();
    if (!q) return fields;
    return fields.filter((field) =>
      field.name.toLowerCase().includes(q) || field.id.toLowerCase().includes(q),
    );
  }, [fields, fieldSearch]);

  const selectedFieldObjects = useMemo(
    () => selectedCustomFields.map((fieldId) => ({ id: fieldId, name: fieldLabels.get(fieldId) ?? fieldId })),
    [fieldLabels, selectedCustomFields],
  );

  const toggleCustomField = useCallback((fieldId: string, checked: boolean) => {
    setSelectedCustomFields((prev) => {
      if (checked) return prev.includes(fieldId) ? prev : [...prev, fieldId];
      return prev.filter((id) => id !== fieldId);
    });
  }, []);

  const filters: ReportFilters | null = useMemo(() => {
    if (!dateFrom || !dateTo) return null;
    if (isInvalidDateOrder(dateFrom, dateTo)) return null;
    if (isRangeLongerThanSixMonths(dateFrom, dateTo)) return null;
    const base = { startDate: dateFrom, endDate: dateTo } as ReportFilters;
    if (selectedCustomFields.length > 0) base.customFields = selectedCustomFields;
    if (mode !== 'my' && onlyMyWorklogs) base.onlyMyWorklogs = true;
    if (mode === 'project' && projectKey) base.projectKey = projectKey;
    if (mode === 'board' && boardId) base.boardId = boardId;
    if (mode === 'epic' && epicKey) base.epicKey = epicKey;
    return base;
  }, [mode, projectKey, boardId, epicKey, dateFrom, dateTo, selectedCustomFields, onlyMyWorklogs]);

  const myReport = useMonthlyReport(mode === 'my' ? filters : null);
  const projectReport = useMonthlyReportByProject(mode === 'project' && projectKey ? filters : null);
  const boardReport = useMonthlyReportByBoard(mode === 'board' && boardId ? filters : null);
  const epicReport = useMonthlyReportByEpic(mode === 'epic' && epicKey ? filters : null);

  const report = useMemo(() => {
    if (mode === 'my') return myReport;
    if (mode === 'project') return projectReport;
    if (mode === 'board') return boardReport;
    return epicReport;
  }, [mode, myReport, projectReport, boardReport, epicReport]);

  const { data, isLoading, error, refetch } = report;
  const tableRows = useMemo(() => (data ? flattenReportRows(data.epics) : []), [data]);



  const handleDownloadCsv = useCallback(() => {
    if (!data) return;
    const header = [
      'Epic Key',
      'Epic Summary',
      ...selectedFieldObjects.map((field) => field.name),
      'User',
      'Email',
      'Issue Key',
      'Issue Summary',
      'Time Spent',
      'Hours',
    ].map(csvEscape).join(',') + '\n';
    const rows = data.epics.flatMap((epic) =>
      epic.users.flatMap((user) =>
        user.issues.map((issue) => {
          const hours = Math.round((issue.timeSpentSeconds / 3600) * 100) / 100;
          return [
            csvEscape(epic.epicKey),
            csvEscape(epic.epicSummary),
            ...selectedFieldObjects.map((field) => csvEscape(epic.customFields?.[field.id] ?? '')),
            csvEscape(user.displayName),
            csvEscape(user.emailAddress ?? ''),
            csvEscape(issue.issueKey),
            csvEscape(issue.issueSummary),
            csvEscape(formatDuration(issue.timeSpentSeconds)),
            String(hours),
          ].join(',');
        }),
      ),
    );
    const blob = new Blob([`\uFEFF${header}${rows.join('\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const selectedBoard = boards.find((board) => board.id === boardId);
    if (mode === 'epic' && epicKey) {
      a.download = `epic-report-${safeFilenamePart(epicKey)}-${dateFrom}-${dateTo}.csv`;
    } else if (mode === 'project' && projectKey) {
      a.download = `project-report-${safeFilenamePart(projectKey)}-${dateFrom}-${dateTo}.csv`;
    } else if (mode === 'board' && boardId) {
      a.download = `board-report-${safeFilenamePart(selectedBoard?.name ?? boardId)}-${dateFrom}-${dateTo}.csv`;
    } else {
      a.download = `my-epics-report-${dateFrom}-${dateTo}.csv`;
    }
    a.click();
    URL.revokeObjectURL(url);
  }, [boardId, boards, data, dateFrom, dateTo, epicKey, mode, projectKey, selectedFieldObjects]);

  const showProjectInput = mode === 'project';
  const showBoardInput = mode === 'board';
  const showEpicInput = mode === 'epic';
  const hasFilterValue = mode === 'my' || (mode === 'project' && projectKey) || (mode === 'board' && boardId) || (mode === 'epic' && epicKey);
  const projectsLoading = projectsQueryLoading && !projects.length;
  const rangeTooLarge = Boolean(dateFrom && dateTo && isRangeLongerThanSixMonths(dateFrom, dateTo));
  const invalidDateOrder = Boolean(dateFrom && dateTo && isInvalidDateOrder(dateFrom, dateTo));

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex rounded-md border p-0.5">
          {([
            ['my', t('report.my_worklogs', 'My')],
            ['project', t('report.by_project', 'Project')],
            ['board', t('report.by_board', 'Board')],
            ['epic', t('report.by_epic', 'Epic')],
          ] as [FilterMode, string][]).map(([m, label]) => (
            <Button
              key={m}
              variant={mode === m ? 'primary' : 'ghost'}
              size="sm"
              className="text-xs h-7 px-2.5"
              onClick={() => handleMode(m)}
            >
              {label}
            </Button>
          ))}
        </div>

        {showProjectInput && (
          <AsyncCombobox
            options={projectOptions}
            value={projectKey}
            onChange={setProjectKey}
            loading={projectsLoading}
            placeholder={t('report.project_key_placeholder', 'Select project...')}
            searchPlaceholder="Search projects..."
            emptyText={projectsLoading ? 'Loading projects...' : t('report.no_projects', 'No projects found')}
            className="w-52 h-9"
          />
        )}

        {showBoardInput && (
          <AsyncCombobox
            options={boardOptions}
            value={boardId}
            onChange={setBoardId}
            loading={boardsLoading && !boards.length}
            placeholder={t('report.board_id_placeholder', 'Select board...')}
            searchPlaceholder="Search boards..."
            emptyText={boardsLoading ? 'Loading boards...' : t('report.no_boards', 'No boards found')}
            className="w-48 h-9"
          />
        )}

        {showEpicInput && (
          <AsyncCombobox
            options={epicOptions}
            value={epicKey}
            onChange={setEpicKey}
            onSearch={setEpicSearchQ}
            loading={epicSearchLoading}
            placeholder={t('report.epic_key_placeholder', 'Search epic...')}
            searchPlaceholder="Type epic key or name..."
            emptyText={epicSearchQ.length < 2 ? 'Type at least 2 characters' : t('report.no_epics', 'No epics found')}
            className="w-56 h-9"
          />
        )}

        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <p className="px-1 text-[11px] font-medium text-muted-foreground">From</p>
            <DatePicker
              value={dateFrom}
              onChange={setDateFromStable}
              placeholder="Start date"
              className="w-40"
            />
          </div>
          <div className="space-y-1">
            <p className="px-1 text-[11px] font-medium text-muted-foreground">To</p>
            <DatePicker
              value={dateTo}
              onChange={setDateToStable}
              placeholder="End date"
              className="w-40"
            />
          </div>
        </div>

        <label className="flex h-9 items-center gap-2 rounded-md border px-3 text-xs">
          <Switch
            checked={mode === 'my' || onlyMyWorklogs}
            disabled={mode === 'my'}
            onCheckedChange={setOnlyMyWorklogs}
            className="scale-75"
          />
          <span className="whitespace-nowrap">My worklogs only</span>
        </label>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
              <Layers className="h-3.5 w-3.5" />
              Epic fields
              {selectedCustomFields.length > 0 && (
                <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] leading-none text-primary-foreground">
                  {selectedCustomFields.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-80 p-2">
            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium">Epic custom fields</p>
                <p className="text-xs text-muted-foreground">Choose fields to show on each epic.</p>
              </div>
              <Input
                value={fieldSearch}
                onChange={(event) => setFieldSearch(event.target.value)}
                placeholder="Search Jira fields..."
                className="h-8 text-sm"
              />
              {selectedFieldObjects.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedFieldObjects.map((field) => (
                    <button
                      key={field.id}
                      type="button"
                      onClick={() => toggleCustomField(field.id, false)}
                      className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary hover:bg-primary/15"
                    >
                      {field.name} ×
                    </button>
                  ))}
                </div>
              )}
              <div className="max-h-64 overflow-y-auto rounded-md border p-1">
                {fieldsLoading && <p className="px-2 py-6 text-center text-sm text-muted-foreground">Loading fields...</p>}
                {!fieldsLoading && filteredFields.length === 0 && (
                  <p className="px-2 py-6 text-center text-sm text-muted-foreground">No fields found</p>
                )}
                {!fieldsLoading && filteredFields.map((field) => (
                  <DropdownMenuCheckboxItem
                    key={field.id}
                    checked={selectedCustomFields.includes(field.id)}
                    onSelect={(event) => event.preventDefault()}
                    onCheckedChange={(checked) => toggleCustomField(field.id, Boolean(checked))}
                  >
                    <span className="min-w-0">
                      <span className="block truncate">{field.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{field.id}</span>
                    </span>
                  </DropdownMenuCheckboxItem>
                ))}
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {presets.map((p) => (
          <Button key={p.label} variant="ghost" size="sm" className="text-xs h-8" onClick={p.apply}>
            {p.label}
          </Button>
        ))}
      </div>

      {rangeTooLarge && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="py-4">
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Date range cannot exceed 6 months. Narrow the range to keep Jira report generation fast and reliable.
            </p>
          </CardContent>
        </Card>
      )}

      {invalidDateOrder && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-4">
            <p className="text-sm text-destructive">Start date must be before or equal to end date.</p>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {isLoading && !rangeTooLarge && !invalidDateOrder && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}><CardContent className="py-4"><Skeleton className="h-8 w-full" /></CardContent></Card>
            ))}
          </div>
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardHeader><Skeleton className="h-5 w-64" /></CardHeader></Card>
          ))}
        </div>
      )}

      {/* Error */}
      {error && !isLoading && !rangeTooLarge && !invalidDateOrder && (
        <Card className="border-destructive">
          <CardContent className="flex items-center justify-between gap-3 py-4">
            <p className="text-sm text-destructive">
              {error instanceof Error ? error.message : t('common.error')}
            </p>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => refetch()}>
              <RotateCw className="h-3.5 w-3.5" />
              {t('common.retry', 'Retry')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* No filter yet */}
      {!isLoading && !error && !rangeTooLarge && !invalidDateOrder && !hasFilterValue && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Search className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {mode === 'project' ? t('report.enter_project_key', 'Enter a project key to generate report') :
               mode === 'board' ? t('report.enter_board_id', 'Enter a board ID to generate report') :
               mode === 'epic' ? t('report.enter_epic_key', 'Enter an epic key to view details') :
               t('report.select_dates', 'Select a date range to generate a report')}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Empty result */}
      {!isLoading && !rangeTooLarge && !invalidDateOrder && data && data.epics.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Layers className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {t('report.no_worklogs', 'No worklogs found for this period')}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {!isLoading && !rangeTooLarge && !invalidDateOrder && data && data.epics.length > 0 && (
        <>
          <div ref={resultsRef} className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {formatDate(data.startDate)} — {formatDate(data.endDate)}
            </p>
            <div className="flex items-center gap-2">
              <div className="flex rounded-md border p-0.5">
                {(['cards', 'table'] as ReportViewMode[]).map((view) => (
                  <Button
                    key={view}
                    variant={viewMode === view ? 'primary' : 'ghost'}
                    size="sm"
                    className="h-7 px-2.5 text-xs capitalize"
                    onClick={() => setViewMode(view)}
                  >
                    {view}
                  </Button>
                ))}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                    <Columns3 className="h-3.5 w-3.5" />
                    {t('report.columns', 'Columns')}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  {ALL_COLS.map((col) => (
                    <DropdownMenuCheckboxItem
                      key={col.key}
                      checked={columns.includes(col.key)}
                      onCheckedChange={(checked) =>
                        setColumns((prev) => (checked ? [...prev, col.key] : prev.filter((c) => c !== col.key)))
                      }
                    >
                      {col.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleDownloadCsv}>
                <Download className="h-4 w-4" />
                CSV
              </Button>
            </div>
          </div>

          <StatsBar epics={data.epics} totalSeconds={data.totalTimeSeconds} />

          {viewMode === 'cards' ? (
            <div className="space-y-3">
              {data.epics.map((epic) => (
                <EpicCard key={epic.epicKey} epic={epic} columns={columns} fieldLabels={fieldLabels} />
              ))}
            </div>
          ) : (
            <ReportTable
              rows={tableRows}
              fields={selectedFieldObjects}
              totalSeconds={data.totalTimeSeconds}
              columns={columns}
              jiraBaseUrl={activeJiraUrl}
            />
          )}
        </>
      )}
    </div>
  );
}
