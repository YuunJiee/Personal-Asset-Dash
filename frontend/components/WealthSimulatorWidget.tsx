'use client';

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { useLanguage } from "@/components/LanguageProvider";
import { usePrivacy } from "@/components/PrivacyProvider";
import { Calculator, DollarSign, TrendingUp, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchSetting, updateSetting } from "@/lib/api";
import type { SimulatorDataPoint } from "@/lib/types";

interface WealthSimulatorWidgetProps {
    currentNetWorth?: number;
}

function SimpleSlider({ value, min, max, step, onChange, className }: { value: number, min: number, max: number, step: number, onChange: (val: number) => void, className?: string }) {
    return (
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className={cn("w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary", className)}
        />
    );
}

export function WealthSimulatorWidget({ currentNetWorth = 0 }: WealthSimulatorWidgetProps) {
    const { t } = useLanguage();
    const { isPrivacyMode } = usePrivacy();

    const [initialAmount, setInitialAmount] = useState(currentNetWorth);
    const [metric, setMetric] = useState({
        monthlyContribution: 10000,
        annualReturn: 7,
        years: 10
    });

    const [data, setData] = useState<SimulatorDataPoint[]>([]);
    const [finalAmount, setFinalAmount] = useState(0);
    const [totalInterest, setTotalInterest] = useState(0);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [hasLoadedSettings, setHasLoadedSettings] = useState(false);

    // Sync with currentNetWorth prop only on first mount if no saved settings
    useEffect(() => {
        if (currentNetWorth > 0 && !hasLoadedSettings) {
            setInitialAmount(currentNetWorth);
        }
    }, [currentNetWorth, hasLoadedSettings]);

    // Load settings from backend
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const [monthly, returnRate, years, initial] = await Promise.all([
                    fetchSetting('wealth_simulator_monthly_contribution'),
                    fetchSetting('wealth_simulator_annual_return'),
                    fetchSetting('wealth_simulator_years'),
                    fetchSetting('wealth_simulator_initial_amount')
                ]);

                setMetric({
                    monthlyContribution: monthly.value ? Number(monthly.value) : 10000,
                    annualReturn: returnRate.value ? Number(returnRate.value) : 7,
                    years: years.value ? Number(years.value) : 10
                });

                // Always load saved initial amount if it exists
                if (initial.value) {
                    setInitialAmount(Number(initial.value));
                }

                setHasLoadedSettings(true);

                setIsInitialLoad(false);
            } catch (error) {
                console.error('Failed to load wealth simulator settings', error);
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
                    updateSetting('wealth_simulator_monthly_contribution', String(metric.monthlyContribution)),
                    updateSetting('wealth_simulator_annual_return', String(metric.annualReturn)),
                    updateSetting('wealth_simulator_years', String(metric.years)),
                    updateSetting('wealth_simulator_initial_amount', String(initialAmount))
                ]);
            } catch (error) {
                console.error('Failed to save wealth simulator settings', error);
            }
        };

        const timeoutId = setTimeout(saveSettings, 500); // Debounce
        return () => clearTimeout(timeoutId);
    }, [metric, initialAmount, isInitialLoad]);

    useEffect(() => {
        calculateGrowth();
    }, [initialAmount, metric]);

    const calculateGrowth = () => {
        const { monthlyContribution, annualReturn, years } = metric;
        const monthlyRate = annualReturn / 100 / 12;
        const months = years * 12;

        let balance = initialAmount;
        let principal = initialAmount;
        const chartData = [];

        if (years > 50) return;

        for (let i = 0; i <= months; i++) {
            if (i % 12 === 0) {
                chartData.push({
                    year: `Y${i / 12}`,
                    balance: Math.round(balance),
                    principal: Math.round(principal),
                    interest: Math.round(balance - principal)
                });
            }
            balance = balance * (1 + monthlyRate) + monthlyContribution;
            principal += monthlyContribution;
        }

        setData(chartData);
        setFinalAmount(balance);
        setTotalInterest(balance - principal);
    };

    const handleMetricChange = (key: string, value: number) => {
        setMetric(prev => ({ ...prev, [key]: value }));
    };

    const formatCurrency = (val: number) => {
        if (isPrivacyMode) return '****';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
    };

    return (
        <div className="bg-card p-6 rounded-3xl border border-border shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-2xl">
                    <Calculator className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="font-bold text-lg">{t('wealth_simulator')}</h3>
                    <p className="text-sm text-muted-foreground">{t('wealth_simulator_desc')}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Controls */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label className="flex justify-between text-xs">
                            <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> {t('initial_amount')}</span>
                            <span className={cn("font-mono text-primary font-bold", isPrivacyMode ? "blur-sm" : "")}>${initialAmount.toLocaleString()}</span>
                        </Label>
                        <Input
                            type="number"
                            value={initialAmount}
                            onChange={(e) => setInitialAmount(Number(e.target.value))}
                            className="bg-muted/50 h-9"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="flex justify-between text-xs">
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {t('years_to_grow')}</span>
                            <span className="font-mono text-primary font-bold">{metric.years}y</span>
                        </Label>
                        <SimpleSlider value={metric.years} min={1} max={30} step={1} onChange={(v) => handleMetricChange('years', v)} />
                    </div>

                    <div className="space-y-2">
                        <Label className="flex justify-between text-xs">
                            <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> {t('monthly_contribution')}</span>
                            <span className="font-mono text-primary font-bold">${metric.monthlyContribution.toLocaleString()}</span>
                        </Label>
                        <SimpleSlider value={metric.monthlyContribution} min={0} max={100000} step={1000} onChange={(v) => handleMetricChange('monthlyContribution', v)} />
                    </div>

                    <div className="space-y-2">
                        <Label className="flex justify-between text-xs">
                            <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {t('annual_return')}</span>
                            <span className="font-mono text-primary font-bold">{metric.annualReturn}%</span>
                        </Label>
                        <SimpleSlider value={metric.annualReturn} min={0} max={20} step={0.5} onChange={(v) => handleMetricChange('annualReturn', v)} />
                    </div>
                </div>

                {/* Chart */}
                <div className="flex flex-col">
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="p-3 rounded-xl bg-muted/30 border border-border">
                            <div className="text-xs text-muted-foreground mb-1">{t('total_projected_wealth')}</div>
                            <div className="text-lg font-bold text-primary truncate">{formatCurrency(finalAmount)}</div>
                        </div>
                        <div className="p-3 rounded-xl bg-muted/30 border border-border">
                            <div className="text-xs text-muted-foreground mb-1">{t('total_interest')}</div>
                            <div className="text-lg font-bold text-emerald-500 truncate">+{formatCurrency(totalInterest)}</div>
                        </div>
                    </div>

                    <div className="flex-1 min-h-[200px] bg-muted/10 rounded-xl p-2 border border-border">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                                <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} tickFormatter={(val) => `$${val / 1000}k`} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', backgroundColor: 'var(--card)', color: 'var(--foreground)' }}
                                    formatter={(value: any) => [`$${Number(value).toLocaleString()}`, '']}
                                />
                                <Area type="monotone" dataKey="balance" stroke="var(--primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorBalance)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
