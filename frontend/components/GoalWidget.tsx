'use client';

import { useState, useEffect } from 'react';
import { Plus, Target, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLanguage } from "@/components/LanguageProvider";

export function GoalWidget({ dashboardData, refreshTrigger, onEditGoal }: { dashboardData: any, refreshTrigger: number, onEditGoal: (goal: any) => void }) {
    const { t } = useLanguage();
    const [goals, setGoals] = useState<any[]>([]);

    const fetchGoals = async () => {
        try {
            const res = await fetch('http://localhost:8000/api/goals/');
            if (res.ok) setGoals(await res.json());
        } catch (e) {
            console.error(e);
        }
    };

    // Fetch Forecast
    const [forecasts, setForecasts] = useState<any>({});
    useEffect(() => {
        fetch('http://localhost:8000/api/stats/forecast')
            .then(res => res.json())
            .then(data => {
                // Map forecasts by goal_id
                const map: any = {};
                data.forecasts.forEach((f: any) => map[f.goal_id] = f);
                setForecasts(map);
            })
            .catch(console.error);
    }, [refreshTrigger]);

    useEffect(() => {
        fetchGoals();
    }, [refreshTrigger]);

    const netWorth = dashboardData?.net_worth || 0;

    const [startDay, setStartDay] = useState(1);

    useEffect(() => {
        fetch('http://localhost:8000/api/settings/budget_start_day')
            .then(res => res.json())
            .then(data => setStartDay(parseInt(data.value) || 1))
            .catch(() => setStartDay(1));
    }, [refreshTrigger]);

    // Calculate Budget Window
    const today = new Date();
    let windowStart = new Date(today.getFullYear(), today.getMonth(), startDay);
    let windowEnd = new Date(today.getFullYear(), today.getMonth() + 1, startDay);

    // If today is before start day (e.g. today is 5th, start is 15th), shift window back
    if (today.getDate() < startDay) {
        windowStart = new Date(today.getFullYear(), today.getMonth() - 1, startDay);
        windowEnd = new Date(today.getFullYear(), today.getMonth(), startDay);
    }

    let monthlyOutflowRaw = 0;
    dashboardData?.assets?.forEach((asset: any) => {
        if (asset.include_in_net_worth === false) return;

        if (asset.category === 'Liabilities') {
            asset.transactions.forEach((t: any) => {
                if (t.is_transfer) return;
                const d = new Date(t.date);
                if (d >= windowStart && d < windowEnd && t.amount > 0) {
                    const price = (t.buy_price > 0 ? t.buy_price : (asset.current_price > 0 ? asset.current_price : 1));
                    monthlyOutflowRaw += t.amount * price;
                }
            });
        } else {
            asset.transactions.forEach((t: any) => {
                if (t.is_transfer) return;
                const d = new Date(t.date);
                if (d >= windowStart && d < windowEnd && t.amount < 0) {
                    const price = (t.buy_price > 0 ? t.buy_price : (asset.current_price > 0 ? asset.current_price : 1));
                    monthlyOutflowRaw += Math.abs(t.amount) * price;
                }
            });
        }
    });

    if (goals.length === 0) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {goals.map((goal) => {
                if (goal.goal_type === 'NET_WORTH') {
                    const progress = Math.min((netWorth / goal.target_amount) * 100, 100);
                    const forecast = forecasts[goal.id];

                    return (
                        <div
                            key={goal.id}
                            onClick={() => onEditGoal(goal)}
                            className="bg-card p-6 rounded-3xl border border-border shadow-sm flex flex-col justify-between relative group cursor-pointer hover:shadow-md transition-shadow"
                        >

                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{goal.name} {t('net_worth_suffix')}</h3>
                                    <div className="text-2xl font-bold mt-1 text-foreground flex items-end gap-2">
                                        {((progress)).toFixed(1)}% <span className="text-sm font-normal text-muted-foreground mb-1">{t('goal_complete')}</span>
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
                                    {/* Milestones */}
                                    {[25, 50, 75].map(m => (
                                        <div
                                            key={m}
                                            className="absolute top-0 bottom-0 w-0.5 bg-background/50 z-10"
                                            style={{ left: `${m}%` }}
                                            title={`${m}% Milestone`}
                                        />
                                    ))}

                                    <div
                                        className="h-full bg-primary transition-all duration-1000 ease-out"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>${new Intl.NumberFormat('en-US', { notation: "compact" }).format(netWorth)}</span>
                                    <span>{t('goal_target')}: ${new Intl.NumberFormat('en-US', { notation: "compact" }).format(goal.target_amount)}</span>
                                </div>
                            </div>
                        </div>
                    );
                }

                if (goal.goal_type === 'MONTHLY_SPENDING') {
                    // Smart Budgeting Logic
                    const totalDays = Math.ceil((windowEnd.getTime() - windowStart.getTime()) / (1000 * 3600 * 24));
                    const daysPassed = Math.floor((new Date().getTime() - windowStart.getTime()) / (1000 * 3600 * 24));
                    const daysRemaining = totalDays - daysPassed;
                    const timePercentage = (daysPassed / totalDays) * 100;

                    const monthlyOutflow = Math.abs(monthlyOutflowRaw); // Ensure positive
                    const percentage = (monthlyOutflow / goal.target_amount) * 100;
                    const remaining = goal.target_amount - monthlyOutflow;

                    // Daily Allowance
                    const dailyAllowance = daysRemaining > 0 ? Math.max(0, remaining / daysRemaining) : 0;

                    // Pacing Color Logic
                    let colorClass = "bg-primary";
                    let pacingStatus = t('on_track');

                    if (percentage > 100) {
                        colorClass = "bg-red-500";
                        pacingStatus = t('over_budget');
                    } else if (percentage > timePercentage + 5) {
                        // Spent more than time passed (+5% buffer)
                        colorClass = "bg-amber-500";
                        pacingStatus = t('pacing_fast');
                    } else if (percentage < timePercentage - 5) {
                        // Spent less than time passed
                        colorClass = "bg-emerald-500";
                        pacingStatus = t('under_budget');
                    }

                    return (
                        <div
                            key={goal.id}
                            onClick={() => onEditGoal(goal)}
                            className="bg-card p-6 rounded-3xl border border-border shadow-sm flex flex-col justify-between relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                        >
                            {/* Pacing Indicator Background (Subtle) */}
                            <div className={cn(
                                "absolute top-0 right-0 p-2 text-xs font-bold uppercase tracking-wider rounded-bl-xl",
                                pacingStatus === t('over_budget') ? "bg-red-100 text-red-700" :
                                    pacingStatus === t('pacing_fast') ? "bg-amber-100 text-amber-700" :
                                        pacingStatus === t('under_budget') ? "bg-emerald-100 text-emerald-700" :
                                            "bg-muted text-muted-foreground"
                            )}>
                                {pacingStatus}
                            </div>

                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                        {goal.name} {t('budget_suffix')}
                                    </h3>
                                    <div className={cn("text-2xl font-bold mt-1", remaining < 0 ? "text-red-500" : "text-foreground")}>
                                        {remaining >= 0
                                            ? `$${remaining.toLocaleString()} ${t('budget_left')}`
                                            : `$${Math.abs(remaining).toLocaleString()} ${t('budget_over')}`
                                        }
                                    </div>
                                    {remaining > 0 && (
                                        <div className="text-xs text-muted-foreground mt-1 font-medium">
                                            {t('daily_allowance_desc').replace('${amount}', Math.round(dailyAllowance).toLocaleString()).replace('{days}', daysRemaining.toString())}
                                        </div>
                                    )}
                                </div>
                                <div className={cn("p-2 rounded-full mt-6", percentage > 100 ? "bg-red-100 dark:bg-red-900/30" : "bg-primary/10")}>
                                    <AlertCircle className={cn("w-5 h-5", percentage > 100 ? "text-red-600 dark:text-red-400" : "text-primary")} />
                                </div>
                            </div>

                            <div className="space-y-4">
                                {/* Budget Bar */}
                                <div className="h-4 w-full bg-muted rounded-full overflow-hidden flex relative">
                                    {/* Time Marker (User requested visual comparison) */}
                                    <div
                                        className="absolute top-0 bottom-0 w-0.5 bg-black/20 dark:bg-white/30 z-10"
                                        style={{ left: `${Math.min(timePercentage, 100)}%` }}
                                        title={`Today (${Math.round(timePercentage)}%)`}
                                    />
                                    <div
                                        className={cn("h-full transition-all duration-1000 ease-out", colorClass)}
                                        style={{ width: `${Math.min(percentage, 100)}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>{t('spent')}: ${new Intl.NumberFormat('en-US', { notation: "compact" }).format(monthlyOutflow)}</span>
                                    <span>{t('limit')}: ${new Intl.NumberFormat('en-US', { notation: "compact" }).format(goal.target_amount)}</span>
                                </div>
                            </div>
                        </div>
                    );
                }
                return null;
            })}
        </div>
    );
}
