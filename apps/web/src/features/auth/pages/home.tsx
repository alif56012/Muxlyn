import { useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { authClient } from '@/shared/api/client';
import { FullPageSpinner } from '@/shared/components/full-page-spinner';

export function HomePage() {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (isPending) return;
    const search = new URLSearchParams(window.location.search);
    const returnTo = search.get('return_to');
    if (session) {
      navigate({ to: returnTo || '/hub', replace: true });
    } else {
      navigate({ to: '/login', replace: true });
    }
  }, [session, isPending, navigate]);

  return <FullPageSpinner />;
}
