import { Link } from '@tanstack/react-router';
import { CalendarIcon, History, Clock, Pencil, Trash2 } from 'lucide-react';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useServiceConnections } from '@/shared/api/service-connections';
import type { CalendarEvent } from '@/plugins/jira-worklog/components/calendar/full-calendar';
import { FullCalendarWrapper } from '@/plugins/jira-worklog/components/calendar/full-calendar';
import { HistoryTab } from '@/plugins/jira-worklog/components/history-tab';
import { LogWorkTab } from '@/plugins/jira-worklog/components/log-work-tab';
import { CalendarCreateDialog } from '@/plugins/jira-worklog/components/calendar-create-dialog';
import { WorklogEditDialog } from '@/plugins/jira-worklog/components/worklog-edit-dialog';
import { WorklogDeleteDialog } from '@/plugins/jira-worklog/components/worklog-delete-dialog';
import { useUpdateWorklog } from '@/plugins/jira-worklog/api/worklog';
import { useWorklogsByDateRange } from '@/plugins/jira-worklog/api/search';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { formatHours } from '@/shared/lib/utils';

const EVENT_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
];

function colorForKey(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return EVENT_COLORS[Math.abs(hash) % EVENT_COLORS.length];
}

const EIGHT_HOURS_SECONDS = 28_800;

