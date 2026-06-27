import { Check } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { buildCallbackURL, validatePassword } from '@/features/auth/utils';
import { authClient } from '@/shared/api/client';
import { Alert } from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

interface Props {
  returnTo: string | null;
}

export function SignUpForm({ returnTo }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const passwordRules = [
    { label: t('sign_up.password_rule_length'), test: (pw: string) => pw.length >= 8 },
    {
      label: t('sign_up.password_rule_match'),
      test: (pw: string, confirm: string) => pw.length > 0 && pw === confirm,
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const pwError = validatePassword(password, confirm);
    if (pwError) {
      setError(t(pwError));
      return;
    }

    setLoading(true);

    try {
      const result = await authClient.signUp.email({
        name,
        email,
        password,
        callbackURL: buildCallbackURL(returnTo),
      });

      if (result.error) {
        setError(t('sign_up.create_failed'));
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
        <Label htmlFor="signup-name">{t('sign_up.name')}</Label>
        <Input
          id="signup-name"
          type="text"
          placeholder={t('sign_up.name_placeholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-email">{t('sign_up.email')}</Label>
        <Input
          id="signup-email"
          type="email"
          placeholder={t('sign_up.email_placeholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-password">{t('sign_up.password')}</Label>
        <Input
          id="signup-password"
          type="password"
          placeholder={t('sign_up.password_placeholder')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
        {password.length > 0 && (
          <ul className="space-y-1 pt-1">
            {passwordRules.map((rule) => {
              const passed = rule.test(password, confirm);
              return (
                <li
                  key={rule.label}
                  className={`flex items-center gap-1.5 text-xs transition-colors ${
                    passed ? 'text-emerald-600' : 'text-muted-foreground'
                  }`}
                >
                  <Check size={12} className={passed ? 'opacity-100' : 'opacity-30'} />
                  {rule.label}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-confirm">{t('sign_up.confirm_password')}</Label>
        <Input
          id="signup-confirm"
          type="password"
          placeholder={t('sign_up.confirm_placeholder')}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}

      <Button type="submit" disabled={loading} className="w-full h-11">
        {loading ? t('sign_up.creating') : t('sign_up.sign_up')}
      </Button>
    </form>
  );
}
