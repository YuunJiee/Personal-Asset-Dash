'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/components/LanguageProvider';

export interface Option {
    value: string;
    label: string;
}

interface CustomSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: Option[];
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

export function CustomSelect({ value, onChange, options, placeholder, disabled = false, className }: CustomSelectProps) {
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.value === value);
    const finalPlaceholder = placeholder || t('select_placeholder');

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    return (
        <div className={cn("relative w-full", className)} ref={containerRef}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={cn(
                    "flex h-11 w-full items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input disabled:cursor-not-allowed disabled:opacity-50 transition-all",
                    isOpen && "ring-2 ring-primary/20 border-primary",
                    disabled && "cursor-not-allowed opacity-50"
                )}
                disabled={disabled}
            >
                <span className={cn("block truncate", !selectedOption && "text-muted-foreground")}>
                    {selectedOption ? selectedOption.label : finalPlaceholder}
                </span>
                <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform duration-200", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-2 max-h-60 w-full overflow-auto rounded-xl border border-border bg-card text-card-foreground shadow-lg animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95">
                    <div className="p-1">
                        {options.map((option) => (
                            <div
                                key={option.value}
                                onClick={() => handleSelect(option.value)}
                                className={cn(
                                    "relative flex w-full cursor-pointer select-none items-center rounded-lg py-2.5 pl-3 pr-8 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                                    option.value === value && "bg-accent/50 font-medium text-accent-foreground"
                                )}
                            >
                                <span className="block truncate">{option.label}</span>
                                {option.value === value && (
                                    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                                        <Check className="h-4 w-4 text-primary" />
                                    </span>
                                )}
                            </div>
                        ))}
                        {options.length === 0 && (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                                No options available
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
