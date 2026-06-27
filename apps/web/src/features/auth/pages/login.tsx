import { useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SignInForm } from '@/features/auth/components/sign-in-form';
import { SignUpForm } from '@/features/auth/components/sign-up-form';
import { buildCallbackURL } from '@/features/auth/utils';
import { authClient } from '@/shared/api/client';
import { Logo } from '@/shared/components/logo';
import { ThemeToggle } from '@/shared/components/theme-toggle';
import { Alert } from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';

type EmailMode = 'signin' | 'signup';

function useQueryParam(key: string): string | null {
  const [search] = useState(() => new URLSearchParams(window.location.search));
  return search.get(key);
}

const GoogleIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24">
    <path
      fill="currentColor"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
    />
    <path
      fill="currentColor"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="currentColor"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="currentColor"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const returnTo = useQueryParam('return_to');
  const oauthError = useQueryParam('error');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailMode, setEmailMode] = useState<EmailMode>('signin');
  const { data: session } = authClient.useSession();

  useEffect(() => {
    if (session) navigate({ to: returnTo || '/hub', replace: true });
  }, [session, navigate, returnTo]);

  useEffect(() => {
    if (oauthError === 'access_denied') setError(t('login.not_authorised'));
    else if (oauthError === 'cancelled') setError(t('login.cancelled'));
    else if (oauthError === 'ip_changed') setError(t('login.ip_changed'));
  }, [oauthError, t]);

  const handleGoogleLogin = useCallback(async () => {
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
  }, [returnTo, t]);

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-sky-500 via-sky-600 to-blue-700 p-10 text-white lg:flex">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE4YzAtNi42MjctNS4zNzMtMTItMTItMTJzLTEyIDUuMzczLTEyIDEyIDUuMzczIDEyIDEyIDEyIDEyLTUuMzczIDEyLTEyek0yNCA2QzE3LjM3MyA2IDEyIDExLjM3MyAxMiAxOHM1LjM3MyAxMiAxMiAxMiAxMi01LjM3MyAxMi0xMlMzMC42MjcgNiAyNCA2eiIvPjwvZz48L2c+PC9zdmc+')] opacity-20" />
        <div className="relative z-10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 160 32"
            fill="none"
            className="h-8 w-auto"
          >
            <polygon
              points="0,24 0,2 7,13 10,2 10,13 17,24 17,14 10,6 7,14 5,8 5,24"
              fill="white"
            />
            <text
              x="26"
              y="24"
              fontFamily="Inter, ui-sans-serif, system-ui, -apple-system, sans-serif"
              fontWeight="700"
              fontSize="20"
              letterSpacing="-0.02em"
              fill="white"
            >
              Muxlyn
            </text>
          </svg>
        </div>
        <div className="relative z-10 space-y-4">
          <h2 className="text-4xl font-bold leading-tight tracking-tight">
            Built by devs who also have
            <br />
            47 Jira tabs open right now.
          </h2>
        </div>
        <div className="relative z-10 text-sm text-sky-200">
          @ {new Date().getFullYear()} Muxlyn. It&rsquo;s not really copyrighted or anything but you
          know.
        </div>
      </div>
      <div className="flex items-center justify-center px-6 py-12 relative">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-[400px] space-y-7">
          <Logo className="h-6 w-auto lg:hidden" />
          <div className="space-y-2">
            <h1 className="text-heading-md font-semibold tracking-tight">
              {emailMode === 'signup' ? t('login.create_account') : t('login.welcome')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {emailMode === 'signup' ? t('login.sign_up_desc') : t('login.sign_in_desc')}
            </p>
          </div>
          {error && <Alert variant="destructive">{error}</Alert>}
          <Button
            onClick={handleGoogleLogin}
            disabled={loading}
            variant="outline"
            className="w-full h-11 gap-3"
          >
            <GoogleIcon />
            {loading ? t('login.google_redirecting') : t('login.google')}
          </Button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                {t('login.email_divider')}
              </span>
            </div>
          </div>
          {emailMode === 'signin' ? (
            <SignInForm returnTo={returnTo} />
          ) : (
            <SignUpForm returnTo={returnTo} />
          )}
          <p className="text-center text-sm text-muted-foreground">
            {emailMode === 'signin' ? (
              <>
                {t('login.no_account')}{' '}
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => {
                    setEmailMode('signup');
                    setError(null);
                  }}
                  className="h-auto p-0 text-sm"
                >
                  {t('login.sign_up')}
                </Button>
              </>
            ) : (
              <>
                {t('login.has_account')}{' '}
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => {
                    setEmailMode('signin');
                    setError(null);
                  }}
                  className="h-auto p-0 text-sm"
                >
                  {t('login.sign_in')}
                </Button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
