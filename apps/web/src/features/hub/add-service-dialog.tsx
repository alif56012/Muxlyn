import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCreateConnection } from '@/shared/api/service-connections';
import { getServiceTypeDef, SERVICE_TYPE_DEFS, type ExternalServiceType } from '@/shared/core/service-types';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/modal';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { cn } from '@/shared/lib/utils';

interface AddServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TYPE_OPTIONS = Object.entries(SERVICE_TYPE_DEFS).map(([key, def]) => ({
  value: key as ExternalServiceType,
  ...def,
}));

export function AddServiceDialog({ open, onOpenChange }: AddServiceDialogProps) {
  const { t } = useTranslation();
  const createMutation = useCreateConnection();
  const [displayName, setDisplayName] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [serviceType, setServiceType] = useState<ExternalServiceType>('custom');
  const [error, setError] = useState<string | null>(null);

  const typeDef = getServiceTypeDef(serviceType);

  const handleAddTag = () => {
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed) && tags.length < 5) {
      setTags([...tags, trimmed]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = async () => {
    setError(null);
    if (!displayName.trim()) {
      setError(t('service.name_required'));
      return;
    }
    try {
      await createMutation.mutateAsync({
        service_type: serviceType,
        display_name: displayName.trim(),
        url: url.trim() || undefined,
        tags,
        description: description.trim() || undefined,
      });
      setDisplayName('');
      setUrl('');
      setDescription('');
      setTags([]);
      setServiceType('custom');
      onOpenChange(false);
    } catch {
      setError(t('service.create_failed'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('service.add_title')}</DialogTitle>
          <DialogDescription>{t('service.add_desc')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Service Type */}
          <div className="space-y-2">
            <Label>{t('service.type_label', 'Type')}</Label>
            <div className="grid grid-cols-4 gap-1.5">
              {TYPE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = serviceType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setServiceType(opt.value)}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-md border p-2 text-xs transition-colors',
                      isSelected
                        ? `${opt.borderColor} bg-accent text-accent-foreground`
                        : 'border-transparent hover:bg-accent/50 text-muted-foreground',
                    )}
                  >
                    <Icon className={cn('h-4 w-4', isSelected && opt.textColor)} />
                    <span className="truncate max-w-full">{t(opt.labelKey)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="svc-name">{t('service.name')}</Label>
            <Input
              id="svc-name"
              placeholder={t('service.name_placeholder')}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          {/* URL */}
          <div className="space-y-2">
            <Label htmlFor="svc-url">{t('service.url')}</Label>
            <Input
              id="svc-url"
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="svc-desc">{t('service.description', 'Description')}</Label>
            <Input
              id="svc-desc"
              placeholder={t('service.description_placeholder', 'Brief description (optional)')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="svc-tags">
              {t('service.tags', 'Tags')}
              <span className="text-xs text-muted-foreground ml-1">
                ({tags.length}/5)
              </span>
            </Label>
            <div className="flex gap-1.5">
              <Input
                id="svc-tags"
                placeholder={t('service.tags_placeholder', 'Add tag...')}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                disabled={tags.length >= 5}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddTag}
                disabled={!tagInput.trim() || tags.length >= 5}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{t('common.cancel')}</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? t('common.loading') : (
              <>
                <Plus className="h-4 w-4 mr-1.5" />
                {t('service.add')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
