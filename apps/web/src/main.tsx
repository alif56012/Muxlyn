import { QueryClientProvider } from '@tanstack/react-query';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { routeTree } from './routeTree.gen';
import { authClient } from './shared/api/client';
import { queryClient } from './shared/api/query-client';
import { ErrorBoundary } from './shared/components/error-boundary';
import { SessionExpiredModal } from './shared/components/session-expired-modal';
import { ToastProvider } from './shared/components/toast';
import './plugins';
import './shared/i18n';
import './styles/globals.css';

import type { SessionValue } from '@/shared/auth/session';

const router = createRouter({
  routeTree,
  context: { session: null },
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

function InnerApp() {
  const { data: session } = authClient.useSession();

  return <RouterProvider router={router} context={{ session }} />;
}

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ToastProvider />
          <SessionExpiredModal />
          <InnerApp />
        </QueryClientProvider>
      </ErrorBoundary>
    </React.StrictMode>,
  );
}
