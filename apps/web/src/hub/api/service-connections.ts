import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import type { ServiceConnection, ServiceType } from '@/hub/core/types';

interface ApiServiceConnection {
  id: string;
  service_type: string;
  display_name: string;
  url: string | null;
  status: string;
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
      token: string;
      url?: string;
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
