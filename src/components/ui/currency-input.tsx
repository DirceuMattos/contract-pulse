import * as React from 'react';
import { cn } from '@/lib/utils';

interface CurrencyInputProps {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  placeholder?: string;
  className?: string;
  prefix?: string;
  step?: number;
  min?: number;
  disabled?: boolean;
}

export function CurrencyInput({
  value,
  onChange,
  placeholder = 'R$ 0,00',
  className,
  prefix = 'R$',
  min = 0,
  disabled,
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = React.useState('');
  const [isFocused, setIsFocused] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const formatForDisplay = (num: number | undefined): string => {
    if (num === undefined || num === null || isNaN(num)) return '';
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  React.useEffect(() => {
    if (!isFocused) {
      setDisplayValue(formatForDisplay(value));
    }
  }, [value, isFocused]);

  const parseInputValue = (str: string): number | undefined => {
    if (!str || str.trim() === '') return undefined;
    const normalized = str.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(normalized);
    if (isNaN(num)) return undefined;
    if (min !== undefined && num < min) return min;
    return num;
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    if (value !== undefined && value !== null && !isNaN(value)) {
      const editValue = value.toString().replace('.', ',');
      setDisplayValue(editValue);
      // Select all text after state update so user can type over
      requestAnimationFrame(() => {
        e.target.select();
      });
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const parsed = parseInputValue(displayValue);
    onChange(parsed);
    setDisplayValue(formatForDisplay(parsed));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const cleaned = raw.replace(/[^0-9,.\-]/g, '');
    setDisplayValue(cleaned);
  };

  return (
    <div className="relative">
      {prefix && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
          {prefix}
        </span>
      )}
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          prefix ? 'pl-10' : '',
          className,
        )}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
}
