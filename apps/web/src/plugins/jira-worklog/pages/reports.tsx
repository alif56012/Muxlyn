import { useTranslation } from 'react-i18next';
import { MonthlyReportTab } from '../components/report/monthly-report-tab';

export function ReportsPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-8">
      {/* Monthly Report (always visible, filter bar includes mode toggle) */}
      <MonthlyReportTab />
    </div>
  );
}
