import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/shared/lib/utils';
import { Input } from './input';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

interface TimePickerProps {
  value: string; // "HH:MM"
  onChange: (value: string) => void;
  className?: string;
}

export function TimePicker({ value, onChange, className }: TimePickerProps) {
  const [hStr, mStr] = value.split(':');
  const [hourInput, setHourInput] = useState(hStr || '09');
  const [minuteInput, setMinuteInput] = useState(mStr || '00');
  const [hourOpen, setHourOpen] = useState(false);
  const [minuteOpen, setMinuteOpen] = useState(false);

  const hourRef = useRef<HTMLInputElement>(null);
  const minuteRef = useRef<HTMLInputElement>(null);

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  useEffect(() => {
    const [h, m] = value.split(':');
    setHourInput(h || '09');
    setMinuteInput(m || '00');
  }, [value]);

  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, ''); // only digits
    if (val.length > 2) val = val.slice(-2);

    setHourInput(val);

    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 0 && num <= 23) {
      const formatted = String(num).padStart(2, '0');
      if (val.length === 2 || num >= 3) {
        onChange(`${formatted}:${minuteInput}`);
        setHourOpen(false);
        setTimeout(() => {
          minuteRef.current?.focus();
          minuteRef.current?.select();
        }, 0);
      }
    }
  };

  const handleHourBlur = () => {
    let num = parseInt(hourInput, 10);
    if (isNaN(num) || num < 0 || num > 23) {
      num = 9; // default
    }
    const formatted = String(num).padStart(2, '0');
    setHourInput(formatted);
    onChange(`${formatted}:${minuteInput}`);
  };

  const handleHourKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      let num = parseInt(hourInput, 10);
      if (isNaN(num)) num = 9;
      num = (num + 1) % 24;
      const formatted = String(num).padStart(2, '0');
      setHourInput(formatted);
      onChange(`${formatted}:${minuteInput}`);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      let num = parseInt(hourInput, 10);
      if (isNaN(num)) num = 9;
      num = (num - 1 + 24) % 24;
      const formatted = String(num).padStart(2, '0');
      setHourInput(formatted);
      onChange(`${formatted}:${minuteInput}`);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      setHourOpen(false);
      minuteRef.current?.focus();
      minuteRef.current?.select();
    }
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 2) val = val.slice(-2);

    setMinuteInput(val);

    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 0 && num <= 59) {
      if (val.length === 2) {
        const formatted = String(num).padStart(2, '0');
        onChange(`${hourInput}:${formatted}`);
        setMinuteOpen(false);
      }
    }
  };

  const handleMinuteBlur = () => {
    let num = parseInt(minuteInput, 10);
    if (isNaN(num) || num < 0 || num > 59) {
      num = 0; // default
    }
    const formatted = String(num).padStart(2, '0');
    setMinuteInput(formatted);
    onChange(`${hourInput}:${formatted}`);
  };

  const handleMinuteKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      let num = parseInt(minuteInput, 10);
      if (isNaN(num)) num = 0;
      num = (num + 1) % 60;
      const formatted = String(num).padStart(2, '0');
      setMinuteInput(formatted);
      onChange(`${hourInput}:${formatted}`);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      let num = parseInt(minuteInput, 10);
      if (isNaN(num)) num = 0;
      num = (num - 1 + 60) % 60;
      const formatted = String(num).padStart(2, '0');
      setMinuteInput(formatted);
      onChange(`${hourInput}:${formatted}`);
    } else if (e.key === 'Backspace' && !minuteInput) {
      e.preventDefault();
      setMinuteOpen(false);
      hourRef.current?.focus();
      hourRef.current?.select();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      setMinuteOpen(false);
      minuteRef.current?.blur();
    }
  };

  const selectHour = (h: string) => {
    setHourInput(h);
    onChange(`${h}:${minuteInput}`);
    setHourOpen(false);
    setTimeout(() => {
      minuteRef.current?.focus();
      minuteRef.current?.select();
    }, 0);
  };

  const selectMinute = (m: string) => {
    setMinuteInput(m);
    onChange(`${hourInput}:${m}`);
    setMinuteOpen(false);
  };

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <Popover open={hourOpen} onOpenChange={setHourOpen}>
        <PopoverTrigger asChild>
          <Input
            ref={hourRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={hourInput}
            onChange={handleHourChange}
            onBlur={handleHourBlur}
            onKeyDown={handleHourKeyDown}
            onFocus={(e) => {
              e.target.select();
              setHourOpen(true);
            }}
            className="w-[72px] h-9 text-center font-mono"
            placeholder="HH"
          />
        </PopoverTrigger>
        <PopoverContent
          className="w-[80px] p-0 max-h-[220px] overflow-y-auto"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col">
            {hours.map((h) => (
              <button
                key={h}
                type="button"
                className={cn(
                  'px-3 py-1.5 text-sm text-center font-mono hover:bg-accent hover:text-accent-foreground w-full transition-colors',
                  h === hourInput && 'bg-primary/10 text-primary font-bold',
                )}
                onClick={() => selectHour(h)}
              >
                {h}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <span className="text-sm font-semibold text-muted-foreground">:</span>

      <Popover open={minuteOpen} onOpenChange={setMinuteOpen}>
        <PopoverTrigger asChild>
          <Input
            ref={minuteRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={minuteInput}
            onChange={handleMinuteChange}
            onBlur={handleMinuteBlur}
            onKeyDown={handleMinuteKeyDown}
            onFocus={(e) => {
              e.target.select();
              setMinuteOpen(true);
            }}
            className="w-[72px] h-9 text-center font-mono"
            placeholder="MM"
          />
        </PopoverTrigger>
        <PopoverContent
          className="w-[80px] p-0 max-h-[220px] overflow-y-auto"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col">
            {minutes.map((m) => (
              <button
                key={m}
                type="button"
                className={cn(
                  'px-3 py-1.5 text-sm text-center font-mono hover:bg-accent hover:text-accent-foreground w-full transition-colors',
                  m === minuteInput && 'bg-primary/10 text-primary font-bold',
                )}
                onClick={() => selectMinute(m)}
              >
                {m}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
