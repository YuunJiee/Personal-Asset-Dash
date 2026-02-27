import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog"; // Using our custom Dialog wrapper
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { useLanguage } from "@/components/LanguageProvider";
import { usePrivacy } from "@/components/PrivacyProvider";
import { Calculator, DollarSign, TrendingUp, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SimulatorDataPoint } from "@/lib/types";

interface WealthSimulatorDialogProps {
    isOpen: boolean;
    onClose: () => void;
    currentNetWorth?: number;
}

// Simple Custom Slider
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


export function WealthSimulatorDialog({ isOpen, onClose, currentNetWorth = 0 }: WealthSimulatorDialogProps) {
    const { t } = useLanguage();
    const { isPrivacyMode } = usePrivacy();

    const [initialAmount, setInitialAmount] = useState(currentNetWorth);
    const [metric, setMetric] = useState({
        monthlyContribution: 10000,
        annualReturn: 7, // 7%
        years: 10
    });

    const [data, setData] = useState<SimulatorDataPoint[]>([]);
    const [finalAmount, setFinalAmount] = useState(0);
    const [totalPrincipal, setTotalPrincipal] = useState(0);
    const [totalInterest, setTotalInterest] = useState(0);

    // Sync initial amount if currentNetWorth changes (optional, maybe only on first open?)
    useEffect(() => {
        if (currentNetWorth > 0 && initialAmount === 0) {
            setInitialAmount(currentNetWorth);
        }
    }, [currentNetWorth]);

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

        // Validations
        if (years > 50) return; // Cap at 50 years to avoid crash

        for (let i = 0; i <= months; i++) {
            // Record data point every year (or every month if short duration)
            if (i % 12 === 0) {
                chartData.push({
                    year: `Year ${i / 12}`,
                    balance: Math.round(balance),
                    principal: Math.round(principal),
                    interest: Math.round(balance - principal)
                });
            }

            // Apply interest
            balance = balance * (1 + monthlyRate) + monthlyContribution;
            principal += monthlyContribution;
        }

        setData(chartData);
        setFinalAmount(balance);
        setTotalPrincipal(principal);
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
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={t('wealth_simulator')}
            className="max-w-5xl"
        >
            <div className="flex flex-col lg:flex-row gap-8 mt-4">
                {/* Left: Controls */}
                <div className="w-full lg:w-1/3 space-y-6">

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="flex justify-between">
                                <span className="flex items-center gap-2"><DollarSign className="w-4 h-4" /> {t('initial_amount')}</span>
                                <span className={cn("font-mono text-primary font-bold", isPrivacyMode ? "blur-sm" : "")}>${initialAmount.toLocaleString()}</span>
                            </Label>
                            <Input
                                type="number"
                                value={initialAmount}
                                onChange={(e) => setInitialAmount(Number(e.target.value))}
                                className="bg-muted/50"
                            />
                        </div>

                        <div className="space-y-4 pt-4 border-t border-border">
                            <Label className="flex justify-between">
                                <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {t('years_to_grow')}</span>
                                <span className="font-mono text-primary font-bold">{metric.years} Years</span>
                            </Label>
                            <SimpleSlider
                                value={metric.years}
                                min={1} max={50} step={1}
                                onChange={(v) => handleMetricChange('years', v)}
                                className="py-4"
                            />
                        </div>

                        <div className="space-y-4 pt-4 border-t border-border">
                            <Label className="flex justify-between">
                                <span className="flex items-center gap-2"><DollarSign className="w-4 h-4" /> {t('monthly_contribution')}</span>
                                <span className="font-mono text-primary font-bold">${metric.monthlyContribution.toLocaleString()}</span>
                            </Label>
                            <SimpleSlider
                                value={metric.monthlyContribution}
                                min={0} max={100000} step={1000}
                                onChange={(v) => handleMetricChange('monthlyContribution', v)}
                                className="py-4"
                            />
                        </div>

                        <div className="space-y-4 pt-4 border-t border-border">
                            <Label className="flex justify-between">
                                <span className="flex items-center gap-2"><TrendingUp className="w-4 h-4" /> {t('annual_return')} (%)</span>
                                <span className="font-mono text-primary font-bold">{metric.annualReturn}%</span>
                            </Label>
                            <SimpleSlider
                                value={metric.annualReturn}
                                min={0} max={20} step={0.5}
                                onChange={(v) => handleMetricChange('annualReturn', v)}
                                className="py-4"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground px-1">
                                <span>Conservative (3%)</span>
                                <span>Aggressive (10%)</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Visualization */}
                <div className="w-full lg:w-2/3 flex flex-col bg-muted/10 rounded-3xl p-6 border border-border">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
                            <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">{t('total_projected_wealth')}</div>
                            <div className="text-xl md:text-2xl font-bold text-primary truncate">{formatCurrency(finalAmount)}</div>
                        </div>
                        <div className="p-4 rounded-2xl bg-card border border-border opacity-80">
                            <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">{t('total_principal')}</div>
                            <div className="text-lg font-semibold truncate">{formatCurrency(totalPrincipal)}</div>
                        </div>
                        <div className="p-4 rounded-2xl bg-card border border-border opacity-80">
                            <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">{t('total_interest')}</div>
                            <div className="text-lg font-semibold text-emerald-500 truncate">+{formatCurrency(totalInterest)}</div>
                        </div>
                    </div>

                    <div className="flex-1 min-h-[300px] w-full bg-card rounded-2xl p-2 border border-border shadow-inner">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                                <XAxis
                                    dataKey="year"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                                    minTickGap={30}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                                    tickFormatter={(val) => `$${val / 1000}k`}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', backgroundColor: 'var(--card)', color: 'var(--foreground)' }}
                                    formatter={(value: any) => [`$${Number(value).toLocaleString()}`, '']}
                                    labelStyle={{ color: 'var(--muted-foreground)' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="balance"
                                    stroke="var(--primary)"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorBalance)"
                                    name="Balance"
                                    animationDuration={1000}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="principal"
                                    stroke="var(--muted-foreground)"
                                    strokeWidth={1}
                                    strokeDasharray="3 3"
                                    fillOpacity={0}
                                    name="Principal"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 text-center text-xs text-muted-foreground italic">
                        * {t('simulator_disclaimer')}
                    </div>
                </div>
            </div>
        </Dialog>
    );
}
