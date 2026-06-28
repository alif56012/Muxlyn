import {
  JiraNetworkError,
  JiraInvalidTokenError,
  ValidationError,
} from '../../shared/errors';
import {
  getActiveJiraConnection,
  type JiraConnection,
} from './jira-worklog-client';

// ── Types ──────────────────────────────────────────────────────

export interface MonthlyReport {
  epicKey: string;
  epicSummary: string;
  customFields?: Record<string, string>;
  totalTimeSeconds: number;
  users: MonthlyUserEpicWorklog[];
}

export interface MonthlyUserEpicWorklog {
  accountId: string;
  displayName: string;
  emailAddress?: string;
  totalTimeSeconds: number;
  issues: MonthlyIssueWorklog[];
}

export interface MonthlyIssueWorklog {
  issueKey: string;
  issueSummary: string;
  timeSpentSeconds: number;
}

export interface ReportFilters {
  startDate: string;
  endDate: string;
  projectKey?: string;
  boardId?: string;
  epicKey?: string;
  customFields?: string[];
  onlyMyWorklogs?: boolean;
}

export interface ReportResponse {
  startDate: string;
  endDate: string;
  totalTimeSeconds: number;
  epics: MonthlyReport[];
}

export interface EpicInfo {
  epicKey: string;
  epicSummary: string;
}

export interface JiraField {
  id: string;
  name: string;
  custom: boolean;
  schema?: Record<string, unknown>;
}

// ── Jira API Helpers ───────────────────────────────────────────

const CONCURRENCY = 8;
const MS_PER_DAY = 86_400_000;
const REPORT_CACHE_TTL_MS = 5 * 60 * 1000;
const FIELDS_CACHE_TTL_MS = 30 * 60 * 1000;
const MAX_REPORT_CACHE_ENTRIES = 50;
const MAX_SEARCH_PAGES = 50;
const MAX_REPORT_RANGE_MS = 183 * MS_PER_DAY;

const reportCache = new Map<string, { expiresAt: number; value: ReportResponse }>();
const fieldsCache = new Map<string, { expiresAt: number; value: JiraField[] }>();

function getReportCacheKey(userId: string, conn: JiraConnection, filters: ReportFilters): string {
  return JSON.stringify({
    userId,
    connectionId: conn.id,
    startDate: filters.startDate,
    endDate: filters.endDate,
    projectKey: filters.projectKey ?? '',
    boardId: filters.boardId ?? '',
    epicKey: filters.epicKey ?? '',
    customFields: [...(filters.customFields ?? [])].sort(),
    onlyMyWorklogs: filters.onlyMyWorklogs ?? false,
  });
}

function getCachedReport(key: string): ReportResponse | undefined {
  const cached = reportCache.get(key);
  if (!cached) return undefined;
  if (cached.expiresAt < Date.now()) {
    reportCache.delete(key);
    return undefined;
  }
  return cached.value;
}

function setCachedReport(key: string, value: ReportResponse): void {
  if (reportCache.size >= MAX_REPORT_CACHE_ENTRIES) {
    const oldestKey = reportCache.keys().next().value;
    if (oldestKey) reportCache.delete(oldestKey);
  }
  reportCache.set(key, { expiresAt: Date.now() + REPORT_CACHE_TTL_MS, value });
}

function authHeader(conn: JiraConnection): string {
  return `Basic ${btoa(`${conn.email}:${conn.apiToken}`)}`;
}

function jiraUrl(conn: JiraConnection, path: string): string {
  return `${conn.jiraUrl.replace(/\/$/, '')}${path}`;
}

function quoteJql(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function validateReportRange(startDate: string, endDate: string): void {
  const startMs = new Date(startDate).getTime();
  const endMs = new Date(endDate).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs > endMs) {
    throw new ValidationError('Invalid report date range');
  }
  if (endMs - startMs > MAX_REPORT_RANGE_MS) {
    throw new ValidationError('Date range cannot exceed 6 months');
  }
}

