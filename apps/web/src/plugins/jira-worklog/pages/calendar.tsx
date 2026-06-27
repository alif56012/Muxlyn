import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/shared/components/ui/card';
import { FullCalendarWrapper } from '@/plugins/jira-worklog/components/calendar/full-calendar';

export default function CalendarPage() {
  const { t } = useTranslation();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">{t('nav.jiraManagement')}</h1>
      <Card>
        <CardContent className="pt-6">
          <FullCalendarWrapper
            events={[]}
            onEventClick={() => {}}
            onDateSelect={() => {}}
            onEventDrop={() => {}}
          />
        </CardContent>
      </Card>
    </div>
  );
}
