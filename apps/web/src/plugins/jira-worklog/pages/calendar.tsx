import { Link } from '@tanstack/react-router';
import { CalendarIcon, History, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useServiceConnections } from '@/shared/api/service-connections';
import type { CalendarEvent } from '@/plugins/jira-worklog/components/calendar/full-calendar';
import { FullCalendarWrapper } from '@/plugins/jira-worklog/components/calendar/full-calendar';
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
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/modal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';

function HistoryTab() {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('nav.worklogHistory')}</CardTitle>
        <CardDescription>{t('worklog.history_desc')}</CardDescription>
      </CardHeader>
      <CardContent className="h-48 flex items-center justify-center text-muted-foreground">
        {t('worklog.history_empty')}
      </CardContent>
    </Card>
  );
}

export default function CalendarPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('calendar');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const { data: connections = [], isLoading: connectionsLoading } = useServiceConnections('jira');
  const hasActiveConnection = connections.some((c) => c.isActive);

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
  };

  const handleEventDrop = (_worklogId: string, _newDate: string) => {};

  return (
    <div className="p-6 min-w-0 overflow-auto max-w-full">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t('nav.jiraManagement')}</h1>
          <p className="text-sm text-muted-foreground">{t('worklog.calendar_desc')}</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" disabled title="Coming soon">
          <Sparkles className="h-4 w-4" />
          {t('nav.smartWorklog')}
        </Button>
      </div>

      {!connectionsLoading && !hasActiveConnection && (
        <div className="mb-6 rounded-md border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm flex items-start justify-between gap-4">
          <div>
            <p className="font-medium text-yellow-700 dark:text-yellow-400">
              {t('jira.not_connected_banner')}
            </p>
            <p className="text-yellow-600/80 dark:text-yellow-300/70 mt-1">
              {t('jira.not_connected_banner_desc')}
            </p>
          </div>
          <Link to="/settings" search={{ tab: 'connections' }}>
            <Button variant="outline" size="sm">
              {t('jira.connect')}
            </Button>
          </Link>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="calendar" className="gap-1.5">
            <CalendarIcon className="h-4 w-4" />
            {t('nav.jiraManagement')}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <History className="h-4 w-4" />
            {t('nav.worklogHistory')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          <Card>
            <CardContent className="pt-6">
              <FullCalendarWrapper
                events={[]}
                onEventClick={handleEventClick}
                onDateSelect={handleDateSelect}
                onEventDrop={handleEventDrop}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <HistoryTab />
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedEvent?.extendedProps.taskKey ?? selectedEvent?.title}
            </DialogTitle>
            <DialogDescription>{t('worklog.detail_desc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">{t('worklog.hours')}:</span>{' '}
              {selectedEvent?.extendedProps.hours}h
            </p>
            <p>
              <span className="text-muted-foreground">{t('worklog.type')}:</span>{' '}
              {selectedEvent?.extendedProps.type}
            </p>
            {selectedEvent?.extendedProps.comment && (
              <p>
                <span className="text-muted-foreground">{t('worklog.comment')}:</span>{' '}
                {selectedEvent.extendedProps.comment}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedEvent(null)}>
              {t('common.close')}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setSelectedEvent(null);
                window.dispatchEvent(
                  new CustomEvent('toast:show', {
                    detail: { message: t('worklog.coming_soon'), variant: 'info' },
                  }),
                );
              }}
            >
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedDate} onOpenChange={() => setSelectedDate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('worklog.create_title')}</DialogTitle>
            <DialogDescription>
              {selectedDate ? new Date(selectedDate).toLocaleDateString() : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">{t('worklog.search_empty')}</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDate(null)}>
              {t('common.cancel')}
            </Button>
            <Button>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
