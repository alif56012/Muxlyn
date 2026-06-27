import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ServiceConnection, ServiceType } from '@/shared/core/types';
import { api } from '@/shared/api/client';

interface ApiServiceConnection {
  id: string;
  service_type: string;
  display_name: string;
  url: string | null;
  status: string;
  tags: string[];
  description: string | null;
  pinned: boolean;
  sort_order: number;
  group_id: string | null;
  health_enabled: boolean;
  health_interval: number;
  health_status: string | null;
  health_last_checked: string | null;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

function toServiceConnection(api: ApiServiceConnection): ServiceConnection {
  return {
    id: api.id,
    serviceType: api.service_type as ServiceType,
    displayName: api.display_name,
    url: api.url ?? undefined,
    status: api.status as ServiceConnection['status'],
    tags: api.tags ?? [],
    description: api.description ?? undefined,
    pinned: api.pinned ?? false,
    sortOrder: api.sort_order ?? 0,
    groupId: api.group_id ?? undefined,
    healthEnabled: api.health_enabled ?? false,
    healthInterval: api.health_interval ?? 300,
    healthStatus: (api.health_status as ServiceConnection['healthStatus']) ?? undefined,
    healthLastChecked: api.health_last_checked ?? undefined,
    metadata: api.metadata,
    isActive: api.is_active,
  };
}

export function useServiceConnections(serviceType?: ServiceType) {
  return useQuery({
    queryKey: ['service-connections', serviceType],
    queryFn: async () => {
      const res = await api.get<{ connections: ApiServiceConnection[] }>(
        '/api/service-connections',
      );
      if (!res.success) {
        throw new Error(res.error?.code ?? 'Failed to fetch connections');
      }
      const connections = (res.data?.connections ?? []).map(toServiceConnection);
      if (serviceType) {
        return connections.filter((c) => c.serviceType === serviceType);
      }
      return connections;
    },
  });
}

export function useCreateConnection() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: {
      service_type: ServiceType;
      display_name: string;
      token?: string;
      url?: string;
      tags?: string[];
      description?: string;
      pinned?: boolean;
      metadata?: Record<string, unknown>;
    }) => api.post('/api/service-connections', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['service-connections'] }),
  });
}

export function useUpdateConnection() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      display_name?: string;
      token?: string;
      url?: string | null;
      tags?: string[];
      description?: string | null;
      pinned?: boolean;
      sort_order?: number;
      group_id?: string | null;
      metadata?: Record<string, unknown>;
    }) => api.put(`/api/service-connections/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['service-connections'] }),
  });
}

export function useDeleteConnection() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/service-connections/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['service-connections'] }),
  });
}

export function useSetActiveConnection() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.post(`/api/service-connections/${id}/set-active`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['service-connections'] }),
  });
}

export function useHealthCheck() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.post(`/api/service-connections/${id}/health-check`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['service-connections'] }),
  });
}

export function useReorderServices() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (items: { id: string; sort_order: number }[]) =>
      api.post('/api/service-connections/reorder', { items }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['service-connections'] }),
  });
}

export function useServiceCredentials(connectionId: string) {
  return useQuery({
    queryKey: ['service-credentials', connectionId],
    queryFn: async () => {
      const res = await api.get<{ credentials: { id: string; key_name: string; created_at: string }[] }>(
        `/api/service-credentials/${connectionId}`,
      );
      if (!res.success) throw new Error(res.error?.code ?? 'Failed');
      return (res.data?.credentials ?? []).map((c) => ({
        id: c.id,
        keyName: c.key_name,
        createdAt: c.created_at,
      }));
    },
  });
}

export function useCreateCredential() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ connectionId, key_name, value }: { connectionId: string; key_name: string; value: string }) =>
      api.post(`/api/service-credentials/${connectionId}`, { key_name, value }),
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: ['service-credentials', vars.connectionId] }),
  });
}

export function useDeleteCredential() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ connectionId, credId }: { connectionId: string; credId: string }) =>
      api.delete(`/api/service-credentials/${connectionId}/${credId}`),
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: ['service-credentials', vars.connectionId] }),
  });
}

export function useExportServices() {
  return useMutation({
    mutationFn: () => api.post<{
      success: boolean;
      data: { version: number; exported_at: string; connections: unknown[]; groups: unknown[]; credentials: unknown[] };
    }>('/api/service-connections/export'),
  });
}