export default function CalendarPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [tab, setTab] = useState('calendar');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [calendarRange, setCalendarRange] = useState<{ from: string; to: string } | null>(null);
  const [viewInterval, setViewInterval] = useState<{ start: Date; end: Date } | null>(null);

  // edit dialog state
  const [editing, setEditing] = useState<{ worklogId: string; issueId: string } | null>(null);
  const [deleting, setDeleting] = useState<{ worklogId: string; issueId: string } | null>(null);

  const { data: connections = [], isLoading: connectionsLoading } = useServiceConnections('jira');
  const hasActiveConnection = connections.some((c) => c.isActive);

  const { data: rawWorklogItems = [] } = useWorklogsByDateRange(
    calendarRange?.from ?? '',
    calendarRange?.to ?? '',
    tab === 'calendar' && hasActiveConnection && !!calendarRange,
  );

  const worklogItems = hasActiveConnection ? rawWorklogItems : [];

  const updateMutation = useUpdateWorklog();

  const { totalLoggedHours, targetHours, workingDays } = useMemo(() => {
    if (!viewInterval) return { totalLoggedHours: 0, targetHours: 0, workingDays: 0 };

    let logged = 0;
    for (const wl of worklogItems) {
      if (!wl.started || !wl.hours) continue;
      const eventDate = new Date(wl.started);
      if (eventDate >= viewInterval.start && eventDate < viewInterval.end) {
        logged += wl.hours;
      }
    }

    let days = 0;
    const cur = new Date(viewInterval.start);
    while (cur < viewInterval.end) {
      const d = cur.getDay();
      if (d !== 0 && d !== 6) {
        days++;
      }
      cur.setDate(cur.getDate() + 1);
    }

    return {
      totalLoggedHours: parseFloat(logged.toFixed(1)),
      targetHours: days * 8,
      workingDays: days,
    };
  }, [worklogItems, viewInterval]);

  const handleDatesIntervalChange = useCallback((start: Date, end: Date) => {
    const startMs = start.getTime();
    const endMs = end.getTime();
    setViewInterval((prev) => {
      if (prev && prev.start.getTime() === startMs && prev.end.getTime() === endMs) {
        return prev;
      }
      return { start, end };
    });
  }, []);

  // context menu
  const [contextMenu, setContextMenu] = useState<{
    x: number; y: number; event: CalendarEvent;
  } | null>(null);
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [contextMenu]);

  const calendarEvents = useMemo<CalendarEvent[]>(
    () =>
      worklogItems.map((wl) => {
        const start = wl.started.includes('T')
          ? wl.started
          : `${wl.date}T00:00:00`;
        const end = new Date(
          new Date(start).getTime() + wl.timeSpentSeconds * 1000,
        ).toISOString();
        return {
          id: wl.worklogId,
          title: `${wl.issueKey}: ${wl.issueSummary} · ${formatHours(wl.hours)}`,
          start,
          end,
          backgroundColor: colorForKey(wl.issueKey),
          borderColor: colorForKey(wl.issueKey),
          extendedProps: {
            worklogId: wl.worklogId,
            issueId: wl.issueId,
            issueKey: wl.issueKey,
            issueSummary: wl.issueSummary,
            hours: wl.hours,
            author: wl.author ?? undefined,
            comment: wl.comment,
            type: 'manual' as const,
          },
        };
      }),
    [worklogItems],
  );

  const dailyTotals = useMemo(() => {
    const map: Record<string, number> = {};
    for (const wl of worklogItems) {
      map[wl.date] = (map[wl.date] ?? 0) + wl.timeSpentSeconds;
    }
    return map;
  }, [worklogItems]);

  const handleDatesSet = useCallback((from: string, to: string) => {
    setCalendarRange((prev) =>
      prev?.from === from && prev?.to === to ? prev : { from, to },
    );
  }, []);

  const handleEventClick = useCallback((event: CalendarEvent) => {
    setEditing({
      worklogId: event.extendedProps.worklogId,
      issueId: event.extendedProps.issueId,
    });
  }, []);

  const handleEventContextMenu = useCallback(
    (event: CalendarEvent, clientX: number, clientY: number) => {
      setContextMenu({ x: clientX, y: clientY, event });
    },
    [],
  );

  const handleDateSelect = useCallback((date: string) => {
    setSelectedDate(date);
  }, []);

  const handleEventDrop = useCallback(
    (worklogId: string, newStartStr: string) => {
      const event = calendarEvents.find((e) => e.id === worklogId);
      if (!event) return;

      const issueId = event.extendedProps.issueId;
      const started = new Date(newStartStr).toISOString().replace('Z', '+0000');
      const durationSeconds = Math.round(event.extendedProps.hours * 3600);
      const range = calendarRange;

      updateMutation.mutate(
        { worklogId, issueId, started, durationSeconds },
        {
          onSuccess: (res) => {
            if (res.success && range) {
              qc.invalidateQueries({
                queryKey: ['worklogs', 'calendar', range.from, range.to],
              });
            }
          },
        },
      );
    },
    [calendarEvents, updateMutation, calendarRange, qc],
  );

  const invalidateCalendar = useCallback(() => {
    if (calendarRange) {
      qc.invalidateQueries({
        queryKey: ['worklogs', 'calendar', calendarRange.from, calendarRange.to],
      });
    }
  }, [qc, calendarRange]);

  const handleWorklogCreated = useCallback(() => {
    setSelectedDate(null);
    invalidateCalendar();
  }, [invalidateCalendar]);

  const handleEditSuccess = useCallback(() => {
    setEditing(null);
    invalidateCalendar();
  }, [invalidateCalendar]);

  const handleEditOpenDelete = useCallback(() => {
    if (editing) {
      setDeleting({ worklogId: editing.worklogId, issueId: editing.issueId });
      setEditing(null);
    }
  }, [editing]);

  const handleContextEdit = useCallback(() => {
    if (contextMenu) {
      const e = contextMenu.event;
      setEditing({ worklogId: e.extendedProps.worklogId, issueId: e.extendedProps.issueId });
      setContextMenu(null);
    }
  }, [contextMenu]);

  const handleContextDelete = useCallback(() => {
    if (contextMenu) {
      const e = contextMenu.event;
      setDeleting({ worklogId: e.extendedProps.worklogId, issueId: e.extendedProps.issueId });
      setContextMenu(null);
    }
  }, [contextMenu]);

  const handleDeleteSuccess = useCallback(() => {
    setDeleting(null);
    invalidateCalendar();
  }, [invalidateCalendar]);

  const dayCellClasses = useCallback(
    (date: string): string[] => {
      const d = new Date(date);
      const dow = d.getDay();
      if (dow === 0 || dow === 6) return [];

      const seconds = dailyTotals[date] ?? 0;
      if (seconds >= EIGHT_HOURS_SECONDS) return ['fc-day-complete'];
      return ['fc-day-incomplete'];
    },
    [dailyTotals],
  );

  return (
    <div className="p-6 min-w-0 overflow-auto max-w-full">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t('nav.jiraManagement')}</h1>
          <p className="text-sm text-muted-foreground">{t('worklog.calendar_desc')}</p>
        </div>

        {/* 8h indicator legend */}
        {tab === 'calendar' && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm bg-green-500/30 border border-green-500/40" />
              <span>8h+ complete</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm bg-orange-500/30 border border-orange-500/40" />
              <span>below 8h</span>
            </div>
          </div>
        )}
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
            Calendar
          </TabsTrigger>
          <TabsTrigger value="log-work" className="gap-1.5">
            <Clock className="h-4 w-4" />
            Log Work
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-6 outline-none">
          {hasActiveConnection && viewInterval && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 shadow-sm relative overflow-hidden">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('calendar.logged_hours')}
                    </p>
                    <h3 className="text-2xl font-bold mt-1 text-primary">
                      {formatHours(totalLoggedHours)}
                    </h3>
                  </div>
                  <Clock className="h-8 w-8 text-primary/30" />
                </CardContent>
              </Card>

              <Card className="bg-muted/40 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('calendar.target_hours')}
                    </p>
                    <h3 className="text-2xl font-bold mt-1">
                      {formatHours(targetHours)}
                    </h3>
                  </div>
                  <CalendarIcon className="h-8 w-8 text-muted-foreground/30" />
                </CardContent>
              </Card>

              <Card className="bg-muted/40 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('calendar.working_days')}
                    </p>
                    <h3 className="text-2xl font-bold mt-1">
                      {t('calendar.days_count', { count: workingDays })}
                    </h3>
                  </div>
                  <span className="text-2xl font-extrabold text-muted-foreground/15 font-mono select-none">
                    {workingDays}x8
                  </span>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardContent className="pt-6">
              <FullCalendarWrapper
                events={calendarEvents}
                onEventClick={handleEventClick}
                onEventContextMenu={handleEventContextMenu}
                onDateSelect={handleDateSelect}
                onEventDrop={handleEventDrop}
                onDatesSet={handleDatesSet}
                onDatesIntervalChange={handleDatesIntervalChange}
                dayCellClasses={dayCellClasses}
                disabled={!hasActiveConnection}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="log-work">
          <LogWorkTab onWorklogCreated={handleWorklogCreated} />
        </TabsContent>

        <TabsContent value="history">
          <HistoryTab />
        </TabsContent>
      </Tabs>

      {/* Create worklog from calendar date click */}
      {selectedDate && (
        <CalendarCreateDialog
          date={selectedDate}
          open={!!selectedDate}
          onOpenChange={(open) => {
            if (!open) setSelectedDate(null);
          }}
          onCreated={handleWorklogCreated}
        />
      )}

      {/* Edit worklog from calendar event click */}
      {editing && (
        <WorklogEditDialog
          worklogId={editing.worklogId}
          issueId={editing.issueId}
          open={!!editing}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          onSuccess={handleEditSuccess}
          onDelete={handleEditOpenDelete}
        />
      )}

      {/* Delete worklog */}
      {deleting && (
        <WorklogDeleteDialog
          worklogId={deleting.worklogId}
          issueId={deleting.issueId}
          open={!!deleting}
          onOpenChange={(open) => {
            if (!open) setDeleting(null);
          }}
          onSuccess={handleDeleteSuccess}
        />
      )}

      {/* Right-click context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 min-w-[160px] rounded-md border bg-popover p-1 shadow-md"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <div className="px-2 py-1.5 text-xs text-muted-foreground max-w-[220px]">
            <div className="font-medium text-foreground truncate">
              {contextMenu.event.extendedProps.issueSummary}
            </div>
            <div className="truncate">
              {contextMenu.event.extendedProps.issueKey} · {formatHours(contextMenu.event.extendedProps.hours)}
            </div>
            {contextMenu.event.extendedProps.author && (
              <div className="truncate text-muted-foreground/60">{contextMenu.event.extendedProps.author}</div>
            )}
          </div>
          <div className="h-px bg-border my-1" />
          <button
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
            onClick={handleContextEdit}
          >
            <Pencil className="h-4 w-4" />
            Edit
          </button>
          <button
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-accent"
            onClick={handleContextDelete}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
