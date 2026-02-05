import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/components/LanguageProvider";
import { usePrivacy } from "@/components/PrivacyProvider";
import { LifeBuoy, AlertTriangle, CheckCircle2, ShieldCheck, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

// Simple Progress Component
function Progress({ value, className, indicatorClassName }: { value: number, className?: string, indicatorClassName?: string }) {
    return (
        <div className={cn("relative h-4 w-full overflow-hidden rounded-full bg-secondary", className)}>
            <div
                className={cn("h-full w-full flex-1 bg-primary transition-all", indicatorClassName)}
                style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
            />
        </div>
    );
}

interface EmergencyFundDialogProps {
    isOpen: boolean;
    onClose: () => void;
    currentCash?: number;
}

export function EmergencyFundDialog({ isOpen, onClose, currentCash = 0 }: EmergencyFundDialogProps) {
    const { t } = useLanguage();
    const { isPrivacyMode } = usePrivacy();

    const [cash, setCash] = useState(currentCash);
    const [monthlyExpense, setMonthlyExpense] = useState(30000); // Default placeholder
    const [targetMonths, setTargetMonths] = useState(6);

    // Sync cash if prop updates
    useEffect(() => {
        if (currentCash > 0 && cash === 0) {
            setCash(currentCash);
        }
    }, [currentCash]);

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
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={t('emergency_fund_check')}
            className="max-w-2xl"
        >
            <div className="flex flex-col md:flex-row gap-8 mt-4">
                {/* Left: Inputs */}
                <div className="w-full md:w-1/2 space-y-6">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        {t('emergency_fund_desc')}
                    </p>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="flex justify-between">
                                <span className="flex items-center gap-2"><Wallet className="w-4 h-4 text-primary" /> {t('liquid_assets')} (Cash)</span>
                            </Label>
                            <Input
                                type="number"
                                value={cash}
                                onChange={(e) => setCash(Number(e.target.value))}
                                className="bg-muted/50 font-mono text-lg"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="flex justify-between">
                                <span>{t('monthly_expenses')}</span>
                            </Label>
                            <Input
                                type="number"
                                value={monthlyExpense}
                                onChange={(e) => setMonthlyExpense(Number(e.target.value))}
                                className="bg-muted/50 font-mono text-lg"
                            />
                            <p className="text-xs text-muted-foreground">{t('monthly_expenses_hint')}</p>
                        </div>

                        <div className="space-y-2 pt-2">
                            <div className="flex justify-between text-sm">
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
                </div>

                {/* Right: Visualization */}
                <div className="w-full md:w-1/2 flex flex-col justify-center space-y-6 bg-muted/10 rounded-3xl p-6 border border-border">

                    <div className="text-center space-y-2">
                        <div className="text-sm text-muted-foreground uppercase tracking-widest">{t('survival_time')}</div>
                        <div className={cn("text-6xl font-bold tabular-nums tracking-tighter", status.color)}>
                            {survivalMonths.toFixed(1)}
                            <span className="text-xl font-medium ml-1 text-muted-foreground">{t('months')}</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Progress value={progress} className="h-4 rounded-full bg-muted" indicatorClassName={status.color.replace('text-', 'bg-')} />
                        <div className="flex justify-between text-xs text-muted-foreground px-1">
                            <span>0</span>
                            <span>{targetMonths / 2}</span>
                            <span>{targetMonths}+ {t('months')}</span>
                        </div>
                    </div>

                    <div className={cn("p-4 rounded-2xl flex items-center gap-4", status.bg)}>
                        <div className={cn("p-2 rounded-full bg-background/50", status.color)}>
                            <StatusIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <div className={cn("font-bold text-lg", status.color)}>{status.label}</div>
                            <div className="text-sm opacity-80">
                                {survivalMonths >= targetMonths
                                    ? t('emergency_fund_success')
                                    : t('emergency_fund_shortfall').replace('{amount}', formatCurrency((targetMonths * monthlyExpense) - cash))
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Dialog>
    );
}
