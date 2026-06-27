import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { useTranslation } from 'react-i18next';
import { th, enUS } from 'date-fns/locale';
import { cn } from '@/shared/lib/utils';
import { buttonVariants } from './button';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  const { i18n } = useTranslation();
  const currentYear = new Date().getFullYear();
  const defaultStartMonth = new Date(currentYear - 20, 0); // 20 years ago
  const defaultEndMonth = new Date(currentYear + 10, 11);  // 10 years in the future

  const activeLocale = i18n.language === 'th' ? th : enUS;

  const defaultClassNames = {
    months: 'flex flex-col sm:flex-row gap-4',
    month: 'flex flex-col gap-4',
    month_caption: 'flex justify-center pt-1 relative items-center w-full',
    caption_label: 'inline-flex items-center gap-1 text-sm font-semibold whitespace-nowrap',
    dropdowns: 'flex gap-1 justify-center items-center z-10',
    dropdown: 'absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer',
    dropdown_root: 'relative inline-flex flex-row items-center text-sm font-semibold hover:bg-accent hover:text-accent-foreground px-1.5 py-0.5 rounded-md transition-colors gap-1 cursor-pointer select-none whitespace-nowrap',
    nav: 'flex items-center gap-1',
    button_previous: cn(
      buttonVariants({ variant: 'outline' }),
      'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-1',
    ),
    button_next: cn(
      buttonVariants({ variant: 'outline' }),
      'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-1',
    ),
    month_grid: 'w-full border-collapse space-y-1',
    weekdays: 'flex',
    weekday: 'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]',
    week: 'flex w-full mt-2',
    day: cn(
      'relative p-0 text-center text-sm focus-within:relative focus-within:z-20',
      '[&:has([aria-selected])]:bg-accent [&:has([aria-selected].outside)]:bg-accent/50',
      '[&:has([aria-selected].range_end)]:rounded-r-md',
    ),
    day_button: cn(
      buttonVariants({ variant: 'ghost' }),
      'h-9 w-9 p-0 font-normal aria-selected:opacity-100',
    ),
    range_end: 'range_end',
    selected: cn(
      'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
    ),
    today: 'bg-accent text-accent-foreground',
    outside: cn(
      'outside text-muted-foreground aria-selected:bg-accent/50 aria-selected:text-muted-foreground opacity-50',
    ),
    disabled: 'text-muted-foreground opacity-50',
    range_middle: 'aria-selected:bg-accent aria-selected:text-accent-foreground',
    hidden: 'invisible',
  };

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{ ...defaultClassNames, ...classNames }}
      captionLayout="dropdown"
      startMonth={props.startMonth ?? defaultStartMonth}
      endMonth={props.endMonth ?? defaultEndMonth}
      locale={activeLocale}
      weekStartsOn={0}
      components={{
        Chevron: ({ orientation }) => {
          if (orientation === 'left') {
            return <ChevronLeft className="h-4 w-4" />;
          }
          if (orientation === 'right') {
            return <ChevronRight className="h-4 w-4" />;
          }
          if (orientation === 'down') {
            return <ChevronDown className="h-3 w-3 text-muted-foreground/70 shrink-0" />;
          }
          return <></>;
        },
      }}
      {...props}
    />
  );
}

export { Calendar };