async function jiraGet(
  conn: JiraConnection,
  path: string,
): Promise<unknown> {
  const url = jiraUrl(conn, path);
  try {
    const res = await fetch(url, {
      headers: { Authorization: authHeader(conn), Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });
    if (res.status === 401) throw new JiraInvalidTokenError();
    if (!res.ok) throw new JiraNetworkError(`Jira ${res.status}`);
    return res.json();
  } catch (err) {
    if (err instanceof JiraInvalidTokenError || err instanceof JiraNetworkError) throw err;
    throw new JiraNetworkError();
  }
}

async function jiraPost(
  conn: JiraConnection,
  path: string,
  body: unknown,
): Promise<unknown> {
  const url = jiraUrl(conn, path);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: authHeader(conn),
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    if (res.status === 401) throw new JiraInvalidTokenError();
    if (!res.ok) throw new JiraNetworkError(`Jira ${res.status}`);
    return res.json();
  } catch (err) {
    if (err instanceof JiraInvalidTokenError || err instanceof JiraNetworkError) throw err;
    throw new JiraNetworkError();
  }
}

interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    parent?: { key: string; fields?: { summary?: string } };
    issuetype: { name: string; subtask: boolean };
    [k: string]: unknown;
  };
}

interface JiraWorklog {
  id: string;
  issueId: string;
  timeSpentSeconds: number;
  started: string;
  author?: {
    accountId?: string;
    displayName?: string;
    emailAddress?: string;
  };
}

// ── Epic Discovery ─────────────────────────────────────────────

async function searchAllIssues(
  conn: JiraConnection,
  jql: string,
  fields: string[],
  maxPerPage = 100,
): Promise<JiraIssue[]> {
  const all: JiraIssue[] = [];
  let nextPageToken: string | undefined;

  for (let page = 0; page < MAX_SEARCH_PAGES; page++) {
    const body: Record<string, unknown> = {
      jql,
      fields,
      maxResults: maxPerPage,
    };
    if (nextPageToken) body.nextPageToken = nextPageToken;

    const data = (await jiraPost(conn, '/rest/api/3/search/jql', body)) as {
      issues?: JiraIssue[];
      nextPageToken?: string;
    };

    all.push(...(data.issues ?? []));
    if (!data.nextPageToken) break;
    nextPageToken = data.nextPageToken;
  }

  return all;
}

async function findMyEpics(
  conn: JiraConnection,
  startDate: string,
  endDate: string,
): Promise<EpicInfo[]> {
  const jql = `worklogAuthor = currentUser() AND worklogDate >= "${startDate}" AND worklogDate <= "${endDate}"`;
  const issues = await searchAllIssues(conn, jql, ['parent'], 200);

  const epicMap = new Map<string, string>();
  for (const issue of issues) {
    const parent = issue.fields?.parent;
    if (!parent) continue;
    const key = parent.key;
    if (!epicMap.has(key)) {
      epicMap.set(key, parent.fields?.summary ?? key);
    }
  }
  return [...epicMap].map(([key, summary]) => ({ epicKey: key, epicSummary: summary }));
}

async function getCurrentUserAccountId(conn: JiraConnection): Promise<string> {
  const me = (await jiraGet(conn, '/rest/api/3/myself')) as { accountId?: string };
  if (!me.accountId) throw new JiraNetworkError('Could not resolve Jira current user');
  return me.accountId;
}

async function findProjectEpics(
  conn: JiraConnection,
  projectKey: string,
  startDate: string,
  endDate: string,
  onlyMyWorklogs = false,
): Promise<EpicInfo[]> {
  const authorJql = onlyMyWorklogs ? ' AND worklogAuthor = currentUser()' : '';
  const jql = `project = ${quoteJql(projectKey)} AND worklogDate >= "${startDate}" AND worklogDate <= "${endDate}"${authorJql} ORDER BY updated DESC`;
  const issues = await searchAllIssues(conn, jql, ['parent'], 200);

  const epicMap = new Map<string, string>();
  for (const issue of issues) {
    const parent = issue.fields?.parent;
    if (!parent) continue;
    if (!epicMap.has(parent.key)) {
      epicMap.set(parent.key, parent.fields?.summary ?? parent.key);
    }
  }

  return [...epicMap].map(([epicKey, epicSummary]) => ({ epicKey, epicSummary }));
}

