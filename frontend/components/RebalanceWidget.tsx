'use client';

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog } from '@/components/ui/dialog';
import { RefreshCcw, ArrowRight, Settings2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

import { useLanguage } from "@/components/LanguageProvider";
import { fetchRebalanceData, updateSetting } from '@/lib/api';

export function RebalanceWidget() {
    const { t } = useLanguage();
    const [data, setData] = useState<any>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [targets, setTargets] = useState<Record<string, number>>({});

    // ... (fetch logic same) ...
    const fetchData = async () => {
        try {
            const json = await fetchRebalanceData();
            setData(json);
            setTargets(json.targets || {});
        } catch (e) {
            // Error fetching rebalance data
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleSaveTargets = async () => {
        try {
            await updateSetting('target_allocation', JSON.stringify(targets));
            setIsSettingsOpen(false);
            fetchData();
        } catch (e) { /* Error saving targets */ }
    };

    if (!data) return null;

    const categories = ['Fluid', 'Stock', 'Crypto'];

    return (
        <div className="bg-card p-6 rounded-3xl border border-border shadow-sm space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <RefreshCcw className="w-5 h-5 text-primary" />
                    {t('rebalancing')}
                </h2>
                <Button variant="ghost" className="h-8 px-3 text-xs" onClick={() => setIsSettingsOpen(true)}>
                    <Settings2 className="w-4 h-4 mr-2" />
                    {t('set_targets')}
                </Button>
            </div>

            <div className="space-y-6">
                {categories.map(cat => {
                    const currentValAbs = data.current_allocation?.[cat] || 0;
                    const totalVal = data.total_value || 1; // Avoid division by zero
                    const currentPct = (currentValAbs / totalVal) * 100;
                    const targetVal = targets[cat] || 0;

                    // Color Logic
                    let colorClass = 'bg-gray-500';
                    if (cat === 'Fluid') colorClass = 'bg-[var(--color-fluid)]';
                    else if (cat === 'Stock') colorClass = 'bg-[var(--color-stock)]';
                    else if (cat === 'Crypto') colorClass = 'bg-[var(--color-crypto)]';

                    return (
                        <div key={cat} className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="font-medium flex items-center gap-2">
                                    <div className={cn("w-3 h-3 rounded-full", colorClass)} />
                                    {t(cat as any) || cat}
                                </span>
                                <div className="text-muted-foreground text-xs">
                                    {t('target')}: <span className="font-bold text-foreground">{targetVal}%</span>
                                    <span className="mx-2">|</span>
                                    {t('current')}: <span className={cn("font-bold", Math.abs(currentPct - targetVal) > 5 ? "text-amber-500" : "text-foreground")}>{currentPct.toFixed(1)}%</span>
                                </div>
                            </div>

                            {/* Bullet Chart / Progress Bar */}
                            <div className="h-4 w-full rounded-full bg-muted relative overflow-hidden">
                                {/* Target Marker */}
                                <div
                                    className="absolute top-0 bottom-0 w-1 bg-foreground/50 z-20"
                                    style={{ left: `${Math.min(targetVal, 100)}%` }}
                                    title={`${t('target')}: ${targetVal}%`}
                                />
                                {/* Current Value Bar */}
                                <div
                                    className={cn("h-full rounded-full transition-all duration-500", colorClass)}
                                    style={{ width: `${Math.min(currentPct, 100)}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>



            {/* Settings Dialog */}
            <Dialog
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                title={t('set_targets')}
            >
                <div className="space-y-4 py-4">
                    <div className="text-sm text-muted-foreground mb-4">
                        {t('define_allocation_desc')}
                    </div>
                    {categories.map(cat => (
                        <div key={cat} className="flex items-center gap-4">
                            <Label className="w-24">{t(cat as any) || cat}</Label>
                            <Input
                                type="number"
                                value={targets[cat] || ''}
                                onChange={(e) => setTargets({ ...targets, [cat]: parseFloat(e.target.value) })}
                                className="flex-1"
                                placeholder="0"
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                        </div>
                    ))}
                    <div className="flex justify-end pt-2 text-sm font-bold">
                        {t('total')}: {(targets['Fluid'] || 0) + (targets['Stock'] || 0) + (targets['Crypto'] || 0)}%
                    </div>
                </div>
                <div className="flex justify-end pt-4 border-t border-border">
                    <Button onClick={handleSaveTargets}>{t('save')}</Button>
                </div>
            </Dialog>
        </div>
    );
}

function Check({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}
