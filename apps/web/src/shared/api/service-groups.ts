import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ServiceGroup } from '@/shared/core/types';
import { api } from '@/shared/api/client';

interface ApiServiceGroup {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  sort_order: number;
  collapsed: boolean;
  created_at: string;
  updated_at: string;
}

function toServiceGroup(api: ApiServiceGroup): ServiceGroup {
  return {
    id: api.id,
    name: api.name,
    color: api.color,
    icon: api.icon,
    sortOrder: api.sort_order,
    collapsed: api.collapsed,
  };
}

export function useServiceGroups() {
  return useQuery({
    queryKey: ['service-groups'],
    queryFn: async () => {
      const res = await api.get<{ groups: ApiServiceGroup[] }>('/api/service-groups');
      if (!res.success) throw new Error(res.error?.code ?? 'Failed to fetch groups');
      return (res.data?.groups ?? []).map(toServiceGroup);
    },
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: { name: string; color?: string; icon?: string; sort_order?: number }) =>
      api.post('/api/service-groups', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['service-groups'] }),
  });
}

export function useUpdateGroup() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      name?: string;
      color?: string;
      icon?: string | null;
      sort_order?: number;
      collapsed?: boolean;
    }) => api.put(`/api/service-groups/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['service-groups'] }),
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/service-groups/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service-groups'] });
      qc.invalidateQueries({ queryKey: ['service-connections'] });
    },
  });
}
