import type { DashboardSummary } from '@/hub/core/types';

export function useJiraSummary(): DashboardSummary {
  return { status: 'connected', stats: 'Today: --h logged' };
}
