import { createFileRoute } from '@tanstack/react-router';
import { DashboardPage } from '@/features/hub/dashboard';

export const Route = createFileRoute('/_authed/hub')({
  component: DashboardPage,
});
