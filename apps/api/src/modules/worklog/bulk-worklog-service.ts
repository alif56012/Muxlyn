import {
  JiraInvalidTokenError,
  JiraNetworkError,
  JiraNoPermissionError,
} from '../../shared/errors';
import {
  getActiveJiraConnection,
  getJiraIssue,
  createJiraWorklog,
  getJiraWorklog,
  updateJiraWorklog,
  deleteJiraWorklog,
  type JiraConnection,
} from './jira-worklog-client';

const MAX_BULK_ENTRIES = 50;

export interface BulkCreateEntry {
  issueId: string;
  date: string;
  durationSeconds: number;
  comment?: string;
}

export interface BulkEditEntry {
  worklogId: string;
  issueId: string;
}

export interface BulkEditUpdates {
  date?: string;
  comment?: string;
}

export interface BulkDeleteEntry {
  worklogId: string;
  issueId: string;
}

export interface BulkResultItem {
  issueId: string;
  issueKey: string;
  hours: number;
  status: 'success' | 'failed';
  worklogId?: string;
  error?: string;
  errorCode?:
    | 'SUBTASK'
    | 'ZERO_DURATION'
    | 'NETWORK'
    | 'UNAUTHORIZED'
    | 'PERMISSION'
    | 'RATE_LIMIT'
    | 'UNKNOWN';
}

export interface BulkCreateResult {
  total: number;
  succeeded: number;
  failed: number;
  totalHours: number;
  results: BulkResultItem[];
}

export interface BulkEditResult {
  total: number;
  succeeded: number;
  failed: number;
  results: BulkResultItem[];
}

export interface BulkDeleteResult {
  total: number;
  succeeded: number;
  failed: number;
  totalHours: number;
  results: BulkResultItem[];
}

function mapErrorCode(error: unknown): {
  errorCode: BulkResultItem['errorCode'];
  errorMessage: string;
  isFatal: boolean;
} {
  if (error instanceof JiraInvalidTokenError) {
    return {
      errorCode: 'UNAUTHORIZED',
      errorMessage: error.message,
      isFatal: true,
    };
  }
  if (error instanceof JiraNoPermissionError) {
    return {
      errorCode: 'PERMISSION',
      errorMessage: error.message,
      isFatal: false,
    };
  }
  if (error instanceof JiraNetworkError) {
    const message = error.message.toLowerCase();
    const isRateLimit = message.includes('rate limit');
    return {
      errorCode: isRateLimit ? 'RATE_LIMIT' : 'NETWORK',
      errorMessage: error.message,
      isFatal: false,
    };
  }
  return {
    errorCode: 'UNKNOWN',
    errorMessage: 'An unexpected error occurred. Please try again.',
    isFatal: false,
  };
}

function hoursFromSeconds(seconds: number): number {
  return Math.round((seconds / 3600) * 100) / 100;
}

function toStartedDatetime(date: string): string {
  return `${date}T00:00:00.000+0000`;
}

export async function processBulkCreate(
  userId: string,
  entries: BulkCreateEntry[],
): Promise<BulkCreateResult> {
  if (entries.length === 0) {
    return { total: 0, succeeded: 0, failed: 0, totalHours: 0, results: [] };
  }

  if (entries.length > MAX_BULK_ENTRIES) {
    return {
      total: entries.length,
      succeeded: 0,
      failed: entries.length,
      totalHours: 0,
      results: entries.map((e) => ({
        issueId: e.issueId,
        issueKey: '',
        hours: 0,
        status: 'failed',
        error: `Maximum ${MAX_BULK_ENTRIES} entries allowed per batch.`,
        errorCode: 'UNKNOWN',
      })),
    };
  }

  const connection = await getActiveJiraConnection(userId);
  const results: BulkResultItem[] = [];
  let succeeded = 0;
  let failed = 0;
  let totalHours = 0;

  for (const entry of entries) {
    const started = toStartedDatetime(entry.date);

    try {
      const issue = await getJiraIssue(connection, entry.issueId);

      if (issue.isSubtask) {
        failed++;
        results.push({
          issueId: entry.issueId,
          issueKey: issue.key,
          hours: 0,
          status: 'failed',
          error: 'Cannot log work on sub-tasks. Please select a parent issue.',
          errorCode: 'SUBTASK',
        });
        continue;
      }

      if (entry.durationSeconds <= 0) {
        failed++;
        results.push({
          issueId: entry.issueId,
          issueKey: issue.key,
          hours: 0,
          status: 'failed',
          error: 'Duration must be greater than 0.',
          errorCode: 'ZERO_DURATION',
        });
        continue;
      }

      const worklog = await createJiraWorklog(connection, entry.issueId, {
        timeSpentSeconds: entry.durationSeconds,
        started,
        comment: entry.comment,
      });

      const hours = hoursFromSeconds(worklog.timeSpentSeconds);
      succeeded++;
      totalHours += hours;

      results.push({
        issueId: entry.issueId,
        issueKey: issue.key,
        hours,
        status: 'success',
        worklogId: worklog.id,
      });
    } catch (error) {
      const { errorCode, errorMessage, isFatal } = mapErrorCode(error);
      failed++;

      results.push({
        issueId: entry.issueId,
        issueKey: '',
        hours: 0,
        status: 'failed',
        error: errorMessage,
        errorCode,
      });

      if (isFatal) {
        break;
      }
    }
  }

  return {
    total: entries.length,
    succeeded,
    failed,
    totalHours: Math.round(totalHours * 100) / 100,
    results,
  };
}

