import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useConnectJira } from '@/features/hub/hooks/use-connection-mutations';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

export function ConnectForm() {
  const { t } = useTranslation();
  const connectMutation = useConnectJira();
  const [jiraUrl, setJiraUrl] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const url = jiraUrl.trim().replace(/\/$/, '');
    if (!/^https?:\/\/.+\.atlassian\.net/.test(url)) {
      setError(t('jira.invalid_url'));
      return;
    }

    connectMutation.mutate(
      { jira_url: url, api_token: apiToken },
      {
        onSuccess: (res: { success: boolean; error?: { code: string } }) => {
          if (!res.success) {
            setError(res.error?.code ?? t('jira.connect_failed'));
            return;
          }
          setJiraUrl('');
          setApiToken('');
        },
        onError: () => setError(t('jira.network_error')),
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-4">
      <h3 className="font-semibold text-sm">{t('jira.connect_title')}</h3>
      <div className="space-y-2">
        <Label htmlFor="jira-url">{t('jira.jira_url')}</Label>
        <Input
          id="jira-url"
          type="url"
          placeholder={t('jira.url_placeholder')}
          value={jiraUrl}
          onChange={(e) => setJiraUrl(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="api-token">{t('jira.api_token')}</Label>
        <Input
          id="api-token"
          type="password"
          placeholder={t('jira.token_placeholder')}
          value={apiToken}
          onChange={(e) => setApiToken(e.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">
          {t('jira.token_hint')}{' '}
          <a
            href="https://id.atlassian.com/manage-profile/security/api-tokens"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {t('jira.token_link')}
          </a>
        </p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={connectMutation.isPending} className="w-full">
        {connectMutation.isPending ? t('jira.connecting') : t('jira.connect')}
      </Button>
    </form>
  );
}
