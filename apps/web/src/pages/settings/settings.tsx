import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { authClient } from '@/shared/api/client';
import { registry } from '@/hub/core/plugin-registry';
import { LanguageSwitcher } from '@/shared/components/language-switcher';
import { useServiceConnections } from '@/hub/api/service-connections';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';

export function SettingsPage() {
  const { t } = useTranslation();
  const { data: session } = authClient.useSession();
  const { data: connections = [], isLoading: connectionsLoading } = useServiceConnections('jira');
  const pluginSections = registry.getSettings();

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{t('nav.settings')}</h1>

      <Tabs defaultValue="account" className="space-y-6">
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
                    <span className="text-muted-foreground">{t('hub.name')}</span> {session.user.name}
                  </p>
                  <p>
                    <span className="text-muted-foreground">{t('hub.email')}</span> {session.user.email}
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
            <CardHeader>
              <CardTitle>{t('settings.jira_connections')}</CardTitle>
              <CardDescription>
                {connectionsLoading
                  ? t('hub.jira_loading')
                  : connections.length === 0
                    ? t('hub.jira_empty')
                    : t('hub.jira_count_other', { count: connections.length })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {connectionsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <div className="space-y-2">
                  {connections.map((conn) => (
                    <div key={conn.id} className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <p className="text-sm font-medium">{conn.displayName}</p>
                        <p className="text-xs text-muted-foreground">{conn.url}</p>
                      </div>
                      <span className={`text-xs ${conn.isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                        {conn.isActive ? t('jira.active') : t(`jira.${conn.status}`)}
                      </span>
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
    </div>
  );
}
