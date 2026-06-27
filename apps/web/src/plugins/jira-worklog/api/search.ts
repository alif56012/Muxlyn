import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
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

export function useWorklogSearch() {
  return useMutation({
    mutationFn: (filters: WorklogSearchFilters) =>
      api.post<WorklogSearchResult>('/api/worklogs/search', filters),
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

export function useIssueSearch() {
  return useMutation({
    mutationFn: (filters: WorklogSearchFilters) =>
      api.post<IssueSearchResult>('/api/issues/search', filters),
  });
}
