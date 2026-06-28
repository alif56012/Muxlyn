import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { cn } from '@/shared/lib/utils';

interface AsyncComboboxOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface AsyncComboboxProps {
  options: AsyncComboboxOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  loading?: boolean;
  onSearch?: (q: string) => void;
  className?: string;
}

export function AsyncCombobox({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Type to search...',
  emptyText = 'No results.',
  loading,
  onSearch,
  className,
}: AsyncComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');
  const searchRef = React.useRef(onSearch);
  searchRef.current = onSearch;
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleInputChange = React.useCallback(
    (val: string) => {
      setInputValue(val);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => searchRef.current?.(val), 250);
    },
    [],
  );

  React.useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  // Manual client-side filtering
  const filtered = React.useMemo(() => {
    const q = inputValue.toLowerCase().trim();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.value.toLowerCase().includes(q) ||
        o.sublabel?.toLowerCase().includes(q),
    );
  }, [options, inputValue]);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? value;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between font-normal truncate', className)}
        >
          <span className="truncate">{selectedLabel || placeholder}</span>
          <ChevronsUpDown size={16} className="ml-2 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="p-2 border-b">
          <Input
            placeholder={searchPlaceholder}
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="max-h-[250px] overflow-y-auto p-1">
          {loading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="px-3 py-6 text-sm text-muted-foreground text-center">{emptyText}</div>
          )}
          {!loading &&
            filtered.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange?.(option.value === value ? '' : option.value);
                  setOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-sm transition-colors text-left',
                  value === option.value ? 'bg-accent text-accent-foreground' : 'hover:bg-muted',
                )}
              >
                <Check
                  size={16}
                  className={cn('shrink-0', value === option.value ? 'opacity-100' : 'opacity-0')}
                />
                <div className="flex-1 min-w-0">
                  <div className="truncate">{option.label}</div>
                  {option.sublabel && (
                    <div className="text-xs text-muted-foreground truncate">{option.sublabel}</div>
                  )}
                </div>
              </button>
            ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
