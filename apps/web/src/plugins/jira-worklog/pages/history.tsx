import { useTranslation } from 'react-i18next';

export default function HistoryPage() {
  const { t } = useTranslation();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">{t('nav.worklogHistory')}</h1>
      <p className="text-muted-foreground">{t('worklog.history_placeholder')}</p>
    </div>
  );
}
