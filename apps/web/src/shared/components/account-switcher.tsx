import { AlertTriangle, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useServiceConnections, useSetActiveConnection } from '@/shared/api/service-connections';
import { eventBus } from '@/shared/core/event-bus';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';

const STATUS_STYLES: Record<string, string> = {
  active: 'text-primary',
  expired: 'text-yellow-500',
  revoked: 'text-destructive',
};

export function AccountSwitcher() {
  const { t } = useTranslation();
  const { data: connections = [], isLoading } = useServiceConnections('jira');
  const setActive = useSetActiveConnection();

  const active = connections.find((c) => c.isActive);
  const expiredCount = connections.filter(
    (c) => c.status === 'expired' || c.status === 'revoked',
  ).length;

  const handleSwitch = async (id: string) => {
    await setActive.mutateAsync(id);
    const conn = connections.find((c) => c.id === id);
    if (conn) {
      eventBus.emit('account:switched', {
        accountId: conn.id,
        jiraUrl: conn.url ?? '',
      });
    }
  };

  if (isLoading || connections.length === 0) {
    return null;
  }

  const activeEmail =
    active?.metadata && typeof active.metadata === 'object' && 'email' in active.metadata
      ? String(active.metadata.email)
      : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" disabled={setActive.isPending}>
          {active?.metadata &&
            typeof active.metadata === 'object' &&
            'avatarUrl' in active.metadata && (
              <img
                src={String(active.metadata.avatarUrl)}
                alt=""
                className="h-5 w-5 rounded-full"
              />
            )}
          <span className="max-w-[120px] truncate">
            {active ? activeEmail || active.displayName : t('jira.no_account')}
          </span>
          {expiredCount > 0 && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
          <ChevronDown size={14} className="opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        {connections.map((conn) => {
          const connEmail =
            conn.metadata && typeof conn.metadata === 'object' && 'email' in conn.metadata
              ? String(conn.metadata.email)
              : null;
          return (
            <DropdownMenuItem
              key={conn.id}
              onClick={() => handleSwitch(conn.id)}
              disabled={conn.isActive || setActive.isPending}
              className="gap-3"
            >
              {conn.metadata && typeof conn.metadata === 'object' && 'avatarUrl' in conn.metadata && (
                <img src={String(conn.metadata.avatarUrl)} alt="" className="h-8 w-8 rounded-full" />
              )}
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium truncate">{connEmail || conn.displayName}</p>
                <p className="text-xs text-muted-foreground truncate">{conn.url}</p>
              </div>
              <span
                className={`text-xs font-medium ${STATUS_STYLES[conn.status] ?? 'text-muted-foreground'}`}
              >
                {conn.isActive ? t('jira.active') : t(`jira.${conn.status}`)}
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