async function findBoardEpics(
  conn: JiraConnection,
  boardId: string,
  startDate: string,
  endDate: string,
  onlyMyWorklogs = false,
): Promise<EpicInfo[]> {
  // Get board config to discover filter or project
  const board = (await jiraGet(
    conn,
    `/rest/agile/1.0/board/${encodeURIComponent(boardId)}/configuration?fields=filter,boardName`,
  )) as { filter?: { id: string }; subQuery?: string; boardName?: string };

  let jql = '';
  if (board?.filter?.id) {
    jql = `filter = ${board.filter.id}`;
  } else if (board?.subQuery) {
    jql = board.subQuery;
  } else {
    const boardInfo = (await jiraGet(conn, `/rest/agile/1.0/board/${encodeURIComponent(boardId)}`)) as {
      location?: { projectKey?: string };
    };
    const projectKey = boardInfo.location?.projectKey;
    if (!projectKey) throw new JiraNetworkError('Board has no filter or project');
    jql = `project = ${quoteJql(projectKey)}`;
  }

  jql += ` AND worklogDate >= "${startDate}" AND worklogDate <= "${endDate}"`;
  if (onlyMyWorklogs) jql += ' AND worklogAuthor = currentUser()';

  const issues = await searchAllIssues(conn, jql, ['parent'], 200);

  const epicMap = new Map<string, string>();
  for (const issue of issues) {
    const parent = issue.fields?.parent;
    if (!parent) continue;
    const key = parent.key;
    if (!epicMap.has(key)) {
      epicMap.set(key, parent.fields?.summary ?? key);
    }
  }

  return [...epicMap].map(([key, summary]) => ({ epicKey: key, epicSummary: summary }));
}

async function fetchSingleEpic(
  conn: JiraConnection,
  epicKey: string,
): Promise<EpicInfo> {
  const issue = (await jiraGet(
    conn,
    `/rest/api/3/issue/${encodeURIComponent(epicKey)}?fields=summary`,
  )) as JiraIssue;
  return { epicKey, epicSummary: issue.fields?.summary ?? epicKey };
}

// ── Issue & Worklog Fetching ──────────────────────────────────

async function fetchIssuesByEpics(
  conn: JiraConnection,
  epicKeys: string[],
  startDate: string,
  endDate: string,
  onlyMyWorklogs = false,
): Promise<Map<string, JiraIssue[]>> {
  const result = new Map<string, JiraIssue[]>();
  const chunkSize = 25;
  const chunks: string[][] = [];
  for (let i = 0; i < epicKeys.length; i += chunkSize) {
    chunks.push(epicKeys.slice(i, i + chunkSize));
  }

  for (let i = 0; i < chunks.length; i += 3) {
    const batch = chunks.slice(i, i + 3);
    const chunkIssues = await Promise.all(
      batch.map((chunk) => {
        const keys = chunk.map(quoteJql).join(',');
        const authorJql = onlyMyWorklogs ? ' AND worklogAuthor = currentUser()' : '';
        const jql = `parent in (${keys}) AND worklogDate >= "${startDate}" AND worklogDate <= "${endDate}"${authorJql} ORDER BY parent ASC`;
        return searchAllIssues(conn, jql, ['summary', 'parent'], 200);
      }),
    );

    for (const issues of chunkIssues) {
      for (const issue of issues) {
        const epicKey = issue.fields?.parent?.key;
        if (!epicKey) continue;
        if (!result.has(epicKey)) result.set(epicKey, []);
        result.get(epicKey)!.push(issue);
      }
    }
  }

  return result;
}

// Augmented worklog with issue lookup data
interface AugmentedWorklog extends JiraWorklog {
  issueKey?: string;
  issueSummary?: string;
}

