import type { DashboardSummary } from '@/shared/core/types';

export function useJiraSummary(): DashboardSummary {
  return { status: 'connected', stats: 'Today: --h logged' };
}
