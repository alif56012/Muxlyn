import { useNavigate } from '@tanstack/react-router';
import { type ReactNode, useEffect, useRef } from 'react';
import { authClient } from '@/shared/api/client';
import { FullPageSpinner } from '@/shared/components/full-page-spinner';

interface Props {
  children: ReactNode;
}

export function AuthGuard({ children }: Props) {
  const { data: session, isPending } = authClient.useSession();
  const navigate = useNavigate();
  const dispatchedRef = useRef(false);

  useEffect(() => {
    if (!isPending && !session && !dispatchedRef.current) {
      dispatchedRef.current = true;
      window.dispatchEvent(new CustomEvent('session:expired', { detail: { message: '' } }));
    }
  }, [session, isPending]);

  if (isPending) return <FullPageSpinner />;

  if (!session) {
    const returnTo = encodeURIComponent(window.location.pathname);
    navigate({ to: `/login?return_to=${returnTo}`, replace: true });
    return null;
  }

  return <>{children}</>;
}
