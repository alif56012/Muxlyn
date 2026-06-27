import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { CalendarIcon } from 'lucide-react';
import type { DashboardCardProps } from '@/hub/core/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';

export default function JiraDashboardCard({ connection, summary }: DashboardCardProps) {
  const { t } = useTranslation();

  const isConnected = connection?.status === 'active';

  return (
    <Link to="/jira" className="block transition-colors hover:no-underline">
      <Card className="hover:border-primary/50 cursor-pointer h-full">
        <CardHeader className="flex flex-row items-center gap-3">
          <CalendarIcon className="h-8 w-8 text-primary" />
          <div>
            <CardTitle>{t('nav.jiraManagement')}</CardTitle>
            <CardDescription>
              {isConnected
                ? summary?.stats ?? t('dashboard.connected')
                : t('dashboard.not_connected')}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm">
            <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-muted-foreground'}`} />
            <span className="text-muted-foreground">
              {isConnected ? t('jira.connected') : t('jira.no_account')}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
