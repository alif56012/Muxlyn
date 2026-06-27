import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCreateConnection } from '@/shared/api/service-connections';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/modal';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

export function JiraConnectDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const createMutation = useCreateConnection();
  const [url, setUrl] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    const cleanUrl = url.trim().replace(/\/+$/, '');
    if (!cleanUrl || !cleanUrl.startsWith('https://')) {
      setError(t('jira.invalid_url'));
      return;
    }
    if (!token.trim()) {
      setError(t('jira.invalid_token'));
      return;
    }
    try {
      await createMutation.mutateAsync({
        service_type: 'jira',
        display_name: displayName.trim() || new URL(cleanUrl).hostname,
        token: token.trim(),
        url: cleanUrl,
      });
      setUrl('');
      setDisplayName('');
      setToken('');
      onOpenChange(false);
    } catch {
      setError(t('jira.connect_failed'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('jira.connect_title')}</DialogTitle>
          <DialogDescription>
            {t('jira.connect_desc')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="jira-url">{t('jira.jira_url')}</Label>
            <Input
              id="jira-url"
              placeholder={t('jira.url_placeholder')}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              error={error?.includes('URL') ? error : undefined}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="jira-name">{t('jira.display_name')}</Label>
            <Input
              id="jira-name"
              placeholder={t('jira.name_placeholder')}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="jira-token">{t('jira.api_token')}</Label>
            <Input
              id="jira-token"
              type="password"
              placeholder={t('jira.token_placeholder')}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              error={error?.includes('token') ? error : undefined}
            />
            <p className="text-xs text-muted-foreground">
              {t('jira.token_hint')}{' '}
              <a
                href="https://id.atlassian.com/manage-profile/security/api-tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                {t('jira.token_link')}
              </a>
            </p>
          </div>
          {error && !error.includes('URL') && !error.includes('token') && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{t('common.cancel')}</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? t('jira.connecting') : t('jira.connect')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