export async function processBulkEdit(
  userId: string,
  entries: BulkEditEntry[],
  updates: BulkEditUpdates,
): Promise<BulkEditResult> {
  if (entries.length === 0) {
    return { total: 0, succeeded: 0, failed: 0, results: [] };
  }

  if (entries.length > MAX_BULK_ENTRIES) {
    return {
      total: entries.length,
      succeeded: 0,
      failed: entries.length,
      results: entries.map((e) => ({
        issueId: e.issueId,
        issueKey: '',
        hours: 0,
        status: 'failed',
        error: `Maximum ${MAX_BULK_ENTRIES} entries allowed per batch.`,
        errorCode: 'UNKNOWN',
      })),
    };
  }

  if (!updates.date && updates.comment === undefined) {
    return {
      total: entries.length,
      succeeded: 0,
      failed: entries.length,
      results: entries.map((e) => ({
        issueId: e.issueId,
        issueKey: '',
        hours: 0,
        status: 'failed',
        error: 'No fields to update.',
        errorCode: 'UNKNOWN',
      })),
    };
  }

  const connection = await getActiveJiraConnection(userId);
  const results: BulkResultItem[] = [];
  let succeeded = 0;
  let failed = 0;

  for (const entry of entries) {
    try {
      const existing = await getJiraWorklog(
        connection,
        entry.issueId,
        entry.worklogId,
      );

      const merged: {
        timeSpentSeconds: number;
        started: string;
        comment?: string;
      } = {
        timeSpentSeconds: existing.timeSpentSeconds,
        started: updates.date
          ? toStartedDatetime(updates.date)
          : existing.started,
        comment:
          updates.comment !== undefined
            ? updates.comment
            : existing.comment,
      };

      await updateJiraWorklog(connection, entry.issueId, entry.worklogId, {
        timeSpentSeconds: merged.timeSpentSeconds,
        started: merged.started,
        comment: merged.comment,
      });

      const hours = hoursFromSeconds(existing.timeSpentSeconds);
      succeeded++;

      results.push({
        issueId: entry.issueId,
        issueKey: '',
        hours,
        status: 'success',
        worklogId: entry.worklogId,
      });
    } catch (error) {
      const { errorCode, errorMessage, isFatal } = mapErrorCode(error);
      failed++;

      results.push({
        issueId: entry.issueId,
        issueKey: '',
        hours: 0,
        status: 'failed',
        error: errorMessage,
        errorCode,
      });

      if (isFatal) {
        break;
      }
    }
  }

  return { total: entries.length, succeeded, failed, results };
}

export async function processBulkDelete(
  userId: string,
  entries: BulkDeleteEntry[],
): Promise<BulkDeleteResult> {
  if (entries.length === 0) {
    return { total: 0, succeeded: 0, failed: 0, totalHours: 0, results: [] };
  }

  if (entries.length > MAX_BULK_ENTRIES) {
    return {
      total: entries.length,
      succeeded: 0,
      failed: entries.length,
      totalHours: 0,
      results: entries.map((e) => ({
        issueId: e.issueId,
        issueKey: '',
        hours: 0,
        status: 'failed',
        error: `Maximum ${MAX_BULK_ENTRIES} entries allowed per batch.`,
        errorCode: 'UNKNOWN',
      })),
    };
  }

  const connection = await getActiveJiraConnection(userId);
  const results: BulkResultItem[] = [];
  let succeeded = 0;
  let failed = 0;
  let totalHours = 0;

  for (const entry of entries) {
    try {
      const existing = await getJiraWorklog(
        connection,
        entry.issueId,
        entry.worklogId,
      );

      await deleteJiraWorklog(connection, entry.issueId, entry.worklogId);

      const hours = hoursFromSeconds(existing.timeSpentSeconds);
      succeeded++;
      totalHours += hours;

      results.push({
        issueId: entry.issueId,
        issueKey: '',
        hours,
        status: 'success',
        worklogId: entry.worklogId,
      });
    } catch (error) {
      const { errorCode, errorMessage, isFatal } = mapErrorCode(error);
      failed++;

      results.push({
        issueId: entry.issueId,
        issueKey: '',
        hours: 0,
        status: 'failed',
        error: errorMessage,
        errorCode,
      });

      if (isFatal) {
        break;
      }
    }
  }

  return {
    total: entries.length,
    succeeded,
    failed,
    totalHours: Math.round(totalHours * 100) / 100,
    results,
  };
}
