import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSwitchConnection } from '@/features/hub/hooks/use-connection-mutations';
import type { JiraConnection } from '@/features/hub/types';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';

interface Props {
  connections: JiraConnection[];
}

export function AccountSwitcher({ connections }: Props) {
  const { t } = useTranslation();
  const switchMutation = useSwitchConnection();
  const active = connections.find((c) => c.is_active);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2" disabled={switchMutation.isPending}>
          {active?.avatar_url && (
            <img src={active.avatar_url} alt="" className="h-5 w-5 rounded-full" />
          )}
          <span>{active ? active.email || active.display_name : t('jira.no_account')}</span>
          <ChevronDown size={14} className="opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {connections.map((conn) => (
          <DropdownMenuItem
            key={conn.id}
            onClick={() => switchMutation.mutate(conn.id)}
            disabled={conn.is_active || switchMutation.isPending}
            className="gap-2"
          >
            {conn.avatar_url && (
              <img src={conn.avatar_url} alt="" className="h-5 w-5 rounded-full" />
            )}
            <div className="text-left">
              <p className="font-medium text-sm">{conn.email || conn.display_name}</p>
              <p className="text-xs text-muted-foreground">{conn.jira_url}</p>
            </div>
            {conn.is_active && (
              <span className="ml-auto text-xs text-primary font-medium">{t('jira.active')}</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
