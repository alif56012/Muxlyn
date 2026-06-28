import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api/client';

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

export interface ReportResponse {
  startDate: string;
  endDate: string;
  totalTimeSeconds: number;
  epics: MonthlyReport[];
}

export interface JiraField {
  id: string;
  name: string;
  custom: boolean;
  schema?: Record<string, unknown>;
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

// ── Hooks ──────────────────────────────────────────────────────

export function useMonthlyReport(filters: ReportFilters | null) {
  return useQuery({
    queryKey: ['report', 'monthly', filters],
    queryFn: async () => {
      const res = await api.post<ReportResponse>(
        '/api/worklog/reports/monthly',
        filters as unknown as Record<string, unknown>,
      );
      if (!res.success || !res.data) {
        throw new Error(res.error?.code ?? 'Failed to fetch report');
      }
      return res.data;
    },
    enabled: !!filters,
    staleTime: 300_000,
  });
}

export function useMonthlyReportByProject(filters: ReportFilters | null) {
  return useQuery({
    queryKey: ['report', 'monthly-by-project', filters],
    queryFn: async () => {
      const f = filters as ReportFilters;
      const res = await api.post<ReportResponse>('/api/worklog/reports/monthly-by-project', {
        projectKey: f.projectKey,
        startDate: f.startDate,
        endDate: f.endDate,
        customFields: f.customFields,
        onlyMyWorklogs: f.onlyMyWorklogs,
      });
      if (!res.success || !res.data) {
        throw new Error(res.error?.code ?? 'Failed to fetch report');
      }
      return res.data;
    },
    enabled: !!filters && !!filters.projectKey,
    staleTime: 300_000,
  });
}

export function useMonthlyReportByBoard(filters: ReportFilters | null) {
  return useQuery({
    queryKey: ['report', 'monthly-by-board', filters],
    queryFn: async () => {
      const f = filters as ReportFilters;
      const res = await api.post<ReportResponse>('/api/worklog/reports/monthly-by-board', {
        boardId: f.boardId,
        startDate: f.startDate,
        endDate: f.endDate,
        customFields: f.customFields,
        onlyMyWorklogs: f.onlyMyWorklogs,
      });
      if (!res.success || !res.data) {
        throw new Error(res.error?.code ?? 'Failed to fetch report');
      }
      return res.data;
    },
    enabled: !!filters && !!filters.boardId,
    staleTime: 300_000,
  });
}

export function useMonthlyReportByEpic(filters: ReportFilters | null) {
  return useQuery({
    queryKey: ['report', 'monthly-by-epic', filters],
    queryFn: async () => {
      const f = filters as ReportFilters;
      const res = await api.post<ReportResponse>('/api/worklog/reports/monthly-by-epic', {
        epicKey: f.epicKey,
        startDate: f.startDate,
        endDate: f.endDate,
        customFields: f.customFields,
        onlyMyWorklogs: f.onlyMyWorklogs,
      });
      if (!res.success || !res.data) {
        throw new Error(res.error?.code ?? 'Failed to fetch report');
      }
      return res.data;
    },
    enabled: !!filters && !!filters.epicKey,
    staleTime: 300_000,
  });
}

export function useReportFields() {
  return useQuery({
    queryKey: ['report', 'fields'],
    queryFn: async () => {
      const res = await api.get<{ fields: JiraField[] }>('/api/worklog/reports/fields');
      if (!res.success || !res.data) {
        throw new Error(res.error?.code ?? 'Failed to fetch fields');
      }
      return res.data.fields;
    },
    staleTime: 600_000,
  });
}

export function useProjects() {
  return useQuery({
    queryKey: ['worklog', 'projects'],
    queryFn: async () => {
      const res = await api.get<{ projects: { key: string; name: string }[] }>('/api/worklog/projects');
      if (!res.success || !res.data) {
        throw new Error(res.error?.code ?? 'Failed to fetch projects');
      }
      return res.data.projects;
    },
    staleTime: 300_000,
  });
}

export function useBoards() {
  return useQuery({
    queryKey: ['worklog', 'boards'],
    queryFn: async () => {
      const res = await api.get<{ boards: { id: string; name: string; projectKey?: string }[] }>('/api/worklog/boards');
      if (!res.success || !res.data) {
        throw new Error(res.error?.code ?? 'Failed to fetch boards');
      }
      return res.data.boards;
    },
    staleTime: 300_000,
  });
}

export function useEpicSearch(q: string | null) {
  return useQuery({
    queryKey: ['worklog', 'epics', q],
    queryFn: async () => {
      const res = await api.post<{ epics: { key: string; summary: string }[] }>('/api/worklog/epics/search', { q: q ?? '' });
      if (!res.success || !res.data) {
        throw new Error(res.error?.code ?? 'Failed to search epics');
      }
      return res.data.epics;
    },
    enabled: q !== null && q.length >= 2,
    staleTime: 60_000,
  });
}

export function getReportCsvUrl(
  filters: ReportFilters,
  variant: 'monthly' | 'by-project' | 'by-board' | 'by-epic',
): string {
  const base = '/api/worklog/reports';
  const params = new URLSearchParams({ format: 'csv' });

  switch (variant) {
    case 'monthly':
      return `${base}/monthly?${params.toString()}`;
    case 'by-project':
      return `${base}/monthly-by-project?${params.toString()}`;
    case 'by-board':
      return `${base}/monthly-by-board?${params.toString()}`;
    case 'by-epic':
      return `${base}/monthly-by-epic?${params.toString()}`;
  }
}
