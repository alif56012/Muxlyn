import { and, eq } from 'drizzle-orm';
import { getEnv } from '../../config/env';
import { db } from '../../data/postgres';
import { jiraConnections, serviceConnections } from '../../data/schema';
import {
  JiraNetworkError,
  JiraInvalidTokenError,
  JiraNoPermissionError,
  NotFoundError,
} from '../../shared/errors';
import { decryptToken } from '../../shared/crypto';
import { decryptToken as decryptLegacyToken } from '../jira/jira-service';

const env = getEnv();

export interface JiraConnection {
  id: string;
  jiraUrl: string;
  email: string;
  apiToken: string;
}

export interface JiraIssue {
  id: string;
  key: string;
  isSubtask: boolean;
  summary: string;
}

export interface JiraWorklog {
  id: string;
  issueId: string;
  timeSpentSeconds: number;
  started: string;
  comment?: string;
}

export interface CreateWorklogInput {
  timeSpentSeconds: number;
  started: string;
  comment?: string;
}

export interface UpdateWorklogInput {
  timeSpentSeconds?: number;
  started?: string;
  comment?: string;
}

class JiraRateLimitError extends JiraNetworkError {
  constructor() {
    super('Jira rate limit reached. Please wait and try again.');
  }
}

export async function getActiveJiraConnection(
  userId: string,
): Promise<JiraConnection> {
  const jc = await db
    .select({
      id: jiraConnections.id,
      jiraUrl: jiraConnections.jiraUrl,
      email: jiraConnections.email,
      apiTokenEncrypted: jiraConnections.apiTokenEncrypted,
    })
    .from(jiraConnections)
    .where(
      and(
        eq(jiraConnections.userId, userId),
        eq(jiraConnections.isActive, true),
      ),
    )
    .limit(1);

  if (jc.length > 0) {
    const row = jc[0];
    const apiToken = await decryptLegacyToken(
      row.apiTokenEncrypted,
      env.ENCRYPTION_KEY,
    );
    return {
      id: row.id,
      jiraUrl: row.jiraUrl.trim().replace(/\/+$/, ''),
      email: row.email ?? '',
      apiToken,
    };
  }

  const sc = await db
    .select({
      id: serviceConnections.id,
      jiraUrl: serviceConnections.url,
      displayName: serviceConnections.displayName,
      metadata: serviceConnections.metadata,
      encryptedToken: serviceConnections.encryptedToken,
    })
    .from(serviceConnections)
    .where(
      and(
        eq(serviceConnections.userId, userId),
        eq(serviceConnections.serviceType, 'jira'),
        eq(serviceConnections.isActive, true),
      ),
    )
    .limit(1);

  if (sc.length > 0) {
    const row = sc[0];
    const jiraUrl =
      (row.jiraUrl ?? '').trim().replace(/\/+$/, '');
    if (!jiraUrl || !jiraUrl.startsWith('https://')) {
      throw new NotFoundError(
        'Jira URL is missing or invalid. Please reconnect your Jira account in Settings.',
      );
    }
    const apiToken = await decryptToken(
      row.encryptedToken,
      env.ENCRYPTION_KEY,
      userId,
    );
    const metadata = (row.metadata ?? {}) as Record<string, unknown>;
    const email =
      typeof metadata.email === 'string' && metadata.email
        ? metadata.email
        : row.displayName;
    return { id: row.id, jiraUrl, email, apiToken };
  }

  throw new NotFoundError(
    'No active Jira connection. Please connect a Jira account first.',
  );
}

function authHeader(connection: JiraConnection): string {
  return `Basic ${btoa(`${connection.email}:${connection.apiToken}`)}`;
}

function toAdfComment(text: string): string {
  return JSON.stringify({
    type: 'doc',
    version: 1,
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text }],
      },
    ],
  });
}

function buildWorklogPayload(input: CreateWorklogInput | UpdateWorklogInput) {
  const payload: Record<string, unknown> = {};
  if (input.timeSpentSeconds !== undefined) {
    payload.timeSpentSeconds = input.timeSpentSeconds;
  }
  if (input.started !== undefined) {
    payload.started = input.started;
  }
  if (input.comment !== undefined) {
    payload.comment = JSON.parse(toAdfComment(input.comment));
  }
  return payload;
}

