import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/modal';

export function SessionExpiredModal() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const goToLogin = useCallback(() => {
    window.location.replace('/login');
  }, []);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('session:expired', handler);
    window.addEventListener('session:ipChanged', handler);
    return () => {
      window.removeEventListener('session:expired', handler);
      window.removeEventListener('session:ipChanged', handler);
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && goToLogin()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('session.title')}</DialogTitle>
          <DialogDescription>{t('session.desc')}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={goToLogin}>
            {t('session.go_login')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
