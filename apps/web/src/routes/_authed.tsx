import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { AppLayout } from '@/shared/layout/app-layout';
import { authClient } from '@/shared/api/client';

function AuthedLayout() {
  const { data: session, isPending } = authClient.useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isPending && !session) {
      const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.replace(`/login?return_to=${returnTo}`);
    }
  }, [session, isPending, navigate]);

  if (isPending) return null;
  if (!session) return null;

  return <AppLayout />;
}

export const Route = createFileRoute('/_authed')({
  component: AuthedLayout,
});
