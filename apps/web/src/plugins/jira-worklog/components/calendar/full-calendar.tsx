import type {
  DateSelectArg,
  EventChangeArg,
  EventClickArg,
  EventDropArg,
} from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Button } from '@/shared/components/ui/button';

type CalendarView = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay';

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  backgroundColor: string;
  extendedProps: {
    worklogId: string;
    taskKey: string;
    hours: number;
    comment?: string;
    type: 'manual' | 'preset' | 'auto';
  };
}

interface FullCalendarWrapperProps {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onDateSelect: (date: string) => void;
  onEventDrop: (worklogId: string, newDate: string, newHours?: number) => void;
}

const STORAGE_KEY = 'muxlyn-calendar-view';

function getStoredView(): CalendarView {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dayGridMonth' || stored === 'timeGridWeek' || stored === 'timeGridDay') {
      return stored;
    }
  } catch {
    /* ignore */
  }
  return 'dayGridMonth';
}

export function FullCalendarWrapper({
  events,
  onEventClick,
  onDateSelect,
  onEventDrop,
}: FullCalendarWrapperProps) {
  const [currentView, setCurrentView] = useState<CalendarView>(getStoredView);
  const calendarRef = useRef<FullCalendar>(null);

  const handleViewChange = useCallback((view: CalendarView) => {
    setCurrentView(view);
    localStorage.setItem(STORAGE_KEY, view);
    calendarRef.current?.getApi().changeView(view);
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      calendarRef.current?.getApi().updateSize();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleToday = useCallback(() => {
    calendarRef.current?.getApi().today();
  }, []);

  const handlePrev = useCallback(() => {
    calendarRef.current?.getApi().prev();
  }, []);

  const handleNext = useCallback(() => {
    calendarRef.current?.getApi().next();
  }, []);

  const viewLabel = {
    dayGridMonth: 'Month',
    timeGridWeek: 'Week',
    timeGridDay: 'Day',
  };

  return (
    <div className="space-y-4 overflow-x-auto">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={handlePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          {(['dayGridMonth', 'timeGridWeek', 'timeGridDay'] as const).map((view) => (
            <Button
              key={view}
              variant={currentView === view ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => handleViewChange(view)}
            >
              {viewLabel[view]}
            </Button>
          ))}
        </div>
      </div>

      <div ref={containerRef}>
        <FullCalendar
          ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={currentView}
        events={events}
        headerToolbar={false}
        height="auto"
        expandRows={false}
        editable
        selectable
        eventClick={(arg: EventClickArg) => {
          const event = arg.event;
          onEventClick({
            id: event.id,
            title: event.title,
            start: event.startStr,
            end: event.endStr,
            backgroundColor: event.backgroundColor,
            extendedProps: event.extendedProps as CalendarEvent['extendedProps'],
          });
        }}
        select={(arg: DateSelectArg) => {
          onDateSelect(arg.startStr);
          calendarRef.current?.getApi().unselect();
        }}
        eventDrop={(arg: EventDropArg) => {
          const { worklogId } = arg.event.extendedProps as CalendarEvent['extendedProps'];
          onEventDrop(worklogId, arg.event.startStr);
        }}
        eventResize={(arg: EventChangeArg) => {
          const { worklogId } = arg.event.extendedProps as CalendarEvent['extendedProps'];
          const hours = arg.event.end
            ? (arg.event.end.getTime() - (arg.event.start?.getTime() ?? 0)) / 3600000
            : 0;
          onEventDrop(worklogId, arg.event.startStr, hours);
        }}
        dayMaxEventRows={5}
        moreLinkClick={(arg) => {
          if (currentView === 'dayGridMonth') {
            handleViewChange('timeGridDay');
            calendarRef.current?.getApi().gotoDate(arg.date);
          }
        }}
        eventContent={(arg) => (
          <div className="px-1 py-0.5 text-xs truncate" title={arg.event.title}>
            {arg.event.title}
          </div>
        )}
      />
      </div>
    </div>
  );
}
