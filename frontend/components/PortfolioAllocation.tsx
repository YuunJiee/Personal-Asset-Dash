"use client";

import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePrivacy } from "@/components/PrivacyProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { ChartPie, Layers } from 'lucide-react'; // Layers for platform?
import { cn } from "@/lib/utils";

// Morandi Color Palette (matching AssetAllocationWidget)
const COLORS = ['#A4C3B2', '#E0D5C3', '#D4A59A', '#8199A6', '#8ABF9E', '#C5AFA5', '#E6B89C', '#F4E4BA'];

interface PortfolioAllocationProps {
    assets: any[];
    title?: string;
    showToggle?: boolean;
    defaultTab?: 'Asset' | 'Platform';
}

export function PortfolioAllocation({ assets, title, showToggle = true, defaultTab = 'Asset' }: PortfolioAllocationProps) {
    const { t } = useLanguage();
    const { isPrivacyMode } = usePrivacy();
    const [viewMode, setViewMode] = useState<'Asset' | 'Platform'>(defaultTab);

    // If toggle is hidden, force the default tab always? 
    // Or just start with it. Let's rely on internal state but hide buttons if showToggle is false.

    const data = useMemo(() => {
        const map = new Map<string, number>();

        assets.forEach(asset => {
            const val = Number(asset.value_twd) || 0;
            if (val <= 0) return;

            let key = "Other";

            if (viewMode === 'Asset') {
                key = asset.ticker || asset.name;
            } else {
                // Platform Logic
                if (asset.connection) {
                    key = asset.connection.name;
                    // If connection name is custom, we might want to map it to a "Type" for color?
                    // But here we group by Connection Name as requested "Allocation by Platform".
                    // Actually, if I have 2 Pionex accounts, do I want them merged or separate?
                    // "Allocation by Platform" usually means "Binance" vs "MAX".
                    // But if I have "Pionex 1" and "Pionex 2", maybe I want them separate?
                    // Let's stick to the Name for now, but maybe try to infer provider for color.
                } else {
                    const src = asset.source || 'manual';
                    key = src.charAt(0).toUpperCase() + src.slice(1);
                    if (key === 'Max') key = 'MAX';
                }
            }

            map.set(key, (map.get(key) || 0) + val);
        });

        // Convert to array and sort
        const result = Array.from(map.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        return result;
    }, [assets, viewMode]);

    const totalValue = data.reduce((acc, curr) => acc + curr.value, 0);

    return (
        <Card className="rounded-3xl shadow-sm border-border bg-card h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg md:text-xl font-bold flex items-center gap-2">
                    {viewMode === 'Asset' ? <ChartPie className="w-5 h-5 text-primary" /> : <Layers className="w-5 h-5 text-primary" />}
                    {title ? title : (viewMode === 'Asset' ? t('allocation_by_asset') : t('allocation_by_platform'))}
                </CardTitle>
                {showToggle && (
                    <div className="flex bg-muted p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('Asset')}
                            className={cn(
                                "px-3 py-1 text-xs font-medium rounded-md transition-all",
                                viewMode === 'Asset' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {t('asset') || "Asset"}
                        </button>
                        <button
                            onClick={() => setViewMode('Platform')}
                            className={cn(
                                "px-3 py-1 text-xs font-medium rounded-md transition-all",
                                viewMode === 'Platform' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {t('platform') || "Platform"}
                        </button>
                    </div>
                )}
            </CardHeader>
            <CardContent>
                <div style={{ width: '100%', height: 350, minHeight: 350 }}>
                    {totalValue === 0 ? (
                        <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                            <ChartPie className="w-8 h-8 opacity-20" />
                            <span className="text-sm">{t('no_data')}</span>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
                            <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                                <Pie
                                    data={data}
                                    cx="50%"
                                    cy="45%"
                                    innerRadius={80}
                                    outerRadius={110}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {data.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={COLORS[index % COLORS.length]}
                                            stroke="var(--card)"
                                            strokeWidth={2}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: any, name: any) => {
                                        if (isPrivacyMode) return ['****', name];
                                        const percent = totalValue ? (value / totalValue * 100).toFixed(1) : 0;
                                        return [
                                            `$${new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)} (${percent}%)`,
                                            name
                                        ];
                                    }}
                                    contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)' }}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    height={50}
                                    iconType="circle"
                                    layout="horizontal"
                                    align="center"
                                    wrapperStyle={{ paddingTop: '20px' }}
                                    formatter={(value) => <span className="mr-2 text-muted-foreground text-xs md:text-sm font-medium">{value}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
