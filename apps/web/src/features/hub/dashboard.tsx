import { Link } from '@tanstack/react-router';
import { ChevronDown, ChevronRight, Download, Plus, Settings2, X } from 'lucide-react';
import { Suspense, useMemo, useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useServiceConnections, useExportServices } from '@/shared/api/service-connections';
import { useServiceGroups, useUpdateGroup } from '@/shared/api/service-groups';
import type { PluginManifest, ServiceConnection } from '@/shared/core/types';
import { registry } from '@/shared/core/plugin-registry';
import { AddServiceDialog } from '@/features/hub/add-service-dialog';
import { GroupManagementPanel } from '@/features/hub/group-management-panel';
import { ExternalServiceCard } from '@/features/hub/external-service-card';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { PluginErrorBoundary } from '@/shared/layout/plugin-error-boundary';
import { cn } from '@/shared/lib/utils';

function findActiveConnection(
  connections: ServiceConnection[],
  plugin: PluginManifest,
): ServiceConnection | null {
  for (const required of plugin.requiredConnections) {
    const match = connections.find((c) => c.serviceType === required && c.isActive);
    if (match) return match;
  }
  return null;
}

export function DashboardPage() {
  const { t } = useTranslation();
  const [addOpen, setAddOpen] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [manageGroupsOpen, setManageGroupsOpen] = useState(false);

  const cards = registry.getDashboardCards();
  const plugins = registry.getAll();
  const { data: allConnections = [], isLoading: connectionsLoading } = useServiceConnections();
  const { data: groups = [] } = useServiceGroups();
  const updateGroup = useUpdateGroup();
  const exportMutation = useExportServices();

  const prevHealth = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    const activeIds = new Set(allConnections.map((c) => c.id));
    for (const id of prevHealth.current.keys()) {
      if (!activeIds.has(id)) prevHealth.current.delete(id);
    }
    for (const c of allConnections) {
      const prev = prevHealth.current.get(c.id);
      if (prev && c.healthStatus && prev !== c.healthStatus && c.healthStatus === 'down') {
        window.dispatchEvent(
          new CustomEvent('toast:show', {
            detail: { message: `${c.displayName} is down`, variant: 'error' as const },
          }),
        );
      }
      if (c.healthStatus) prevHealth.current.set(c.id, c.healthStatus);
    }
  }, [allConnections]);

  const handleExport = async () => {
    const res = await exportMutation.mutateAsync();
    if (res.success && res.data) {
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `muxlyn-services-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const jiraConnections = allConnections.filter((c) => c.serviceType === 'jira');
  const customConnections = allConnections.filter(
    (c) => c.serviceType !== 'jira' && c.serviceType !== 'google',
  );

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const c of customConnections) {
      for (const tag of c.tags ?? []) tagSet.add(tag);
    }
    return [...tagSet].sort();
  }, [customConnections]);

  const filteredConnections = useMemo(() => {
    if (!activeTag) return customConnections;
    return customConnections.filter((c) => (c.tags ?? []).includes(activeTag));
  }, [customConnections, activeTag]);

  const sorted = useMemo(() => {
    return [...filteredConnections].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    });
  }, [filteredConnections]);

  const groupedConnections = useMemo(() => {
    const ungrouped: ServiceConnection[] = [];
    const map = new Map<string, ServiceConnection[]>();
    for (const g of groups) map.set(g.id, []);
    for (const c of sorted) {
      if (c.groupId && map.has(c.groupId)) {
        map.get(c.groupId)!.push(c);
      } else {
        ungrouped.push(c);
      }
    }
    return { grouped: map, ungrouped };
  }, [sorted, groups]);

  const groupOptions = groups.map((g) => ({ id: g.id, name: g.name }));
  const everythingEmpty = cards.length === 0 && customConnections.length === 0 && !connectionsLoading;

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">{t('nav.dashboard')}</h1>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={handleExport} disabled={exportMutation.isPending}>
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setManageGroupsOpen(true)}>
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">{t('service.group.manage')}</span>
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t('service.add')}</span>
          </Button>
        </div>
      </div>

      {cards.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => {
            const plugin = plugins.find((p) => p.dashboardCard === card);
            const conn = plugin && !connectionsLoading
              ? findActiveConnection(jiraConnections, plugin)
              : null;
            return (
              <PluginErrorBoundary key={card.order}>
                <Suspense fallback={
                  <Card><CardHeader><Skeleton className="h-5 w-32" /><Skeleton className="h-4 w-48" /></CardHeader><CardContent><Skeleton className="h-16 w-full" /></CardContent></Card>
                }>
                  <card.component connection={conn} />
                </Suspense>
              </PluginErrorBoundary>
            );
          })}
        </div>
      )}

      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {t('service.external_services')}
          </h2>
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs transition-colors',
                  activeTag === tag
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                )}
              >
                {tag}
                {activeTag === tag && <X className="h-3 w-3" />}
              </button>
            ))}
          </div>
        )}

        {connectionsLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card><CardHeader><Skeleton className="h-5 w-32" /><Skeleton className="h-4 w-48" /></CardHeader><CardContent><Skeleton className="h-6 w-full" /></CardContent></Card>
          </div>
        ) : (
          <>
            {groups.map((group) => {
              const items = groupedConnections.grouped.get(group.id) ?? [];
              if (items.length === 0 && !activeTag) return null;

              return (
                <div key={group.id} className="mb-6">
                  <div className="flex items-center gap-2 mb-2 group/header">
                    <button
                      type="button"
                      onClick={() => updateGroup.mutate({ id: group.id, collapsed: !group.collapsed })}
                      className="hover:bg-accent rounded p-0.5"
                    >
                      {group.collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: group.color }} />
                    <h3 className="text-sm font-medium">{group.name}</h3>
                    <span className="text-xs text-muted-foreground">({items.length})</span>
                  </div>
                  {!group.collapsed && (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-2">
                      {items.map((conn) => (
                        <ExternalServiceCard key={conn.id} connection={conn} groupOptions={groupOptions} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="mt-4">
              {groupedConnections.ungrouped.length > 0 && groups.length > 0 && (
                <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                  {t('service.ungrouped', 'Ungrouped')}
                </h3>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {groupedConnections.ungrouped.map((conn) => (
                  <ExternalServiceCard key={conn.id} connection={conn} groupOptions={groupOptions} />
                ))}
              </div>
            </div>

            {groups.length === 0 && sorted.length === 0 && !activeTag && (
              <Card>
                <CardContent className="flex flex-col items-center gap-3 py-8">
                  <p className="text-sm text-muted-foreground">{t('service.empty')}</p>
                  <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
                    <Plus className="h-4 w-4 mr-1.5" />{t('service.add')}
                  </Button>
                </CardContent>
              </Card>
            )}
            {groups.length > 0 && sorted.length === 0 && !activeTag && (
              <Card>
                <CardContent className="flex flex-col items-center gap-3 py-8">
                  <p className="text-sm text-muted-foreground">{t('service.add_to_group')}</p>
                  <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
                    <Plus className="h-4 w-4 mr-1.5" />{t('service.add')}
                  </Button>
                </CardContent>
              </Card>
            )}
            {activeTag && sorted.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center gap-3 py-8">
                  <p className="text-sm text-muted-foreground">{t('service.no_tag_match')}</p>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTag(null)}>
                    {t('service.clear_filter')}
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {everythingEmpty && (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <p className="text-muted-foreground">{t('dashboard.empty')}</p>
            <div className="flex gap-2">
              <Link to="/settings"><Button variant="outline">{t('dashboard.setup_connections')}</Button></Link>
              <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1.5" />{t('service.add')}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <AddServiceDialog open={addOpen} onOpenChange={setAddOpen} />
      <GroupManagementPanel open={manageGroupsOpen} onOpenChange={setManageGroupsOpen} />
    </div>
  );
}