async function jiraFetch(
  connection: JiraConnection,
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const url = `${connection.jiraUrl}${path}`;
  const headers: Record<string, string> = {
    Authorization: authHeader(connection),
    Accept: 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    console.error('[jiraFetch] fetch threw:', err);
    throw new JiraNetworkError(
      `Cannot connect to Jira at ${connection.jiraUrl}. Please check the URL and try again.`,
    );
  }

  console.log(`[jiraFetch] ${options.method ?? 'GET'} ${url} → ${response.status}`);

  if (response.status === 401) {
    throw new JiraInvalidTokenError(
      `Jira API token is invalid or expired for ${connection.email}. Please update it in Settings.`,
    );
  }
  if (response.status === 403) {
    throw new JiraNoPermissionError(
      `Permission denied for ${connection.email}.`,
    );
  }
  if (response.status === 429) {
    throw new JiraRateLimitError();
  }
  if (response.status === 404) {
    throw new JiraNetworkError(
      `Jira resource not found: ${url}. Check if the issue exists and you have access.`,
    );
  }
  if (!response.ok) {
    let errMsg = `Jira returned status ${response.status} for ${path}.`;
    try {
      const errBody = await response.json();
      if (errBody && Array.isArray(errBody.errorMessages) && errBody.errorMessages.length > 0) {
        errMsg = errBody.errorMessages.join(', ');
      } else if (errBody && errBody.errors && typeof errBody.errors === 'object') {
        errMsg = Object.entries(errBody.errors).map(([k, v]) => `${k}: ${v}`).join(', ');
      }
    } catch {
      // ignore
    }
    throw new JiraNetworkError(errMsg);
  }

  return response;
}

export async function getJiraIssue(
  connection: JiraConnection,
  issueId: string,
): Promise<JiraIssue> {
  const response = await jiraFetch(
    connection,
    `/rest/api/3/issue/${issueId}`,
  );
  const data = await response.json();

  return {
    id: data.id,
    key: data.key,
    isSubtask: data.fields?.issuetype?.subtask ?? false,
    summary: data.fields?.summary ?? '',
  };
}

export async function createJiraWorklog(
  connection: JiraConnection,
  issueId: string,
  input: CreateWorklogInput,
): Promise<{ id: string; timeSpentSeconds: number }> {
  const response = await jiraFetch(
    connection,
    `/rest/api/3/issue/${issueId}/worklog`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildWorklogPayload(input)),
    },
  );
  const data = await response.json();
  return { id: data.id, timeSpentSeconds: data.timeSpentSeconds };
}

export async function getJiraWorklog(
  connection: JiraConnection,
  issueId: string,
  worklogId: string,
): Promise<JiraWorklog> {
  const response = await jiraFetch(
    connection,
    `/rest/api/3/issue/${issueId}/worklog/${worklogId}`,
  );
  const data = await response.json();

  let comment: string | undefined;
  if (data.comment) {
    const textContent = data.comment?.content?.[0]?.content?.[0]?.text;
    comment = typeof textContent === 'string' ? textContent : undefined;
  }

  return {
    id: data.id,
    issueId: data.issueId,
    timeSpentSeconds: data.timeSpentSeconds,
    started: data.started,
    comment,
  };
}

export async function updateJiraWorklog(
  connection: JiraConnection,
  issueId: string,
  worklogId: string,
  input: UpdateWorklogInput,
): Promise<{ id: string; timeSpentSeconds: number }> {
  const response = await jiraFetch(
    connection,
    `/rest/api/3/issue/${issueId}/worklog/${worklogId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildWorklogPayload(input)),
    },
  );
  const data = await response.json();
  return { id: data.id, timeSpentSeconds: data.timeSpentSeconds };
}

export async function deleteJiraWorklog(
  connection: JiraConnection,
  issueId: string,
  worklogId: string,
): Promise<void> {
  await jiraFetch(
    connection,
    `/rest/api/3/issue/${issueId}/worklog/${worklogId}`,
    { method: 'DELETE' },
  );
}
