import * as React from 'react';
import { format, parse, isValid } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface DatePickerInputProps {
  value: string; // yyyy-MM-dd
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

function applyDateMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function parseDisplayDate(display: string): Date | null {
  if (display.length !== 10) return null;
  const parsed = parse(display, 'dd/MM/yyyy', new Date());
  return isValid(parsed) ? parsed : null;
}

export function DatePickerInput({
  value,
  onChange,
  placeholder = 'dd/mm/aaaa',
  disabled = false,
  className,
}: DatePickerInputProps) {
  const [displayValue, setDisplayValue] = React.useState('');
  const [open, setOpen] = React.useState(false);

  // Sync display from external value
  React.useEffect(() => {
    if (value) {
      try {
        const date = new Date(value + 'T00:00:00');
        if (isValid(date)) {
          setDisplayValue(format(date, 'dd/MM/yyyy'));
          return;
        }
      } catch {}
    }
    setDisplayValue('');
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = applyDateMask(e.target.value);
    setDisplayValue(masked);

    if (masked.length === 10) {
      const parsed = parseDisplayDate(masked);
      if (parsed) {
        onChange(format(parsed, 'yyyy-MM-dd'));
      }
    }
  };

  const handleBlur = () => {
    if (displayValue.length === 10) {
      const parsed = parseDisplayDate(displayValue);
      if (parsed) {
        onChange(format(parsed, 'yyyy-MM-dd'));
      } else {
        // Invalid date, reset
        if (value) {
          const date = new Date(value + 'T00:00:00');
          setDisplayValue(isValid(date) ? format(date, 'dd/MM/yyyy') : '');
        } else {
          setDisplayValue('');
        }
      }
    } else if (displayValue.length === 0) {
      onChange('');
    } else {
      // Incomplete, reset
      if (value) {
        const date = new Date(value + 'T00:00:00');
        setDisplayValue(isValid(date) ? format(date, 'dd/MM/yyyy') : '');
      } else {
        setDisplayValue('');
      }
    }
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      onChange(format(date, 'yyyy-MM-dd'));
      setDisplayValue(format(date, 'dd/MM/yyyy'));
    } else {
      onChange('');
      setDisplayValue('');
    }
    setOpen(false);
  };

  const selectedDate = value ? (() => {
    try {
      const d = new Date(value + 'T00:00:00');
      return isValid(d) ? d : undefined;
    } catch {
      return undefined;
    }
  })() : undefined;

  return (
    <div className={cn('flex gap-1', className)}>
      <Input
        value={displayValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1"
        maxLength={10}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={disabled}
            className="shrink-0"
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleCalendarSelect}
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
