import { Link } from '@tanstack/react-router';
import { Check, CheckCircle2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { validatePassword } from '@/features/auth/utils';
import { authClient } from '@/shared/api/client';
import { Logo } from '@/shared/components/logo';
import { ThemeToggle } from '@/shared/components/theme-toggle';
import { Alert } from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const search = useMemo(() => new URLSearchParams(window.location.search), []);
  const token = search.get('token') || '';
  const tokenError = search.get('error');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(
    tokenError === 'INVALID_TOKEN' ? t('reset.invalid_token') : null,
  );
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const pwError = validatePassword(password, confirm);
    if (pwError) {
      setError(t(pwError));
      return;
    }
    setLoading(true);
    const result = await authClient.resetPassword({ newPassword: password, token });
    if (result.error) setError(result.error.message || t('forgot.failed'));
    else setDone(true);
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-[400px] space-y-8">
        <Logo className="h-6 w-auto" />
        <div className="space-y-2">
          <h1 className="text-heading-md font-semibold tracking-tight">{t('reset.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('reset.desc')}</p>
        </div>
        {!token && !tokenError ? (
          <Alert variant="destructive">{t('reset.missing_token')}</Alert>
        ) : done ? (
          <div className="space-y-6">
            <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-950">
              <CheckCircle2
                size={20}
                className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"
              />
              <div className="text-sm">
                <p className="font-medium text-emerald-800 dark:text-emerald-200">
                  {t('reset.success_title')}
                </p>
                <p className="text-emerald-700 dark:text-emerald-300">{t('reset.success_desc')}</p>
              </div>
            </div>
            <Link to="/login" className="block text-center text-sm text-primary hover:underline">
              {t('reset.sign_in')}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="new-password">{t('reset.new_password')}</Label>
              <Input
                id="new-password"
                type="password"
                placeholder={t('sign_up.password_placeholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
              {password.length > 0 && (
                <ul className="space-y-1 pt-1">
                  <li
                    className={`flex items-center gap-1.5 text-xs transition-colors ${password.length >= 8 ? 'text-emerald-600' : 'text-muted-foreground'}`}
                  >
                    <Check
                      size={12}
                      className={password.length >= 8 ? 'opacity-100' : 'opacity-30'}
                    />
                    {t('reset.rule_length')}
                  </li>
                </ul>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">{t('reset.confirm_password')}</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder={t('reset.confirm_placeholder')}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
            {error && <Alert variant="destructive">{error}</Alert>}
            <Button type="submit" disabled={loading} className="w-full h-11">
              {loading ? t('reset.resetting') : t('reset.reset')}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
