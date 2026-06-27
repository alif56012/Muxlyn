import { Link2, MoreHorizontal, Plug, RefreshCw, Trash2 } from 'lucide-react';
import { Suspense, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useCreateConnection,
  useDeleteConnection,
  useServiceConnections,
  useSetActiveConnection,
  useUpdateConnection,
} from '@/shared/api/service-connections';
import { registry } from '@/shared/core/plugin-registry';
import { authClient } from '@/shared/api/client';
import { LanguageSwitcher } from '@/shared/components/language-switcher';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/modal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';

function ConnectDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const createMutation = useCreateConnection();
  const [url, setUrl] = useState('');
  const [workEmail, setWorkEmail] = useState('');
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
        display_name: workEmail.trim() || new URL(cleanUrl).hostname,
        token: token.trim(),
        url: cleanUrl,
      });
      setUrl('');
      setWorkEmail('');
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
          <DialogDescription>{t('jira.connect_desc', 'Enter your Jira instance URL and an Atlassian API token.')}</DialogDescription>
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
            <Label htmlFor="jira-name">{t('jira.work_email', 'Work email')}</Label>
            <Input
              id="jira-name"
              placeholder={t('jira.email_placeholder', 'you@company.com')}
              value={workEmail}
              onChange={(e) => setWorkEmail(e.target.value)}
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

function UpdateTokenDialog({
  open,
  onOpenChange,
  connectionId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionId: string;
}) {
  const { t } = useTranslation();
  const updateMutation = useUpdateConnection();
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (!token.trim()) {
      setError(t('jira.invalid_token'));
      return;
    }
    try {
      await updateMutation.mutateAsync({ id: connectionId, token: token.trim() });
      setToken('');
      onOpenChange(false);
    } catch {
      setError(t('jira.token_update_failed'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('jira.update_token_title')}</DialogTitle>
          <DialogDescription>{t('jira.update_token_desc')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="update-token">{t('jira.api_token')}</Label>
            <Input
              id="update-token"
              type="password"
              placeholder={t('jira.token_placeholder')}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              error={error ? error : undefined}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{t('common.cancel')}</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? t('common.loading') : t('jira.update_token')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DisconnectDialog({
  open,
  onOpenChange,
  connectionId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionId: string;
}) {
  const { t } = useTranslation();
  const deleteMutation = useDeleteConnection();

  const handleDisconnect = async () => {
    try {
      await deleteMutation.mutateAsync(connectionId);
      onOpenChange(false);
    } catch {
      /* toast handled by query hooks */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('jira.disconnect_title')}</DialogTitle>
          <DialogDescription>{t('jira.disconnect_desc')}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{t('common.cancel')}</Button>
          </DialogClose>
          <Button variant="destructive" onClick={handleDisconnect} disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? t('common.loading') : t('jira.disconnect')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SettingsPage() {
  const { t } = useTranslation();
  const defaultTab = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    return tab === 'connections' || tab === 'language' ? tab : 'account';
  }, []);

  const { data: session } = authClient.useSession();
  const { data: connections = [], isLoading: connectionsLoading } = useServiceConnections('jira');
  const setActive = useSetActiveConnection();
  const pluginSections = registry.getSettings();

  const [connectOpen, setConnectOpen] = useState(false);
  const [updateTokenId, setUpdateTokenId] = useState<string | null>(null);
  const [disconnectId, setDisconnectId] = useState<string | null>(null);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{t('nav.settings')}</h1>

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="account">{t('settings.account')}</TabsTrigger>
          <TabsTrigger value="connections">{t('settings.connections')}</TabsTrigger>
          <TabsTrigger value="language">{t('settings.language')}</TabsTrigger>
          {pluginSections.map((section) => (
            <TabsTrigger key={section.id} value={section.id}>
              {t(section.label)}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.google_account')}</CardTitle>
              <CardDescription>{t('settings.google_account_desc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {session?.user ? (
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-muted-foreground">{t('hub.name')}</span>{' '}
                    {session.user.name}
                  </p>
                  <p>
                    <span className="text-muted-foreground">{t('hub.email')}</span>{' '}
                    {session.user.email}
                  </p>
                </div>
              ) : (
                <Skeleton className="h-12 w-full" />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="connections" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t('settings.jira_connections')}</CardTitle>
                <CardDescription>
                  {connectionsLoading
                    ? t('hub.jira_loading')
                    : connections.length === 0
                      ? t('hub.jira_empty')
                      : t('hub.jira_count_other', { count: connections.length })}
                </CardDescription>
              </div>
              <Button size="sm" className="gap-1.5" onClick={() => setConnectOpen(true)}>
                <Plug className="h-4 w-4" />
                {t('jira.connect')}
              </Button>
            </CardHeader>
            <CardContent>
              {connectionsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : connections.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <Link2 className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {t('jira.empty_cta', 'Connect your first Jira account to get started.')}
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setConnectOpen(true)}>
                    {t('jira.connect')}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {connections.map((conn) => (
                    <div
                      key={conn.id}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{conn.displayName}</p>
                        <p className="text-xs text-muted-foreground truncate">{conn.url}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        {!conn.isActive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={() => setActive.mutate(conn.id)}
                            disabled={setActive.isPending}
                          >
                            {t('jira.switch')}
                          </Button>
                        )}
                        {conn.isActive && (
                          <span className="text-xs font-medium text-primary">
                            {t('jira.active')}
                          </span>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setUpdateTokenId(conn.id)}
                              className="gap-2"
                            >
                              <RefreshCw className="h-4 w-4" />
                              {t('jira.update_token')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDisconnectId(conn.id)}
                              className="gap-2 text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                              {t('jira.disconnect')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="language" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.language')}</CardTitle>
              <CardDescription>{t('settings.language_desc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <LanguageSwitcher />
            </CardContent>
          </Card>
        </TabsContent>

        {pluginSections.map((section) => (
          <TabsContent key={section.id} value={section.id}>
            <Suspense fallback={<Skeleton className="h-48 w-full" />}>
              <section.component />
            </Suspense>
          </TabsContent>
        ))}
      </Tabs>

      <ConnectDialog open={connectOpen} onOpenChange={setConnectOpen} />
      {updateTokenId && (
        <UpdateTokenDialog
          open={!!updateTokenId}
          onOpenChange={(open) => {
            if (!open) setUpdateTokenId(null);
          }}
          connectionId={updateTokenId}
        />
      )}
      {disconnectId && (
        <DisconnectDialog
          open={!!disconnectId}
          onOpenChange={(open) => {
            if (!open) setDisconnectId(null);
          }}
          connectionId={disconnectId}
        />
      )}
    </div>
  );
}
