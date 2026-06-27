import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import type { SessionValue } from '@/shared/auth/session';

interface RouterContext {
  session: SessionValue;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
});
