'use client';

import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePrivacy } from "@/components/PrivacyProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { ChartPie } from 'lucide-react';
import { cn } from "@/lib/utils";

import type { Asset } from '@/lib/types';

// Theme Palettes (Inlined to ensure availability)
const CHART_THEMES: Record<string, string[]> = {
    'Classic': ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'],
    'Morandi': ['#A4C3B2', '#E0D5C3', '#D4A59A', '#8199A6', '#8ABF9E', '#C5AFA5'],
    'Vibrant': ['#FF0055', '#00CCFF', '#CCFF00', '#FF3300', '#9D00FF', '#00FF99']
};
// Map raw subcategory strings (from DB) to translation keys (in dictionaries.ts)
const SUBCATEGORY_KEY_MAP: Record<string, string> = {
    'Cash': 'sc_cash',
    'E-Wallet': 'sc_ewallet',
    'Debit Card': 'sc_debit_card',
    'Other': 'sc_other',
    'Fund': 'sc_fund',
    'Stock': 'sc_stock',
    'TW Stock': 'sc_tw_stock',
    'US Stock': 'sc_us_stock',
    'Mutual Fund': 'sc_mutual_fund',
    'Crypto': 'sc_crypto',
    'Token': 'sc_crypto',
    'Coin': 'sc_crypto',
    'Stablecoin': 'sc_stablecoin',
    'DeFi': 'sc_defi',
    'NFT': 'sc_nft',
    'Other Investment': 'sc_other_invest',
    'Real Estate': 'sc_real_estate',
    'Car': 'sc_car',
    'Other Fixed Asset': 'sc_other_fixed',
    'Credit Card': 'sc_credit_card',
    'Loan': 'sc_loan',
    'Payable': 'sc_payable',
    'Other Liability': 'sc_other_liability',
};

interface AssetAllocationWidgetProps {
    assets: Asset[];
}

export function AssetAllocationWidget({ assets }: AssetAllocationWidgetProps) {
    const { t } = useLanguage();
    const { isPrivacyMode } = usePrivacy();
    const [viewMode, setViewMode] = useState<'Category' | 'SubCategory'>('Category');

    const data = useMemo(() => {
        const map = new Map<string, number>();

        assets.forEach(asset => {
            if (asset.include_in_net_worth === false) return;

            // Key based on mode
            const key = viewMode === 'Category'
                ? (asset.category || 'Other')
                : (asset.sub_category || 'Other');

            const val = Number(asset.value_twd) || 0; // Ensure number
            map.set(key, (map.get(key) || 0) + val);
        });

        // Convert to array and sort
        const result = Array.from(map.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .filter(item => item.value > 0); // Filter out zero values

        return result;
    }, [assets, viewMode]);

    const totalValue = data.reduce((acc, curr) => acc + curr.value, 0);
    const legendHeight = Math.max(50, Math.ceil(data.length / 3) * 30 + 20);
    // Cap to 90dvh (converted to rough px cap) so it never overflows on small screens
    const containerHeight = Math.min(Math.max(420, 360 + legendHeight), 700);

    // Use Morandi Theme
    const colors = CHART_THEMES['Morandi'];

    const getTranslatedName = (name: string) => {
        // Try to map subcategory first
        if (viewMode === 'SubCategory') {
            const key = SUBCATEGORY_KEY_MAP[name];
            if (key) return t(key);
        }
        // Fallback to direct translation (for Categories which match keys, or unmapped subs)
        return t(name) || name;
    };

    return (
        <Card className="rounded-3xl shadow-sm border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg md:text-xl font-bold flex items-center gap-2">
                    <ChartPie className="w-5 h-5 text-primary" />
                    {t('asset_allocation')}
                </CardTitle>
                <div className="flex bg-muted p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('Category')}
                        className={cn(
                            "px-2 md:px-3 py-1 text-xs font-medium rounded-md transition-all",
                            viewMode === 'Category' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <span className="md:hidden">{t('lbl_Category')}</span>
                        <span className="hidden md:inline">{t('category')}</span>
                    </button>
                    <button
                        onClick={() => setViewMode('SubCategory')}
                        className={cn(
                            "px-2 md:px-3 py-1 text-xs font-medium rounded-md transition-all",
                            viewMode === 'SubCategory' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <span className="md:hidden">{t('lbl_SubCategory')}</span>
                        <span className="hidden md:inline">{t('sub_category')}</span>
                    </button>
                </div>
            </CardHeader>
            <CardContent>
                {/* Explicit height wrapper to prevent collapse */}
                <div style={{ width: '100%', height: containerHeight, minHeight: containerHeight, overflow: 'hidden' }}>
                    {totalValue === 0 ? (
                        <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                            <ChartPie className="w-8 h-8 opacity-20" />
                            <span className="text-sm">{t('no_data')}</span>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
                            <PieChart margin={{ top: 0, right: 0, bottom: 20, left: 0 }}>
                                <Pie
                                    data={data}
                                    cx="50%"
                                    cy="45%"
                                    innerRadius={95}
                                    outerRadius={130}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {data.map((entry, index) => {
                                        let fillColor = colors[index % colors.length];
                                        if (viewMode === 'Category') {
                                            const semanticMap: Record<string, string> = {
                                                'Fluid': 'var(--color-fluid)',
                                                'Stock': 'var(--color-stock)',
                                                'Crypto': 'var(--color-crypto)',
                                                'Fixed': 'var(--color-fixed)',
                                                'Receivables': 'var(--color-receivables)',
                                                'Liabilities': 'var(--color-liabilities)'
                                            };
                                            const semantic = semanticMap[entry.name];
                                            if (semantic) fillColor = semantic;
                                        }

                                        return (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={fillColor}
                                                stroke="var(--card)"
                                                strokeWidth={2}
                                            />
                                        );
                                    })}
                                </Pie>
                                <Tooltip
                                    formatter={(value, name) => {
                                        if (isPrivacyMode) return ['****', getTranslatedName(String(name ?? ''))];
                                        const v = Number(value ?? 0);
                                        const percent = totalValue ? (v / totalValue * 100).toFixed(1) : 0;
                                        return [
                                            `$${new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)} (${percent}%)`,
                                            getTranslatedName(String(name ?? ''))
                                        ];
                                    }}
                                    contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)' }}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    height={legendHeight}
                                    iconType="circle"
                                    layout="horizontal"
                                    align="center"
                                    wrapperStyle={{ paddingTop: '20px' }}
                                    formatter={(value) => <span className="mr-2 text-muted-foreground text-xs md:text-sm font-medium">{getTranslatedName(value)}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
