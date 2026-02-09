'use client';

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/components/LanguageProvider";
import { usePrivacy } from "@/components/PrivacyProvider";
import { LifeBuoy, AlertTriangle, CheckCircle2, ShieldCheck, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchSetting, updateSetting } from '@/lib/api';

function Progress({ value, className, indicatorClassName }: { value: number, className?: string, indicatorClassName?: string }) {
    return (
        <div className={cn("relative h-3 w-full overflow-hidden rounded-full bg-secondary", className)}>
            <div
                className={cn("h-full w-full flex-1 bg-primary transition-all", indicatorClassName)}
                style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
            />
        </div>
    );
}

interface EmergencyFundWidgetProps {
    currentCash?: number;
}

export function EmergencyFundWidget({ currentCash = 0 }: EmergencyFundWidgetProps) {
    const { t } = useLanguage();
    const { isPrivacyMode } = usePrivacy();

    const [cash, setCash] = useState(currentCash);
    const [monthlyExpense, setMonthlyExpense] = useState(30000);
    const [targetMonths, setTargetMonths] = useState(6);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [hasLoadedSettings, setHasLoadedSettings] = useState(false);

    // Sync with currentCash prop only on first mount if no saved settings
    useEffect(() => {
        if (currentCash > 0 && !hasLoadedSettings) {
            setCash(currentCash);
        }
    }, [currentCash, hasLoadedSettings]);

    // Load settings from backend
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const [expense, target, savedCash] = await Promise.all([
                    fetchSetting('emergency_fund_monthly_expense'),
                    fetchSetting('emergency_fund_target_months'),
                    fetchSetting('emergency_fund_cash')
                ]);

                if (expense.value) setMonthlyExpense(Number(expense.value));
                if (target.value) setTargetMonths(Number(target.value));

                // Always load saved cash if it exists
                if (savedCash.value) {
                    setCash(Number(savedCash.value));
                }

                setHasLoadedSettings(true);

                setIsInitialLoad(false);
            } catch (error) {
                console.error('Failed to load emergency fund settings', error);
                setHasLoadedSettings(true);
                setIsInitialLoad(false);
            }
        };
        loadSettings();
    }, []);

    // Save settings to backend when they change
    useEffect(() => {
        if (isInitialLoad) return; // Skip saving during initial load

        const saveSettings = async () => {
            try {
                await Promise.all([
                    updateSetting('emergency_fund_monthly_expense', String(monthlyExpense)),
                    updateSetting('emergency_fund_target_months', String(targetMonths)),
                    updateSetting('emergency_fund_cash', String(cash))
                ]);
            } catch (error) {
                console.error('Failed to save emergency fund settings', error);
            }
        };

        const timeoutId = setTimeout(saveSettings, 500); // Debounce
        return () => clearTimeout(timeoutId);
    }, [monthlyExpense, targetMonths, cash, isInitialLoad]);

    const survivalMonths = monthlyExpense > 0 ? cash / monthlyExpense : 0;
    const progress = Math.min((survivalMonths / targetMonths) * 100, 100);

    const getHealthStatus = () => {
        if (survivalMonths < 1) return { label: t('health_critical'), color: 'text-red-500', bg: 'bg-red-500/10', icon: AlertTriangle };
        if (survivalMonths < 3) return { label: t('health_warning'), color: 'text-orange-500', bg: 'bg-orange-500/10', icon: AlertTriangle };
        if (survivalMonths < 6) return { label: t('health_good'), color: 'text-blue-500', bg: 'bg-blue-500/10', icon: CheckCircle2 };
        return { label: t('health_excellent'), color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: ShieldCheck };
    };

    const status = getHealthStatus();
    const StatusIcon = status.icon;

    const formatCurrency = (val: number) => {
        if (isPrivacyMode) return '****';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
    };

    return (
        <div className="bg-card p-6 rounded-3xl border border-border shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 rounded-2xl">
                    <LifeBuoy className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="font-bold text-lg">{t('emergency_fund_check')}</h3>
                    <p className="text-sm text-muted-foreground">{t('emergency_fund_subtitle')}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Inputs */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-xs">
                            <Wallet className="w-3 h-3 text-primary" /> {t('liquid_assets')} (Cash)
                        </Label>
                        <Input
                            type="number"
                            value={cash}
                            onChange={(e) => setCash(Number(e.target.value))}
                            className="bg-muted/50 font-mono h-9"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs">{t('monthly_expenses')}</Label>
                        <Input
                            type="number"
                            value={monthlyExpense}
                            onChange={(e) => setMonthlyExpense(Number(e.target.value))}
                            className="bg-muted/50 font-mono h-9"
                        />
                        <p className="text-xs text-muted-foreground">{t('monthly_expenses_hint')}</p>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                            <span>{t('target_months')}</span>
                            <span className="font-bold text-primary">{targetMonths} {t('months')}</span>
                        </div>
                        <input
                            type="range"
                            min={3}
                            max={24}
                            step={1}
                            value={targetMonths}
                            onChange={(e) => setTargetMonths(parseFloat(e.target.value))}
                            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                    </div>
                </div>

                {/* Status */}
                <div className="flex flex-col justify-center space-y-4">
                    <div className="text-center space-y-1">
                        <div className="text-xs text-muted-foreground uppercase tracking-wider">{t('survival_time')}</div>
                        <div className={cn("text-5xl font-bold tabular-nums", status.color)}>
                            {survivalMonths.toFixed(1)}
                            <span className="text-lg font-medium ml-1 text-muted-foreground">{t('months')}</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Progress value={progress} className="h-3" indicatorClassName={status.color.replace('text-', 'bg-')} />
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>0</span>
                            <span>{targetMonths}+ {t('months')}</span>
                        </div>
                    </div>

                    <div className={cn("p-3 rounded-xl flex items-center gap-3", status.bg)}>
                        <div className={cn("p-2 rounded-full bg-background/50", status.color)}>
                            <StatusIcon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <div className={cn("font-bold", status.color)}>{status.label}</div>
                            <div className="text-xs opacity-80">
                                {survivalMonths >= targetMonths
                                    ? t('emergency_fund_success')
                                    : t('emergency_fund_shortfall').replace('{amount}', formatCurrency((targetMonths * monthlyExpense) - cash))
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
