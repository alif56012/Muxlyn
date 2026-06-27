import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useServiceCredentials,
  useCreateCredential,
  useDeleteCredential,
} from '@/shared/api/service-connections';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/modal';
import { Input } from '@/shared/components/ui/input';

export function CredentialsDialog({
  open,
  onOpenChange,
  connectionId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionId: string;
}) {
  const { t } = useTranslation();
  const { data: creds = [] } = useServiceCredentials(connectionId);
  const createCred = useCreateCredential();
  const deleteCred = useDeleteCredential();
  const [keyName, setKeyName] = useState('');
  const [value, setValue] = useState('');

  const handleAdd = async () => {
    if (!keyName.trim() || !value.trim()) return;
    await createCred.mutateAsync({ connectionId, key_name: keyName.trim(), value: value.trim() });
    setKeyName('');
    setValue('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('service.credentials.title', 'Credentials')}</DialogTitle>
          <DialogDescription>
            {t('service.credentials.desc', 'Store API keys or tokens for use in Quick Actions. Values are encrypted.')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder={t('service.credentials.key_placeholder', 'Key name')}
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder={t('service.credentials.value_placeholder', 'Value')}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              type="password"
              className="flex-1"
            />
            <Button variant="outline" size="sm" onClick={handleAdd} disabled={!keyName.trim() || !value.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {creds.length > 0 && (
            <div className="space-y-1 max-h-40 overflow-auto">
              {creds.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded border px-2 py-1 text-sm">
                  <span className="font-mono text-xs">{c.keyName}</span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => deleteCred.mutate({ connectionId, credId: c.id })}
                    className="text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
