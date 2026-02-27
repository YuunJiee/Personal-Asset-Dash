'use client';

import { cn } from '@/lib/utils';
import type { CSSProperties } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/components/LanguageProvider';

interface SkeletonProps {
    className?: string;
    style?: CSSProperties;
}

/** A shimmer-pulse placeholder for loading states. */
export function Skeleton({ className }: SkeletonProps) {
    return (
        <div
            aria-hidden="true"
            className={cn(
                'animate-pulse rounded-xl bg-muted/60',
                className,
            )}
        />
    );
}

/** Pre-composed skeleton for a single stat card (header value + label). */
export function StatCardSkeleton() {
    return (
        <div className="rounded-3xl border border-border bg-card p-5 flex flex-col gap-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-3 w-20" />
        </div>
    );
}

/** Pre-composed skeleton for a chart card. */
export function ChartSkeleton({ height = 220 }: { height?: number }) {
    return (
        <div className="rounded-3xl border border-border bg-card p-5 flex flex-col gap-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="w-full" style={{ height }} />
        </div>
    );
}

/** Pre-composed skeleton for an asset row in a list. */
export function AssetRowSkeleton() {
    return (
        <div className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
            <div className="flex-1 flex flex-col gap-1.5">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-4 w-20" />
        </div>
    );
}

/** Pre-composed skeleton for a page header (icon square + title + subtitle). */
export function PageHeaderSkeleton() {
    return (
        <div className="flex items-center gap-3 mb-8">
            <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
            <div className="flex flex-col gap-2">
                <Skeleton className="h-7 w-44" />
                <Skeleton className="h-4 w-32" />
            </div>
        </div>
    );
}

/** Pre-composed skeleton for a table data row (date / name / type / amount). */
export function TableRowSkeleton() {
    return (
        <div className="flex items-center gap-4 px-4 py-3.5 border-b border-border/50 last:border-b-0">
            <Skeleton className="h-3.5 w-24 shrink-0" />
            <div className="flex-1 flex flex-col gap-1.5">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full shrink-0" />
            <Skeleton className="h-3.5 w-20 shrink-0" />
        </div>
    );
}

/** Pre-composed skeleton for a budget / income card row. */
export function BudgetRowSkeleton() {
    return (
        <div className="flex items-center gap-4 p-4 border-b border-border/50 last:border-b-0">
            <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
            <div className="flex-1 flex flex-col gap-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-2.5 w-full max-w-xs rounded-full" />
            </div>
            <Skeleton className="h-4 w-20 shrink-0" />
        </div>
    );
}

/**
 * Full-page error state shown when a SWR fetch fails.
 *
 * Usage:
 * ```tsx
 * const { isError, refresh } = useDashboard();
 * if (isError) return <PageError onRetry={refresh} />;
 * ```
 */
export function PageError({
    title,
    description,
    onRetry,
}: {
    title?: string;
    description?: string;
    onRetry?: () => void;
}) {
    const { t } = useLanguage();
    return (
        <div className="flex flex-col items-center justify-center py-24 px-6 gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive">
                <AlertTriangle className="w-7 h-7" />
            </div>
            <div className="flex flex-col gap-1.5">
                <p className="font-semibold text-foreground">{title ?? t('load_error')}</p>
                <p className="text-sm text-muted-foreground max-w-xs">{description ?? t('load_error_desc')}</p>
            </div>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="text-sm text-primary underline underline-offset-2 hover:opacity-80 transition-opacity"
                >
                    {t('retry')}
                </button>
            )}
        </div>
    );
}
