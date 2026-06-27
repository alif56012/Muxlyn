import {
  JiraNetworkError,
  JiraInvalidTokenError,
} from '../../shared/errors';
import {
  getActiveJiraConnection,
  type JiraConnection,
} from './jira-worklog-client';

interface JiraSearchIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    issuetype: { name: string; subtask: boolean };
    status: { name: string };
    project: { key: string; name: string };
    assignee: { displayName: string; emailAddress: string } | null;
  };
}

interface JiraWorklogItem {
  id: string;
  issueId: string;
  timeSpentSeconds: number;
  started: string;
  comment?: unknown;
  author?: {
    emailAddress?: string;
    displayName?: string;
    accountId?: string;
  };
}

export interface WorklogSearchFilters {
  project?: string;
  assignee?: string;
  status?: string;
  freeText?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface WorklogSearchResultItem {
  worklogId: string;
  issueId: string;
  issueKey: string;
  issueSummary: string;
  issueType: string;
  projectKey: string;
  projectName: string;
  status: string;
  assignee: string | null;
  author: string | null;
  hours: number;
  timeSpentSeconds: number;
  date: string;
  started: string;
  comment?: string;
}

export interface WorklogSearchResponse {
  items: WorklogSearchResultItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  totalHours: number;
}

export interface IssueSearchResult {
  id: string;
  key: string;
  summary: string;
  issueType: string;
  isSubtask: boolean;
  status: string;
  projectKey: string;
  projectName: string;
  assignee: string | null;
}

const MAX_ISSUES = 100;
const CONCURRENCY = 6;
const MS_PER_DAY = 86_400_000;

function authHeader(connection: JiraConnection): string {
  return `Basic ${btoa(`${connection.email}:${connection.apiToken}`)}`;
}

async function jiraPost(
  connection: JiraConnection,
  path: string,
  body: unknown,
): Promise<unknown> {
  const url = `${connection.jiraUrl}${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: authHeader(connection),
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    console.error('[jiraPost] fetch threw:', url, err);
    throw new JiraNetworkError();
  }
  console.log(`[jiraPost] ${url} → ${response.status}`);
  if (response.status === 401) throw new JiraInvalidTokenError();
  if (response.status === 403) throw new JiraNetworkError('Permission denied');
  if (response.status === 429)
    throw new JiraNetworkError('Jira rate limit reached.');
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.error(`[jiraPost] non-ok body:`, text);
    throw new JiraNetworkError();
  }
  return response.json();
}

async function jiraGet(
  connection: JiraConnection,
  path: string,
): Promise<unknown> {
  const url = `${connection.jiraUrl}${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Authorization: authHeader(connection),
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    console.error('[jiraGet] fetch threw:', url, err);
    throw new JiraNetworkError();
  }
  if (response.status === 401) throw new JiraInvalidTokenError();
  if (response.status === 403) throw new JiraNetworkError('Permission denied');
  if (response.status === 429)
    throw new JiraNetworkError('Jira rate limit reached.');
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.error(`[jiraGet] non-ok body:`, text);
    throw new JiraNetworkError();
  }
  return response.json();
}

function buildJql(filters: WorklogSearchFilters): string {
  const parts: string[] = ['worklogAuthor = currentUser()'];

  if (filters.freeText) {
    parts.push(`text ~ "${filters.freeText.replace(/"/g, '\\"')}"`);
  }
  if (filters.project) {
    parts.push(`project = "${filters.project}"`);
  }
  if (filters.assignee) {
    parts.push(`assignee = "${filters.assignee}"`);
  }
  if (filters.status) {
    parts.push(`status = "${filters.status}"`);
  }
  if (filters.dateFrom) {
    parts.push(`worklogDate >= "${filters.dateFrom}"`);
  }
  if (filters.dateTo) {
    parts.push(`worklogDate <= "${filters.dateTo}"`);
  }

  return parts.join(' AND ') + ' order by updated DESC';
}

function extractCommentText(comment: unknown): string | undefined {
  if (!comment || typeof comment !== 'object') return undefined;
  const c = comment as Record<string, unknown>;
  const content = c.content as Array<Record<string, unknown>> | undefined;
  const firstParagraph = content?.[0];
  const textNodes = firstParagraph?.content as
    | Array<Record<string, unknown>>
    | undefined;
  const firstText = textNodes?.[0];
  return typeof firstText?.text === 'string' ? firstText.text : undefined;
}

