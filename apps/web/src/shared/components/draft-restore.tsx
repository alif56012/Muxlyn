import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/components/ui/button';

interface Props {
  draftData: Record<string, unknown>;
  onRestore: () => void;
  onClear: () => void;
}

export function DraftRestore({ onRestore, onClear }: Props) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950">
      <p className="text-sm text-amber-800 dark:text-amber-200">{t('draft.unsaved')}</p>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onClear}>
          {t('draft.clear')}
        </Button>
        <Button size="sm" onClick={onRestore}>
          {t('draft.restore')}
        </Button>
      </div>
    </div>
  );
}
