import type {
  DateSelectArg,
  DatesSetArg,
  EventChangeArg,
  EventClickArg,
  EventDropArg,
} from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Button } from '@/shared/components/ui/button';

type CalendarView = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay';

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  backgroundColor: string;
  borderColor?: string;
  textColor?: string;
  extendedProps: {
    worklogId: string;
    issueId: string;
    issueKey: string;
    issueSummary: string;
    hours: number;
    author?: string;
    comment?: string;
    type: 'manual' | 'preset' | 'auto';
  };
}

interface FullCalendarWrapperProps {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onEventContextMenu?: (event: CalendarEvent, clientX: number, clientY: number) => void;
  onDateSelect: (date: string) => void;
  onEventDrop: (worklogId: string, newDate: string, newHours?: number) => void;
  onDatesSet?: (dateFrom: string, dateTo: string) => void;
  dayCellClasses?: (date: string) => string[];
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

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
  onEventContextMenu,
  onDateSelect,
  onEventDrop,
  onDatesSet,
  dayCellClasses,
}: FullCalendarWrapperProps) {
  const [currentView, setCurrentView] = useState<CalendarView>(getStoredView);
  const [title, setTitle] = useState('');
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

  useEffect(() => {
    const root = containerRef.current?.querySelector('.fc');
    if (!root) return;
    const HIGHLIGHT_CLASSES = ['fc-day-complete', 'fc-day-incomplete'];
    const cells = root.querySelectorAll<HTMLElement>(
      'td.fc-daygrid-day[data-date], td.fc-timegrid-col[data-date]',
    );
    cells.forEach((cell) => {
      const date = cell.dataset.date;
      if (!date) return;
      cell.classList.remove(...HIGHLIGHT_CLASSES);
      const classes = dayCellClasses?.(date) ?? [];
      if (classes.length > 0) cell.classList.add(...classes);
    });
  }, [dayCellClasses, events]);

  const handleToday = useCallback(() => {
    calendarRef.current?.getApi().today();
  }, []);

  const handlePrev = useCallback(() => {
    calendarRef.current?.getApi().prev();
  }, []);

  const handleNext = useCallback(() => {
    calendarRef.current?.getApi().next();
  }, []);

  const viewLabel: Record<CalendarView, string> = {
    dayGridMonth: 'Month',
    timeGridWeek: 'Week',
    timeGridDay: 'Day',
  };

  return (
    <div className="fc-custom space-y-3 overflow-x-auto">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" onClick={handlePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[180px] text-center select-none">
            {title}
          </h2>
          <Button variant="outline" size="icon-sm" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleToday} className="text-xs">
            Today
          </Button>
        </div>

        <div className="flex items-center gap-1 rounded-md border p-0.5">
          {(Object.entries(viewLabel) as [CalendarView, string][]).map(([view, label]) => (
            <Button
              key={view}
              variant={currentView === view ? 'primary' : 'ghost'}
              size="sm"
              className="text-xs h-7 px-2.5"
              onClick={() => handleViewChange(view)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Calendar */}
      <div ref={containerRef}>
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={currentView}
          events={events}
          headerToolbar={false}
          height="auto"
          expandRows={true}
          fixedWeekCount={false}
          editable
          selectable
          eventDurationEditable={false}
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
          datesSet={(arg: DatesSetArg) => {
            const from = arg.startStr.slice(0, 10);
            const to = arg.endStr.slice(0, 10);
            onDatesSet?.(from, to);

            // update title: "June 2026" for month, "Jun 22 – 28, 2026" for week
            const api = arg.view.calendar;
            const date = api.getDate();
            const viewType = arg.view.type;
            if (viewType === 'dayGridMonth') {
              setTitle(`${MONTHS[date.getMonth()]} ${date.getFullYear()}`);
            } else if (viewType === 'timeGridWeek') {
              const end = new Date(date);
              end.setDate(end.getDate() + 6);
              const sameMonth = date.getMonth() === end.getMonth();
              const sameYear = date.getFullYear() === end.getFullYear();
              if (sameMonth && sameYear) {
                setTitle(`${MONTHS[date.getMonth()]} ${date.getDate()} – ${end.getDate()}, ${date.getFullYear()}`);
              } else if (sameYear) {
                setTitle(`${MONTHS[date.getMonth()]} ${date.getDate()} – ${MONTHS[end.getMonth()]} ${end.getDate()}, ${date.getFullYear()}`);
              } else {
                setTitle(`${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} – ${MONTHS[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`);
              }
            } else {
              setTitle(`${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`);
            }
          }}
          dayMaxEventRows={4}
          moreLinkClick={(arg) => {
            if (currentView === 'dayGridMonth') {
              handleViewChange('timeGridDay');
              calendarRef.current?.getApi().gotoDate(arg.date);
            }
          }}
          eventDidMount={(arg) => {
            if (onEventContextMenu) {
              arg.el.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const event: CalendarEvent = {
                  id: arg.event.id,
                  title: arg.event.title,
                  start: arg.event.startStr,
                  end: arg.event.endStr,
                  backgroundColor: arg.event.backgroundColor,
                  extendedProps: arg.event.extendedProps as CalendarEvent['extendedProps'],
                };
                onEventContextMenu(event, (e as MouseEvent).clientX, (e as MouseEvent).clientY);
              });
            }
          }}
          eventContent={(arg) => {
            const p = arg.event.extendedProps;
            const tooltip = [
              `${p.issueKey}: ${p.issueSummary}`,
              `${p.hours}h`,
              p.author ? `By: ${p.author}` : '',
              p.comment || '',
            ]
              .filter(Boolean)
              .join('\n');
            return (
              <div title={tooltip} className="overflow-hidden">
                <div className="truncate font-medium">{p.issueSummary}</div>
                <div className="truncate opacity-75 text-[10px]">
                  {p.issueKey} · {p.hours}h
                </div>
              </div>
            );
          }}
        />
      </div>
    </div>
  );
}
