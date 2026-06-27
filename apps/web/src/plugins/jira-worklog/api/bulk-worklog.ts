import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/client';

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

export interface BulkCreateEntry {
  issueId: string;
  date: string;
  durationSeconds: number;
  comment?: string;
}

export interface BulkCreateResult {
  total: number;
  succeeded: number;
  failed: number;
  totalHours: number;
  results: BulkResultItem[];
}

export interface BulkEditEntry {
  worklogId: string;
  issueId: string;
}

export interface BulkEditUpdates {
  date?: string;
  comment?: string;
}

export interface BulkEditResult {
  total: number;
  succeeded: number;
  failed: number;
  results: BulkResultItem[];
}

export interface BulkDeleteEntry {
  worklogId: string;
  issueId: string;
}

export interface BulkDeleteResult {
  total: number;
  succeeded: number;
  failed: number;
  totalHours: number;
  results: BulkResultItem[];
}

export function useBulkCreateWorklogs() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (entries: BulkCreateEntry[]) =>
      api.post<BulkCreateResult>('/api/bulk/worklogs', { entries }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['worklogs'], exact: false });
    },
  });
}

export function useBulkEditWorklogs() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      entries,
      updates,
    }: {
      entries: BulkEditEntry[];
      updates: BulkEditUpdates;
    }) => api.put<BulkEditResult>('/api/bulk/worklogs', { entries, updates }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['worklogs'], exact: false });
    },
  });
}

export function useBulkDeleteWorklogs() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (entries: BulkDeleteEntry[]) =>
      api.delete<BulkDeleteResult>('/api/bulk/worklogs', { entries }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['worklogs'], exact: false });
    },
  });
}
