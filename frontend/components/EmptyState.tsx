import { cn } from '@/lib/utils';

interface EmptyStateProps {
    /** Main icon or illustration – pass a Lucide icon element */
    icon?: React.ReactNode;
    /** Big headline */
    title: string;
    /** Supporting description */
    description?: string;
    /** Optional CTA button */
    action?: React.ReactNode;
    className?: string;
}

/**
 * Generic empty-state placeholder.
 *
 * Usage:
 * ```tsx
 * <EmptyState
 *   icon={<Wallet className="w-10 h-10" />}
 *   title="No assets yet"
 *   description="Add your first asset to start tracking your wealth."
 *   action={<Button onClick={onAdd}>Add Asset</Button>}
 * />
 * ```
 */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center text-center gap-4 py-16 px-6',
                className,
            )}
        >
            {icon && (
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                    {icon}
                </div>
            )}
            <div className="flex flex-col gap-1.5">
                <p className="text-base font-semibold text-foreground">{title}</p>
                {description && (
                    <p className="text-sm text-muted-foreground max-w-xs">{description}</p>
                )}
            </div>
            {action && <div>{action}</div>}
        </div>
    );
}
