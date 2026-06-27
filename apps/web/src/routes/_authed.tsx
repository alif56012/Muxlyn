import { createFileRoute, redirect } from '@tanstack/react-router';
import { AppLayout } from '@/hub/shell/app-layout';

export const Route = createFileRoute('/_authed')({
  beforeLoad: ({ context }) => {
    if (!context.session) {
      throw redirect({ to: '/login' });
    }
  },
  component: AppLayout,
});
