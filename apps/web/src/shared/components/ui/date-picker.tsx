import { useState, useEffect } from 'react';
import { format, parse, isValid } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Button } from './button';
import { Calendar } from './calendar';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Input } from './input';

interface DatePickerProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: (date: Date) => boolean;
  startMonth?: Date;
  endMonth?: Date;
}

function parseDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value + 'T00:00:00');
  return isNaN(d.getTime()) ? undefined : d;
}

function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function displayDate(date: Date): string {
  return format(date, 'MMM d, yyyy');
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  className,
  disabled,
  startMonth,
  endMonth,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const selected = parseDate(value);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Try to parse the input
    const parsed = parse(newValue, 'yyyy-MM-dd', new Date());
    if (isValid(parsed)) {
      onChange?.(formatDate(parsed));
    }
  };

  const handleBlur = () => {
    // Reset to current value if input is invalid
    if (inputValue !== (value || '')) {
      setInputValue(value || '');
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'h-9 w-full justify-start text-left font-normal',
            !selected && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {selected ? displayDate(selected) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            if (date) {
              onChange?.(formatDate(date));
              setOpen(false);
            }
          }}
          disabled={disabled}
          startMonth={startMonth}
          endMonth={endMonth}
        />
        <div className="mt-3 border-t pt-3">
          <Input
            type="text"
            placeholder="yyyy-mm-dd"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            className="h-8 text-sm"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface DateRangePickerProps {
  from?: string;
  to?: string;
  onFromChange?: (value: string) => void;
  onToChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: (date: Date) => boolean;
  startMonth?: Date;
  endMonth?: Date;
}

export function DateRangePicker({
  from,
  to,
  onFromChange,
  onToChange,
  placeholder = 'Pick a date',
  className,
  disabled,
  startMonth,
  endMonth,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const fromDate = parseDate(from);
  const toDate = parseDate(to);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'h-9 justify-start text-left font-normal w-full',
            !fromDate && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {fromDate ? (
            toDate ? (
              <>
                {displayDate(fromDate)} – {displayDate(toDate)}
              </>
            ) : (
              displayDate(fromDate)
            )
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={fromDate && toDate ? { from: fromDate, to: toDate } : undefined}
          onSelect={(range) => {
            if (range?.from) {
              onFromChange?.(formatDate(range.from));
              if (range.to) {
                onToChange?.(formatDate(range.to));
                setOpen(false);
              }
            }
          }}
          disabled={disabled}
          startMonth={startMonth}
          endMonth={endMonth}
          numberOfMonths={isMobile ? 1 : 2}
        />
      </PopoverContent>
    </Popover>
  );
}
