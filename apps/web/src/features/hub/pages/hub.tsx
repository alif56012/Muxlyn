import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { api, authClient } from '@/shared/api/client';
import { AccountSwitcher } from '@/features/hub/components/account-switcher';
import { ConnectForm } from '@/features/hub/components/connect-form';
import { ConnectionList } from '@/features/hub/components/connection-list';
import { useConnections } from '@/features/hub/hooks/use-connections';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/modal';
import { Skeleton } from '@/shared/components/ui/skeleton';

export function HubPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const { data: connections = [], isLoading } = useConnections();
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const h = () => navigate({ to: '/login', search: { error: 'ip_changed' }, replace: true });
    window.addEventListener('session:ipChanged', h);
    return () => window.removeEventListener('session:ipChanged', h);
  }, [navigate]);

  if (sessionLoading) return null;
  if (!session) return null;

  const handleSignOut = async () => {
    setSigningOut(true);
    try { await authClient.signOut(); } catch { /* redirect anyway */ }
    window.location.href = '/login';
  };

  const handleRevokeAll = async () => {
    setShowRevokeConfirm(false);
    try {
      await api.post('/api/auth/revoke-sessions');
    } catch {
      try { await authClient.signOut(); } catch { /* fall through */ }
    }
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('hub.title')}</h1>
          <div className="flex items-center gap-2">
            {connections.length > 0 && <AccountSwitcher connections={connections} />}
            <Button variant="outline" onClick={handleSignOut} disabled={signingOut}>{signingOut ? t('hub.signing_out') : t('hub.sign_out')}</Button>
            <Button variant="destructive" onClick={() => setShowRevokeConfirm(true)}>{t('hub.logout_all')}</Button>
          </div>
        </div>
        <Card>
          <CardHeader><CardTitle>{t('hub.account')}</CardTitle><CardDescription>{t('hub.signed_in_google')}</CardDescription></CardHeader>
          <CardContent><div className="space-y-2 text-sm"><p><span className="text-muted-foreground">{t('hub.name')}</span> {session.user.name}</p><p><span className="text-muted-foreground">{t('hub.email')}</span> {session.user.email}</p></div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t('hub.jira')}</CardTitle><CardDescription>{isLoading ? t('hub.jira_loading') : connections.length === 0 ? t('hub.jira_empty') : t('hub.jira_count_other', { count: connections.length })}</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? <div className="space-y-3"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div> : <><>{connections.length > 0 && <ConnectionList connections={connections} />}</><ConnectForm /></>}
          </CardContent>
        </Card>
      </div>
      <Dialog open={showRevokeConfirm} onOpenChange={setShowRevokeConfirm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('hub.revoke_title')}</DialogTitle><DialogDescription>{t('hub.revoke_desc')}</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevokeConfirm(false)}>{t('common.cancel')}</Button>
            <Button variant="destructive" onClick={handleRevokeAll}>{t('hub.logout_all')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
