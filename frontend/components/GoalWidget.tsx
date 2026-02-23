'use client';

import { useState, useEffect } from 'react';
import { Target, PieChart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from "@/components/LanguageProvider";
import { usePrivacy } from "@/components/PrivacyProvider";
import { fetchGoals, fetchForecast } from '@/lib/api';

// Parse allocation JSON from description
function parseAllocation(description?: string | null): Record<string, number> | null {
    if (!description) return null;
    try {
        const parsed = JSON.parse(description);
        if (typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch (_) { }
    return null;
}

export function GoalWidget({ dashboardData, refreshTrigger, onEditGoal }: {
    dashboardData: any;
    refreshTrigger: number;
    onEditGoal: (goal: any) => void;
}) {
    const { t } = useLanguage();
    const { isPrivacyMode } = usePrivacy();
    const [goals, setGoals] = useState<any[]>([]);
    const [forecasts, setForecasts] = useState<any>({});

    useEffect(() => {
        fetchGoals().then(setGoals).catch(() => { });
    }, [refreshTrigger]);

    useEffect(() => {
        fetchForecast()
            .then(data => {
                const map: any = {};
                data.forecasts.forEach((f: any) => { map[f.goal_id] = f; });
                setForecasts(map);
            })
            .catch(() => { });
    }, [refreshTrigger]);

    const netWorth = dashboardData?.net_worth || 0;
    const assets: any[] = dashboardData?.assets || [];

    // Total portfolio value (included assets only)
    const totalValue = assets
        .filter((a: any) => a.include_in_net_worth !== false)
        .reduce((s: number, a: any) => s + (a.value_twd || 0), 0);

    // Per-category value
    const categoryValue = (category: string) =>
        assets
            .filter((a: any) => a.include_in_net_worth !== false && a.category === category)
            .reduce((s: number, a: any) => s + (a.value_twd || 0), 0);

    const fmt = (n: number) =>
        isPrivacyMode ? '****' : `$${new Intl.NumberFormat('en-US', { notation: 'compact' }).format(n)}`;

    if (goals.length === 0) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {goals.map((goal) => {

                /* ── NET_WORTH ─────────────────────────────── */
                if (goal.goal_type === 'NET_WORTH') {
                    const progress = Math.min((netWorth / goal.target_amount) * 100, 100);
                    const forecast = forecasts[goal.id];

                    return (
                        <div
                            key={goal.id}
                            onClick={() => onEditGoal(goal)}
                            className="bg-card p-6 rounded-3xl border border-border shadow-sm flex flex-col justify-between cursor-pointer hover:shadow-md transition-shadow"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{goal.name}</h3>
                                    <div className="text-2xl font-bold mt-1 text-foreground flex items-end gap-2">
                                        {progress.toFixed(1)}%
                                        <span className="text-sm font-normal text-muted-foreground mb-1">{t('goal_complete')}</span>
                                    </div>
                                    {forecast && (
                                        <div className="text-xs text-emerald-600 font-medium mt-1">
                                            {t('predicted')}: {forecast.predicted_date}
                                        </div>
                                    )}
                                </div>
                                <div className="p-2 bg-primary/10 rounded-full">
                                    <Target className="w-5 h-5 text-primary" />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="h-4 w-full bg-muted rounded-full overflow-hidden relative">
                                    {[25, 50, 75].map(m => (
                                        <div key={m} className="absolute top-0 bottom-0 w-0.5 bg-background/50 z-10" style={{ left: `${m}%` }} />
                                    ))}
                                    <div className="h-full bg-primary transition-all duration-1000 ease-out" style={{ width: `${progress}%` }} />
                                </div>
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>{fmt(netWorth)}</span>
                                    <span>{t('goal_target')}: {fmt(goal.target_amount)}</span>
                                </div>
                            </div>
                        </div>
                    );
                }

                /* ── ASSET_ALLOCATION ──────────────────────── */
                if (goal.goal_type === 'ASSET_ALLOCATION') {
                    const allocation = parseAllocation(goal.description);
                    if (!allocation) return null;

                    const entries = Object.entries(allocation) as [string, number][];

                    // Overall balance: all within 5%?
                    const isBalanced = entries.every(([cat, tgt]) => {
                        const cur = totalValue > 0 ? (categoryValue(cat) / totalValue) * 100 : 0;
                        return Math.abs(cur - tgt) <= 5;
                    });

                    return (
                        <div
                            key={goal.id}
                            onClick={() => onEditGoal(goal)}
                            className="bg-card p-6 rounded-3xl border border-border shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                        >
                            {/* Header */}
                            <div className="flex justify-between items-start mb-5">
                                <div>
                                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{goal.name}</h3>
                                    <div className={cn(
                                        'inline-block mt-1 text-xs font-bold px-2 py-0.5 rounded-full',
                                        isBalanced ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                    )}>
                                        {isBalanced ? t('allocation_balanced') : t('allocation_off')}
                                    </div>
                                </div>
                                <div className="p-2 bg-primary/10 rounded-full">
                                    <PieChart className="w-5 h-5 text-primary" />
                                </div>
                            </div>

                            {/* Per-category rows */}
                            <div className="space-y-3">
                                {entries.map(([cat, targetPct]) => {
                                    const catValue = categoryValue(cat);
                                    const currentPct = totalValue > 0 ? (catValue / totalValue) * 100 : 0;
                                    const diff = currentPct - targetPct;

                                    const barColor =
                                        Math.abs(diff) <= 5 ? 'bg-emerald-500'
                                            : diff > 5 ? 'bg-amber-500'
                                                : 'bg-red-500';

                                    return (
                                        <div key={cat}>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="font-medium">{t(cat) || cat}</span>
                                                <span className="text-muted-foreground font-mono">
                                                    {isPrivacyMode ? '**%' : `${currentPct.toFixed(1)}%`}
                                                    <span className="text-muted-foreground/60"> / {targetPct}%</span>
                                                    {!isPrivacyMode && diff !== 0 && (
                                                        <span className={cn('ml-1.5', diff > 0 ? 'text-amber-500' : 'text-red-500')}>
                                                            ({diff > 0 ? '+' : ''}{diff.toFixed(1)}%)
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden relative">
                                                {/* Target marker */}
                                                <div
                                                    className="absolute top-0 bottom-0 w-0.5 bg-black/30 dark:bg-white/40 z-10"
                                                    style={{ left: `${Math.min(targetPct, 100)}%` }}
                                                />
                                                <div
                                                    className={cn('h-full transition-all duration-700', barColor)}
                                                    style={{ width: `${Math.min(currentPct, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                }

                return null;
            })}
        </div>
    );
}