async function fetchWorklogsForIssues(
  conn: JiraConnection,
  issues: JiraIssue[],
  startMs: number,
  endMs: number,
  authorAccountId?: string,
): Promise<AugmentedWorklog[]> {
  const allWorklogs: AugmentedWorklog[] = [];
  const startedAfter = startMs - 1;
  const startedBefore = endMs + MS_PER_DAY;

  for (let i = 0; i < issues.length; i += CONCURRENCY) {
    const batch = issues.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map((issue) => fetchWorklogsForIssue(conn, issue, startedAfter, startedBefore, authorAccountId)),
    );

    for (const result of results) {
      allWorklogs.push(...result);
    }
  }

  return allWorklogs;
}

async function fetchWorklogsForIssue(
  conn: JiraConnection,
  issue: JiraIssue,
  startedAfter: number,
  startedBefore: number,
  authorAccountId?: string,
): Promise<AugmentedWorklog[]> {
  const all: AugmentedWorklog[] = [];
  const maxResults = 1000;
  let startAt = 0;

  for (let page = 0; page < MAX_SEARCH_PAGES; page++) {
    const data = (await jiraGet(
      conn,
      `/rest/api/3/issue/${encodeURIComponent(issue.id)}/worklog?startedAfter=${startedAfter}&startedBefore=${startedBefore}&startAt=${startAt}&maxResults=${maxResults}`,
    )) as { worklogs?: JiraWorklog[]; total?: number; maxResults?: number; startAt?: number };

    const worklogs = (data.worklogs ?? []).filter((worklog) => {
      const started = new Date(worklog.started).getTime();
      return (
        Number.isFinite(started) &&
        started > startedAfter &&
        started < startedBefore &&
        (!authorAccountId || worklog.author?.accountId === authorAccountId)
      );
    });

    all.push(
      ...worklogs.map((worklog) => ({
        ...worklog,
        issueId: issue.id,
        issueKey: issue.key,
        issueSummary: issue.fields?.summary ?? '',
      })),
    );

    const total = data.total ?? all.length;
    const pageSize = data.maxResults ?? maxResults;
    const nextStartAt = (data.startAt ?? startAt) + pageSize;
    if (nextStartAt >= total || (data.worklogs ?? []).length === 0) break;
    startAt = nextStartAt;
  }

  return all;
}

// ── Aggregation ────────────────────────────────────────────────

function aggregateWorklogs(
  epicKey: string,
  epicSummary: string,
  issues: JiraIssue[],
  worklogs: AugmentedWorklog[],
  customFields?: Record<string, string>,
): MonthlyReport {
  const userMap = new Map<string, MonthlyUserEpicWorklog>();
  const issueEntryMap = new Map<string, Map<string, MonthlyIssueWorklog>>();
  let totalSeconds = 0;
  // Map issue IDs to their data
  const issueMap = new Map(issues.map((i) => [i.id, i]));

  for (const wl of worklogs) {
    const accountId = wl.author?.accountId ?? 'unknown';
    const displayName = wl.author?.displayName ?? 'Unknown User';
    const email = wl.author?.emailAddress;

    if (!userMap.has(accountId)) {
      userMap.set(accountId, {
        accountId,
        displayName,
        emailAddress: email,
        totalTimeSeconds: 0,
        issues: [],
      });
      issueEntryMap.set(accountId, new Map());
    }
    const user = userMap.get(accountId)!;
    const userIssues = issueEntryMap.get(accountId)!;

    const issueId = wl.issueId;
    const issue = issueMap.get(issueId);
    const key = wl.issueKey ?? issue?.key ?? issueId;
    const summary = wl.issueSummary ?? issue?.fields?.summary ?? '';

    let issueEntry = userIssues.get(key);
    if (!issueEntry) {
      issueEntry = { issueKey: key, issueSummary: summary, timeSpentSeconds: 0 };
      userIssues.set(key, issueEntry);
      user.issues.push(issueEntry);
    }
    issueEntry.timeSpentSeconds += wl.timeSpentSeconds;
    user.totalTimeSeconds += wl.timeSpentSeconds;
    totalSeconds += wl.timeSpentSeconds;
  }

  // Sort users and issues by total time desc
  const users = [...userMap.values()].sort((a, b) => b.totalTimeSeconds - a.totalTimeSeconds);
  for (const u of users) {
    u.issues.sort((a, b) => b.timeSpentSeconds - a.timeSpentSeconds);
  }

  return {
    epicKey,
    epicSummary,
    ...(customFields && { customFields }),
    totalTimeSeconds: totalSeconds,
    users,
  };
}

