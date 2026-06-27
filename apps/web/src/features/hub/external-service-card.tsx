import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  Bug,
  Code2,
  Edit2,
  ExternalLink,
  Eye,
  GitBranch,
  Key,
  LayoutDashboard,
  MoreHorizontal,
  Pin,
  PinOff,
  Play,
  RefreshCw,
  ScrollText,
  Search,
  Settings,
  Terminal,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useDeleteConnection,
  useHealthCheck,
  useUpdateConnection,
} from '@/shared/api/service-connections';
import type { ServiceConnection } from '@/shared/core/types';
import { getServiceTypeDef } from '@/shared/core/service-types';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { cn } from '@/shared/lib/utils';
import { CredentialsDialog } from './credentials-dialog';

interface ExternalServiceCardProps {
  connection: ServiceConnection;
  groupOptions?: { id: string; name: string }[];
}

const HEALTH_STYLES: Record<string, { label: string; color: string; key: string }> = {
  alive: { label: 'Alive', color: 'bg-green-500', key: 'service.health.alive' },
  slow: { label: 'Slow', color: 'bg-yellow-500', key: 'service.health.slow' },
  down: { label: 'Down', color: 'bg-red-500', key: 'service.health.down' },
  unknown: { label: 'Unknown', color: 'bg-gray-400', key: 'service.health.unknown' },
};

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  ExternalLink, Activity, Edit2, Key, Eye, Play, Search, Settings,
  Terminal, Code2, Bug, Bell, RefreshCw, BarChart3, LayoutDashboard, ScrollText, ArrowRight,
};

function EditDialog({
  open,
  onOpenChange,
  connection,
  groupOptions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection: ServiceConnection;
  groupOptions?: { id: string; name: string }[];
}) {
  const { t } = useTranslation();
  const updateMutation = useUpdateConnection();
  const [displayName, setDisplayName] = useState(connection.displayName);
  const [url, setUrl] = useState(connection.url ?? '');
  const [description, setDescription] = useState(connection.description ?? '');
  const [groupId, setGroupId] = useState(connection.groupId ?? '');

  const handleSave = async () => {
    await updateMutation.mutateAsync({
      id: connection.id,
      display_name: displayName.trim() || undefined,
      url: url.trim() || null,
      description: description.trim() || null,
      group_id: groupId || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('service.edit_title')}</DialogTitle>
          <DialogDescription>{t('service.edit_desc')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">{t('service.name')}</Label>
            <Input id="edit-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-url">{t('service.url')}</Label>
            <Input id="edit-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-desc">{t('service.description', 'Description')}</Label>
            <Input id="edit-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          {groupOptions && groupOptions.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="edit-group">{t('service.group')}</Label>
              <Select value={groupId} onValueChange={setGroupId}>
                <SelectTrigger id="edit-group">
                  <SelectValue placeholder={t('service.no_group')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('service.no_group')}</SelectItem>
                  {groupOptions.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">{t('common.cancel')}</Button></DialogClose>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>{t('common.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ExternalServiceCard({ connection, groupOptions }: ExternalServiceCardProps) {
  const { t } = useTranslation();
  const deleteMutation = useDeleteConnection();
  const updateMutation = useUpdateConnection();
  const healthMutation = useHealthCheck();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [credsOpen, setCredsOpen] = useState(false);

  const typeDef = getServiceTypeDef(connection.serviceType);
  const Icon = typeDef.icon;
  const isPinned = connection.pinned;
  const health = connection.healthStatus ?? 'unknown';
  const healthDef = HEALTH_STYLES[health] ?? HEALTH_STYLES.unknown;

  const handlePin = () => {
    updateMutation.mutate({ id: connection.id, pinned: !isPinned });
  };

  const handlePing = () => {
    if (connection.url) healthMutation.mutate(connection.id);
  };

  return (
    <>
      <Card
        className={cn('group', isPinned && 'ring-1 ring-primary/20', connection.url && 'cursor-pointer hover:border-primary/40')}
        onClick={() => {
          if (connection.url) window.open(connection.url, '_blank', 'noopener');
        }}
      >
        <CardHeader className="flex flex-row items-start gap-3 pb-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
            style={{ backgroundColor: `${typeDef.textColor.replace('text-', '')}15` }}
          >
            <Icon className={cn('h-5 w-5', typeDef.textColor)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <CardTitle className="text-base truncate">{connection.displayName}</CardTitle>
              {isPinned && <Pin className="h-3.5 w-3.5 text-primary shrink-0" />}
            </div>
            <CardDescription className="truncate mt-0.5">
              {connection.url || t('service.no_url')}
            </CardDescription>
            {connection.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{connection.description}</p>
            )}
          </div>
          <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon-sm" className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                onClick={handlePin} title={isPinned ? t('service.unpin') : t('service.pin')}
                disabled={updateMutation.isPending}>
              {isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
            </Button>
            {connection.url && (
                <Button variant="ghost" size="icon-sm" className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                  onClick={handlePing} title={t('service.health.ping')} disabled={healthMutation.isPending}>
                <Activity className={cn('h-3.5 w-3.5', healthMutation.isPending && 'animate-pulse')} />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {connection.url && (
                  <DropdownMenuItem onClick={() => window.open(connection.url, '_blank', 'noopener')} className="gap-2">
                    <ExternalLink className="h-4 w-4" />{t('service.open')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setEditOpen(true)} className="gap-2">
                  <Edit2 className="h-4 w-4" />{t('service.edit')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCredsOpen(true)} className="gap-2">
                  <Key className="h-4 w-4" />{t('service.credentials.title', 'Credentials')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => window.open(`${window.location.origin}/workflows?c=${connection.id}`, '_blank')}
                  className="gap-2"
                >
                  <GitBranch className="h-4 w-4" />{t('service.workflows', 'Workflows')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setDeleteOpen(true)} className="gap-2 text-destructive">
                  <Trash2 className="h-4 w-4" />{t('common.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
          <CardContent className="pt-0 pb-3 space-y-2" onClick={(e) => e.stopPropagation()}>
          {/* Health */}
          {connection.healthLastChecked && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className={cn('h-2 w-2 rounded-full', healthDef.color)} />
              <span className="text-muted-foreground">{t(healthDef.key)}</span>
            </div>
          )}

          {/* Tags */}
          {connection.tags && connection.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {connection.tags.map((tag) => (
                <span key={tag} className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <EditDialog open={editOpen} onOpenChange={setEditOpen} connection={connection} groupOptions={groupOptions} />
      <CredentialsDialog open={credsOpen} onOpenChange={setCredsOpen} connectionId={connection.id} />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('service.delete_title')}</DialogTitle>
            <DialogDescription>{t('service.delete_desc', { name: connection.displayName })}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">{t('common.cancel')}</Button></DialogClose>
            <Button variant="destructive" onClick={() => { deleteMutation.mutate(connection.id); setDeleteOpen(false); }}
              disabled={deleteMutation.isPending}>{t('common.delete')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
