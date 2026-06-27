import { Link } from '@tanstack/react-router';
import { CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { authClient } from '@/shared/api/client';
import { Logo } from '@/shared/components/logo';
import { ThemeToggle } from '@/shared/components/theme-toggle';
import { Alert } from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (result.error) setError(t('forgot.failed'));
    else setSent(true);
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
          <h1 className="text-heading-md font-semibold tracking-tight">{t('forgot.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('forgot.desc')}</p>
        </div>
        {sent ? (
          <div className="space-y-6">
            <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-950">
              <CheckCircle2
                size={20}
                className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"
              />
              <div className="text-sm">
                <p className="font-medium text-emerald-800 dark:text-emerald-200">
                  {t('forgot.check_email')}
                </p>
                <p className="text-emerald-700 dark:text-emerald-300">
                  If an account exists for <strong>{email}</strong>, a password reset link has been
                  sent.
                </p>
              </div>
            </div>
            <Link to="/login" className="block text-center text-sm text-primary hover:underline">
              {t('forgot.back')}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="reset-email">{t('forgot.email')}</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {error && <Alert variant="destructive">{error}</Alert>}
            <Button type="submit" disabled={loading} className="w-full h-11">
              {loading ? t('forgot.sending') : t('forgot.send')}
            </Button>
            <Link
              to="/login"
              className="block text-center text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {t('forgot.back')}
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
