import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api/client';

export interface WorklogSearchFilters {
  project?: string;
  assignee?: string;
  status?: string;
  freeText?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface WorklogSearchItem {
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

export interface WorklogSearchResult {
  items: WorklogSearchItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  totalHours: number;
}

export interface IssueSearchItem {
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

export interface IssueSearchResult {
  items: IssueSearchItem[];
  total: number;
}

export function useWorklogSearch(filters: WorklogSearchFilters | null, enabled = true) {
  return useQuery({
    queryKey: ['worklogs', 'search', filters],
    queryFn: async () => {
      const res = await api.post<WorklogSearchResult>(
        '/api/worklogs/search',
        filters as WorklogSearchFilters,
      );
      if (!res.success || !res.data) {
        throw new Error(res.error?.code ?? 'Failed to search worklogs');
      }
      return res.data;
    },
    enabled: enabled && filters !== null,
    placeholderData: keepPreviousData,
  });
}

export function useIssueSearch(filters: WorklogSearchFilters | null, enabled = true) {
  return useQuery({
    queryKey: ['issues', 'search', filters],
    queryFn: async () => {
      const res = await api.post<IssueSearchResult>(
        '/api/issues/search',
        filters as WorklogSearchFilters,
      );
      if (!res.success || !res.data) {
        throw new Error(res.error?.code ?? 'Failed to search issues');
      }
      return res.data;
    },
    enabled: enabled && filters !== null,
  });
}

export function useWorklogsByDateRange(dateFrom: string, dateTo: string, enabled = true) {
  return useQuery({
    queryKey: ['worklogs', 'calendar', dateFrom, dateTo],
    queryFn: async () => {
      const res = await api.post<WorklogSearchResult>('/api/worklogs/search', {
        dateFrom,
        dateTo,
        pageSize: 100,
      });
      return res.data?.items ?? [];
    },
    enabled: enabled && !!dateFrom && !!dateTo,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}
