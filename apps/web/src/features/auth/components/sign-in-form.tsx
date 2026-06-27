import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { buildCallbackURL } from '@/features/auth/utils';
import { authClient } from '@/shared/api/client';
import { Alert } from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

interface Props {
  returnTo: string | null;
}

export function SignInForm({ returnTo }: Props) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await authClient.signIn.email({
        email,
        password,
        rememberMe,
        callbackURL: buildCallbackURL(returnTo),
      });
      if (result.error) {
        setError(t('sign_in.invalid'));
        setLoading(false);
      }
    } catch {
      setError(t('sign_in.network_error'));
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="signin-email">{t('sign_in.email')}</Label>
        <Input
          id="signin-email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="signin-password">{t('sign_in.password')}</Label>
          <Link
            to="/forgot-password"
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            {t('sign_in.forgot_password')}
          </Link>
        </div>
        <Input
          id="signin-password"
          type="password"
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="signin-remember"
          checked={rememberMe}
          onCheckedChange={(c) => setRememberMe(!!c)}
        />
        <Label htmlFor="signin-remember" className="text-sm font-normal text-muted-foreground">
          {t('sign_in.remember_me')}
        </Label>
      </div>
      {error && <Alert variant="destructive">{error}</Alert>}
      <Button type="submit" disabled={loading} className="w-full h-11">
        {loading ? t('sign_in.signing_in') : t('sign_in.sign_in')}
      </Button>
    </form>
  );
}
