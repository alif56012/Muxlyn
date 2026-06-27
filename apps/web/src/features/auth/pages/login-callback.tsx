import { useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo } from 'react';
import { authClient } from '@/shared/api/client';
import { FullPageSpinner } from '@/shared/components/full-page-spinner';

export function LoginCallbackPage() {
  const navigate = useNavigate();
  const search = useMemo(() => new URLSearchParams(window.location.search), []);
  const returnTo = search.get('return_to');
  const oauthError = search.get('error');
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (isPending) return;

    if (oauthError) {
      navigate({ to: '/login', search: { error: oauthError }, replace: true });
      return;
    }

    if (!session) {
      navigate({ to: '/', replace: true });
      return;
    }

    const safeReturnTo = returnTo && /^\/[^\s]*$/.test(returnTo) ? returnTo : null;
    navigate({ to: safeReturnTo || '/hub', replace: true });
  }, [session, isPending, navigate, returnTo, oauthError]);

  return <FullPageSpinner />;
}
