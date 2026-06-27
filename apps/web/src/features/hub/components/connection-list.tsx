import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useDisconnectConnection,
  useSwitchConnection,
  useUpdateToken,
} from '@/features/hub/hooks/use-connection-mutations';
import type { JiraConnection } from '@/features/hub/types';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/modal';

interface Props {
  connections: JiraConnection[];
}

const STATUS_LABEL_KEYS: Record<string, string> = {
  connected: 'jira.connected',
  token_expired: 'jira.token_expired',
  token_revoked: 'jira.token_revoked',
};
const STATUS_COLORS: Record<string, string> = {
  connected: 'text-emerald-600 dark:text-emerald-400',
  token_expired: 'text-amber-600 dark:text-amber-400',
  token_revoked: 'text-rose-600 dark:text-rose-400',
};

export function ConnectionList({ connections }: Props) {
  const { t } = useTranslation();
  const switchMutation = useSwitchConnection();
  const updateMutation = useUpdateToken();
  const disconnectMutation = useDisconnectConnection();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [newToken, setNewToken] = useState('');
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);

  const isPending =
    switchMutation.isPending || updateMutation.isPending || disconnectMutation.isPending;

  return (
    <div className="space-y-3">
      {connections.map((conn) => (
        <Card key={conn.id} className={conn.is_active ? 'border-primary' : ''}>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              {conn.avatar_url && (
                <img src={conn.avatar_url} alt="" className="h-8 w-8 rounded-full" />
              )}
              <div>
                <p className="font-medium">{conn.email || conn.display_name}</p>
                <p className="text-sm text-muted-foreground">{conn.display_name !== conn.email ? conn.display_name : ''}</p>
                <p className="text-xs text-muted-foreground">{conn.jira_url}</p>
                <span className={`text-xs font-medium ${STATUS_COLORS[conn.status] ?? ''}`}>
                  {t(STATUS_LABEL_KEYS[conn.status] ?? conn.status)}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              {conn.is_active ? (
                <span className="text-xs font-medium text-primary">{t('jira.active')}</span>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => switchMutation.mutate(conn.id)}
                  disabled={isPending}
                >
                  {t('jira.switch')}
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setNewToken('');
                  setUpdatingId(conn.id);
                }}
                disabled={isPending}
              >
                {t('jira.update_token')}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setDisconnectingId(conn.id)}
                disabled={isPending}
              >
                {t('jira.disconnect')}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!updatingId} onOpenChange={(o) => !o && setUpdatingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('jira.update_token_title')}</DialogTitle>
            <DialogDescription>{t('jira.update_token_desc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="new-token">{t('jira.api_token')}</Label>
            <Input
              id="new-token"
              type="password"
              placeholder={t('jira.token_placeholder')}
              value={newToken}
              onChange={(e) => setNewToken(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdatingId(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => {
                updateMutation.mutate({ id: updatingId!, api_token: newToken });
                setUpdatingId(null);
              }}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? t('common.loading') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!disconnectingId} onOpenChange={(o) => !o && setDisconnectingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('jira.disconnect_title')}</DialogTitle>
            <DialogDescription>{t('jira.disconnect_desc')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisconnectingId(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                disconnectMutation.mutate(disconnectingId!);
                setDisconnectingId(null);
              }}
              disabled={disconnectMutation.isPending}
            >
              {disconnectMutation.isPending ? t('common.loading') : t('jira.disconnect')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