// ── Custom Fields ──────────────────────────────────────────────

function extractCustomFieldValue(raw: unknown): string {
  if (raw === null || raw === undefined) return '-';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'number') return String(raw);
  if (Array.isArray(raw)) {
    const values = raw.map(extractCustomFieldValue).filter((value) => value !== '-');
    return values.length ? values.join(', ') : '-';
  }
  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    const value = obj.value ?? obj.name ?? obj.displayName ?? obj.key;
    return value === undefined ? JSON.stringify(raw) : String(value);
  }
  return String(raw);
}

async function enrichEpicsWithCustomFields(
  conn: JiraConnection,
  epics: EpicInfo[],
  fieldIds: string[],
): Promise<Map<string, Record<string, string>>> {
  const result = new Map<string, Record<string, string>>();
  if (fieldIds.length === 0 || epics.length === 0) return result;

  const chunkSize = 100;
  for (let i = 0; i < epics.length; i += chunkSize) {
    const keys = epics.slice(i, i + chunkSize).map((e) => quoteJql(e.epicKey)).join(',');
    const issues = await searchAllIssues(conn, `key in (${keys})`, fieldIds, 100);

    for (const issue of issues) {
      const values: Record<string, string> = {};
      for (const fieldId of fieldIds) {
        values[fieldId] = extractCustomFieldValue(issue.fields?.[fieldId]);
      }
      result.set(issue.key, values);
    }
  }
  return result;
}

// ── Main Report Builder ───────────────────────────────────────

