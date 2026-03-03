'use client';

import { forwardRef, ChangeEvent } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface MoneyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
    onChange?: (e: ChangeEvent<HTMLInputElement> & { target: { value: string } }) => void;
}

/** Format a raw numeric string with thousand separators, leaving decimal intact. */
function formatWithCommas(val: string): string {
    if (!val) return val;
    const isNeg = val.startsWith('-');
    const abs = isNeg ? val.slice(1) : val;
    const [integer, decimal] = abs.split('.');
    const formattedInt = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const result = decimal !== undefined ? `${formattedInt}.${decimal}` : formattedInt;
    return isNeg ? `-${result}` : result;
}

/**
 * MoneyInput — a numeric input that displays thousand separators (e.g. 1,000,000)
 * while providing the raw numeric string (no commas) to `onChange`.
 *
 * Compatible with the standard `e.target.value` pattern:
 *   <MoneyInput value={someStr} onChange={(e) => setSomeStr(e.target.value)} />
 *
 * Also works with number state:
 *   <MoneyInput value={someNumber} onChange={(e) => setSomeNumber(Number(e.target.value))} />
 */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
    ({ value, onChange, className, ...props }, ref) => {
        const rawStr = value !== undefined && value !== null ? String(value) : '';
        const displayValue = formatWithCommas(rawStr);

        const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
            // Strip commas from whatever the user typed
            const raw = e.target.value.replace(/,/g, '');
            // Allow: empty string, negative sign only, valid decimal numbers
            if (raw !== '' && raw !== '-' && !/^-?\d*\.?\d*$/.test(raw)) return;
            // Fire original onChange with the raw (comma-free) value
            onChange?.({ ...e, target: { ...e.target, value: raw } } as ChangeEvent<HTMLInputElement> & { target: { value: string } });
        };

        return (
            <Input
                {...props}
                ref={ref}
                type="text"
                inputMode="decimal"
                value={displayValue}
                onChange={handleChange}
                className={className}
            />
        );
    }
);

MoneyInput.displayName = 'MoneyInput';
