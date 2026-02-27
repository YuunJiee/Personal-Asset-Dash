'use client';

import { createContext, useCallback, useContext, useRef, useState, useEffect } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ────────────────────────────────────────────────────
//  Types
// ────────────────────────────────────────────────────

export type ToastVariant = 'success' | 'error' | 'info';

export interface Toast {
    id: number;
    message: string;
    variant: ToastVariant;
}

interface ToastContextValue {
    toast: (message: string, variant?: ToastVariant) => void;
}

// ────────────────────────────────────────────────────
//  Context
// ────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
    return useContext(ToastContext);
}

// ────────────────────────────────────────────────────
//  Single toast item
// ────────────────────────────────────────────────────

const ICON: Record<ToastVariant, React.ReactNode> = {
    success: <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />,
    error: <XCircle className="w-4 h-4 shrink-0 text-red-500" />,
    info: <Info className="w-4 h-4 shrink-0 text-blue-500" />,
};

const BORDER: Record<ToastVariant, string> = {
    success: 'border-emerald-500/30',
    error: 'border-red-500/30',
    info: 'border-blue-500/30',
};

function ToastItem({ item, onDismiss }: { item: Toast; onDismiss: (id: number) => void }) {
    const [visible, setVisible] = useState(false);

    // Fade-in on mount
    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 10);
        return () => clearTimeout(t);
    }, []);

    const dismiss = useCallback(() => {
        setVisible(false);
        setTimeout(() => onDismiss(item.id), 250);
    }, [item.id, onDismiss]);

    // Auto-dismiss after 3.5 s
    useEffect(() => {
        const t = setTimeout(dismiss, 3500);
        return () => clearTimeout(t);
    }, [dismiss]);

    return (
        <div
            role="status"
            aria-live="polite"
            className={cn(
                'flex items-start gap-3 w-full max-w-sm rounded-2xl border px-4 py-3',
                'bg-card/95 backdrop-blur shadow-lg text-sm text-foreground',
                'transition-all duration-250',
                BORDER[item.variant],
                visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
            )}
        >
            {ICON[item.variant]}
            <span className="flex-1 leading-snug">{item.message}</span>
            <button
                onClick={dismiss}
                aria-label="Dismiss"
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}

// ────────────────────────────────────────────────────
//  Provider + Toaster container
// ────────────────────────────────────────────────────

let _counter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const idRef = useRef(0);

    const toast = useCallback((message: string, variant: ToastVariant = 'info') => {
        const id = ++idRef.current + _counter++;
        setToasts(prev => [...prev, { id, message, variant }]);
    }, []);

    const dismiss = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}

            {/* Fixed overlay — bottom-right on desktop, bottom-center on mobile */}
            <div
                aria-label="Notifications"
                className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-[9999] flex flex-col gap-2 items-end pointer-events-none"
            >
                {toasts.map(item => (
                    <div key={item.id} className="pointer-events-auto w-full max-w-sm">
                        <ToastItem item={item} onDismiss={dismiss} />
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