export async function buildMonthlyReport(
  userId: string,
  filters: ReportFilters,
): Promise<ReportResponse> {
  validateReportRange(filters.startDate, filters.endDate);
  const conn = await getActiveJiraConnection(userId);
  const onlyMyWorklogs = Boolean(filters.onlyMyWorklogs || (!filters.projectKey && !filters.boardId && !filters.epicKey));
  const cacheKey = getReportCacheKey(userId, conn, filters);
  const cached = getCachedReport(cacheKey);
  if (cached) return cached;

  // 1. Discover epics
  let epics: EpicInfo[];
  if (filters.epicKey) {
    const epic = await fetchSingleEpic(conn, filters.epicKey);
    epics = [epic];
  } else if (filters.projectKey) {
    epics = await findProjectEpics(conn, filters.projectKey, filters.startDate, filters.endDate, onlyMyWorklogs);
  } else if (filters.boardId) {
    epics = await findBoardEpics(conn, filters.boardId, filters.startDate, filters.endDate, onlyMyWorklogs);
  } else {
    epics = await findMyEpics(conn, filters.startDate, filters.endDate);
  }

  if (epics.length === 0) {
    const emptyReport = { startDate: filters.startDate, endDate: filters.endDate, totalTimeSeconds: 0, epics: [] };
    setCachedReport(cacheKey, emptyReport);
    return emptyReport;
  }

  // 2. Fetch issues under all epics
  const epicKeys = epics.map((e) => e.epicKey);
  const [issuesByEpic, customFieldsByEpic] = await Promise.all([
    fetchIssuesByEpics(conn, epicKeys, filters.startDate, filters.endDate, onlyMyWorklogs),
    enrichEpicsWithCustomFields(conn, epics, filters.customFields ?? []),
  ]);
  const allIssues = [...issuesByEpic.values()].flat();
  if (allIssues.length === 0) {
    const emptyReport = { startDate: filters.startDate, endDate: filters.endDate, totalTimeSeconds: 0, epics: [] };
    setCachedReport(cacheKey, emptyReport);
    return emptyReport;
  }

  // 3. Fetch worklogs for all issues
  const startMs = new Date(filters.startDate).getTime();
  const endMs = new Date(filters.endDate).getTime();
  const authorAccountId = onlyMyWorklogs ? await getCurrentUserAccountId(conn) : undefined;
  const worklogs = await fetchWorklogsForIssues(conn, allIssues, startMs, endMs, authorAccountId);

  // 4. Build per-epic reports
  const epicReports: MonthlyReport[] = [];
  let grandTotal = 0;
  const issueById = new Map(allIssues.map((issue) => [issue.id, issue]));
  const worklogsByEpic = new Map<string, AugmentedWorklog[]>();

  for (const worklog of worklogs) {
    const epicKey = issueById.get(worklog.issueId)?.fields?.parent?.key;
    if (!epicKey) continue;
    if (!worklogsByEpic.has(epicKey)) worklogsByEpic.set(epicKey, []);
    worklogsByEpic.get(epicKey)!.push(worklog);
  }

  for (const epic of epics) {
    const epicIssues = issuesByEpic.get(epic.epicKey) ?? [];
    if (epicIssues.length === 0) continue;

    const epicWorklogs = worklogsByEpic.get(epic.epicKey) ?? [];
    const report = aggregateWorklogs(
      epic.epicKey,
      epic.epicSummary,
      epicIssues,
      epicWorklogs,
      customFieldsByEpic.get(epic.epicKey),
    );
    if (report.totalTimeSeconds > 0) {
      epicReports.push(report);
      grandTotal += report.totalTimeSeconds;
    }
  }

  // Sort epics by total time desc
  epicReports.sort((a, b) => b.totalTimeSeconds - a.totalTimeSeconds);

  const report = {
    startDate: filters.startDate,
    endDate: filters.endDate,
    totalTimeSeconds: grandTotal,
    epics: epicReports,
  };

  setCachedReport(cacheKey, report);
  return report;
}

export async function listFields(userId: string): Promise<JiraField[]> {
  const conn = await getActiveJiraConnection(userId);
  const cached = fieldsCache.get(conn.id);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const fields = (await jiraGet(conn, '/rest/api/3/field')) as Array<{
    id: string;
    name: string;
    custom: boolean;
    schema?: Record<string, unknown>;
  }>;

  const customFields = fields
    .filter((f) => f.custom)
    .sort((a, b) => a.name.localeCompare(b.name));

  fieldsCache.set(conn.id, { expiresAt: Date.now() + FIELDS_CACHE_TTL_MS, value: customFields });
  return customFields;
}

// ── CSV Export ─────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

export function reportToCsv(report: ReportResponse): string {
  const lines: string[] = [];
  const customFieldIds = [
    ...new Set(report.epics.flatMap((epic) => Object.keys(epic.customFields ?? {}))),
  ];

  // Header
  const header = [
    'Epic Key',
    'Epic Summary',
    ...customFieldIds,
    'User',
    'Email',
    'Issue Key',
    'Issue Summary',
    'Time Spent',
    'Hours',
  ];
  lines.push(header.map(csvEscape).join(','));

  // Data rows
  for (const epic of report.epics) {
    for (const user of epic.users) {
      for (const issue of user.issues) {
        const hours = Math.round((issue.timeSpentSeconds / 3600) * 100) / 100;
        const row = [
          csvEscape(epic.epicKey),
          csvEscape(epic.epicSummary),
          ...customFieldIds.map((fieldId) => csvEscape(epic.customFields?.[fieldId] ?? '')),
          csvEscape(user.displayName),
          csvEscape(user.emailAddress ?? ''),
          csvEscape(issue.issueKey),
          csvEscape(issue.issueSummary),
          csvEscape(formatDuration(issue.timeSpentSeconds)),
          String(hours),
        ];
        lines.push(row.join(','));
      }
    }
  }

  return lines.join('\n');
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
