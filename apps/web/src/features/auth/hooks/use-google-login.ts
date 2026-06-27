import type { Dispatch, SetStateAction } from 'react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { buildCallbackURL } from '@/features/auth/utils';
import { authClient } from '@/shared/api/client';

export function useGoogleLogin(
  returnTo: string | null,
  setLoading: Dispatch<SetStateAction<boolean>>,
  setError: Dispatch<SetStateAction<string | null>>,
) {
  const { t } = useTranslation();

  return useCallback(async () => {
    setLoading(true);
    setError(null);

    const timeout = setTimeout(() => {
      setLoading(false);
      setError(t('login.google_timeout'));
    }, 10000);

    try {
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: buildCallbackURL(returnTo),
      });
    } catch {
      clearTimeout(timeout);
      setLoading(false);
      setError(t('login.google_error'));
    }
  }, [returnTo, setLoading, setError, t]);
}
