import {
  ArrowDown,
  ArrowUp,
  Check,
  Circle,
  Pencil,
  Plus,
  Settings2,
  Trash2,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useServiceGroups,
  useCreateGroup,
  useUpdateGroup,
  useDeleteGroup,
} from '@/shared/api/service-groups';
import { useServiceConnections } from '@/shared/api/service-connections';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/modal';
import { Input } from '@/shared/components/ui/input';
import { cn } from '@/shared/lib/utils';

const COLOR_PRESETS = [
  '#6b7280', '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#3b82f6', '#6366f1', '#a855f7', '#ec4899',
];

interface GroupManagementPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GroupManagementPanel({ open, onOpenChange }: GroupManagementPanelProps) {
  const { t } = useTranslation();
  const { data: groups = [] } = useServiceGroups();
  const { data: allConnections = [] } = useServiceConnections();
  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();

  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [pickingColor, setPickingColor] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createGroup.mutateAsync({ name: newName.trim() });
    setNewName('');
  };

  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const saveEdit = (id: string) => {
    if (editingName.trim()) {
      updateGroup.mutate({ id, name: editingName.trim() });
    }
    setEditingId(null);
  };

  const handleMove = (id: string, direction: 'up' | 'down') => {
    const idx = groups.findIndex((g) => g.id === id);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= groups.length) return;

    const updates = [
      { id: groups[idx].id, sort_order: targetIdx },
      { id: groups[targetIdx].id, sort_order: idx },
    ];
    for (const u of updates) {
      updateGroup.mutate(u);
    }
  };

  const confirmDelete = () => {
    if (deleteTargetId) {
      deleteGroup.mutate(deleteTargetId, {
        onSuccess: () => setDeleteTargetId(null),
      });
    }
  };

  const handleColorChange = (id: string, color: string) => {
    updateGroup.mutate({ id, color });
    setPickingColor(null);
  };

  const serviceCount = (groupId: string) =>
    allConnections.filter((c) => c.groupId === groupId).length;

  const handleClose = () => {
    setEditingId(null);
    setPickingColor(null);
    setDeleteTargetId(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-lg">
        {deleteTargetId ? (
          <>
            <DialogHeader>
              <DialogTitle>{t('service.delete_title')}</DialogTitle>
              <DialogDescription>
                {t('service.group.delete_confirm')}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteTargetId(null)}>
                {t('common.cancel')}
              </Button>
              <Button variant="destructive" onClick={confirmDelete} disabled={deleteGroup.isPending}>
                {t('common.delete')}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                {t('service.group.manage', 'Manage Groups')}
              </DialogTitle>
              <DialogDescription>
                {t('service.group.manage_desc')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 max-h-80 overflow-auto">
              {groups.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t('service.group.empty')}
                </p>
              )}

              {groups.map((group, idx) => (
                <div
                  key={group.id}
                  className="flex items-center gap-2 rounded-md border p-2 group/row"
                >
                  <div className="flex flex-col gap-0.5 shrink-0 sm:opacity-0 sm:group-hover/row:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => handleMove(group.id, 'up')}
                      disabled={idx === 0}
                      className="hover:bg-accent rounded p-0.5 disabled:opacity-30"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMove(group.id, 'down')}
                      disabled={idx === groups.length - 1}
                      className="hover:bg-accent rounded p-0.5 disabled:opacity-30"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setPickingColor(pickingColor === group.id ? null : group.id)}
                      className="flex h-7 w-7 items-center justify-center rounded hover:bg-accent"
                      title={t('service.group.color')}
                    >
                      <Circle className="h-4 w-4" style={{ color: group.color, fill: group.color }} />
                    </button>
                    {pickingColor === group.id && (
                      <div className="absolute top-8 left-0 z-10 flex gap-1 rounded-md border bg-popover p-1.5 shadow-md">
                        {COLOR_PRESETS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => handleColorChange(group.id, color)}
                            className={cn(
                              'h-5 w-5 rounded-full border-2 transition-transform hover:scale-125',
                              group.color === color ? 'border-foreground' : 'border-transparent',
                            )}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {editingId === group.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit(group.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          className="h-7 text-sm"
                          autoFocus
                        />
                        <Button variant="ghost" size="icon-sm" onClick={() => saveEdit(group.id)}>
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => setEditingId(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEdit(group.id, group.name)}
                        className="text-sm font-medium hover:text-primary transition-colors text-left truncate w-full"
                      >
                        {group.name}
                      </button>
                    )}
                  </div>

                  <span className="text-xs text-muted-foreground shrink-0">
                    {serviceCount(group.id)} {t('service.group.services')}
                  </span>

                  <div className="flex items-center gap-0.5 shrink-0 sm:opacity-0 sm:group-hover/row:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon-sm" onClick={() => startEdit(group.id, group.name)} title={t('service.group.edit')}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => setDeleteTargetId(group.id)} className="text-destructive hover:text-destructive" title={t('common.delete')}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t">
              <Input
                placeholder={t('service.group.name_placeholder')}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                className="h-9"
              />
              <Button variant="outline" size="sm" onClick={handleCreate} disabled={!newName.trim() || createGroup.isPending}>
                <Plus className="h-4 w-4 mr-1" />
                {t('service.group.create')}
              </Button>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                {t('common.close')}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
