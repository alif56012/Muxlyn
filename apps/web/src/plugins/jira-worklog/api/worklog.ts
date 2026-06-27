import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/client';

export interface CreateWorklogInput {
  issueId: string;
  date: string;
  durationSeconds: number;
  comment?: string;
}

export interface CreateWorklogResult {
  worklogId: string;
  issueId: string;
  issueKey: string;
  hours: number;
  date: string;
  comment?: string;
}

export interface UpdateWorklogInput {
  worklogId: string;
  issueId: string;
  date?: string;
  started?: string;
  durationSeconds?: number;
  comment?: string;
}

export interface WorklogDetail {
  worklogId: string;
  issueId: string;
  timeSpentSeconds: number;
  started: string;
  hours: number;
  comment?: string;
}

export interface IssueInfo {
  id: string;
  key: string;
  isSubtask: boolean;
  summary: string;
}

export function useCreateWorklog() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateWorklogInput) =>
      api.post<CreateWorklogResult>('/api/worklogs', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['worklogs'], exact: false });
    },
  });
}

export function useUpdateWorklog() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      worklogId,
      issueId,
      ...body
    }: UpdateWorklogInput) =>
      api.put<{ worklogId: string; issueId: string; hours: number }>(
        `/api/worklogs/${worklogId}?issueId=${encodeURIComponent(issueId)}`,
        body,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['worklogs'], exact: false });
    },
  });
}

export function useDeleteWorklog() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      worklogId,
      issueId,
    }: {
      worklogId: string;
      issueId: string;
    }) =>
      api.delete(
        `/api/worklogs/${worklogId}?issueId=${encodeURIComponent(issueId)}`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['worklogs'], exact: false });
    },
  });
}

export function useWorklog(worklogId: string, issueId: string) {
  return useQuery({
    queryKey: ['worklogs', worklogId],
    queryFn: async () => {
      const res = await api.get<WorklogDetail>(
        `/api/worklogs/${worklogId}?issueId=${encodeURIComponent(issueId)}`,
      );
      if (!res.success || !res.data) {
        throw new Error(res.error?.code ?? 'Failed to fetch worklog');
      }
      return res.data;
    },
    enabled: !!worklogId && !!issueId,
  });
}

export function useIssueInfo(issueId: string) {
  return useQuery({
    queryKey: ['issue', issueId],
    queryFn: async () => {
      const res = await api.get<IssueInfo>(`/api/issues/${issueId}`);
      if (!res.success || !res.data) {
        throw new Error(res.error?.code ?? 'Failed to fetch issue');
      }
      return res.data;
    },
    enabled: !!issueId,
  });
}