export async function searchWorklogs(
  userId: string,
  filters: WorklogSearchFilters,
  page: number = 1,
  pageSize: number = 50,
): Promise<WorklogSearchResponse> {
  const connection = await getActiveJiraConnection(userId);
  const jql = buildJql(filters);

  // get current user's accountId for author filtering
  let currentUserAccountId: string | null = null;
  try {
    const myself = (await jiraGet(connection, '/rest/api/3/myself')) as {
      accountId: string;
      displayName: string;
      emailAddress?: string;
    };
    currentUserAccountId = myself.accountId;
  } catch {
    console.warn('[searchWorklogs] Failed to fetch current user, author filtering will be unavailable');
  }

  const searchData = (await jiraPost(
    connection,
    '/rest/api/3/search/jql',
    {
      jql,
      fields: ['summary', 'issuetype', 'status', 'project', 'assignee'],
      maxResults: MAX_ISSUES,
    },
  )) as { issues: JiraSearchIssue[]; total: number };

  const issues = searchData.issues ?? [];

  // startedAfter is exclusive — subtract 1ms so worklogs at midnight are included
  const startMs = Math.max(
    0,
    (filters.dateFrom ? new Date(filters.dateFrom).getTime() : 0) - 1,
  );
  const endMs = filters.dateTo
    ? new Date(filters.dateTo).getTime() + MS_PER_DAY
    : Date.now() + MS_PER_DAY;

  const allWorklogs: WorklogSearchResultItem[] = [];

  for (let i = 0; i < issues.length; i += CONCURRENCY) {
    const batch = issues.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((issue) =>
        jiraGet(
          connection,
          `/rest/api/3/issue/${issue.id}/worklog?startedAfter=${startMs}&startedBefore=${endMs}`,
        ).then((data) => ({ issue, data: data as { worklogs: JiraWorklogItem[] } })),
      ),
    );

    for (const result of results) {
      if (result.status === 'rejected') continue;
      const { issue, data: worklogsData } = result.value;

      for (const wl of worklogsData.worklogs ?? []) {
        // filter to current user's own worklogs only
        const authorAccountId = wl.author?.accountId;
        if (
          currentUserAccountId &&
          authorAccountId &&
          authorAccountId !== currentUserAccountId
        ) {
          continue;
        }

        const wlDate = wl.started.slice(0, 10);
        const hours = Math.round((wl.timeSpentSeconds / 3600) * 100) / 100;

        allWorklogs.push({
          worklogId: wl.id,
          issueId: wl.issueId,
          issueKey: issue.key,
          issueSummary: issue.fields.summary,
          issueType: issue.fields.issuetype?.name ?? '',
          projectKey: issue.fields.project?.key ?? '',
          projectName: issue.fields.project?.name ?? '',
          status: issue.fields.status?.name ?? '',
          assignee: issue.fields.assignee?.displayName ?? null,
          author: wl.author?.displayName ?? null,
          hours,
          timeSpentSeconds: wl.timeSpentSeconds,
          date: wlDate,
          started: wl.started,
          comment: extractCommentText(wl.comment),
        });
      }
    }
  }

  allWorklogs.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const total = allWorklogs.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const start = (page - 1) * pageSize;
  const paged = allWorklogs.slice(start, start + pageSize);
  const totalHours =
    Math.round(allWorklogs.reduce((sum, wl) => sum + wl.hours, 0) * 100) / 100;

  return { items: paged, total, page, pageSize, totalPages, totalHours };
}

export async function searchIssues(
  userId: string,
  filters: WorklogSearchFilters,
  page: number = 1,
  pageSize: number = 50,
): Promise<{ items: IssueSearchResult[]; total: number }> {
  const connection = await getActiveJiraConnection(userId);
  const jql = buildJql(filters);

  const searchData = (await jiraPost(
    connection,
    '/rest/api/3/search/jql',
    {
      jql,
      fields: ['summary', 'issuetype', 'status', 'project', 'assignee'],
      maxResults: MAX_ISSUES,
    },
  )) as { issues: JiraSearchIssue[]; total: number };

  const items = (searchData.issues ?? []).map((issue) => ({
    id: issue.id,
    key: issue.key,
    summary: issue.fields.summary,
    issueType: issue.fields.issuetype?.name ?? '',
    isSubtask: issue.fields.issuetype?.subtask ?? false,
    status: issue.fields.status?.name ?? '',
    projectKey: issue.fields.project?.key ?? '',
    projectName: issue.fields.project?.name ?? '',
    assignee: issue.fields.assignee?.displayName ?? null,
  }));

  return { items, total: items.length };
}
