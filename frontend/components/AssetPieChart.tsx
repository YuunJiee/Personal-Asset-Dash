'use client';

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';
import { useLanguage } from "@/components/LanguageProvider";
import { usePrivacy } from "@/components/PrivacyProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Theme Palettes
export const CHART_THEMES: Record<string, string[]> = {
    'Classic': ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'],
    'Morandi': ['#A4C3B2', '#E0D5C3', '#D4A59A', '#8199A6', '#8ABF9E', '#C5AFA5'], // Earthy, muted, soft
    'Vibrant': ['#FF0055', '#00CCFF', '#CCFF00', '#FF3300', '#9D00FF', '#00FF99']  // High contrast, neon-ish
};

const DEFAULT_THEME = 'Morandi';

/** A single slice of the pie chart. */
export interface PieChartDataPoint {
    name: string;
    value: number;
    category?: string;
}

interface AssetPieChartProps {
    data: PieChartDataPoint[];
    themeName?: string;
}

export function AssetPieChart({ data, themeName = 'Classic' }: AssetPieChartProps) {
    const { isPrivacyMode } = usePrivacy();
    const { t } = useLanguage();

    const colors = CHART_THEMES[themeName] || CHART_THEMES[DEFAULT_THEME];

    const hasData = data && data.length > 0;
    const totalValue = hasData ? data.reduce((acc, item) => acc + (item.value || 0), 0) : 0;

    return (
        <Card className="rounded-3xl border border-border shadow-sm bg-card">
            <CardHeader className="pb-0">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <PieChartIcon className="w-5 h-5 text-muted-foreground" />
                    {t('top_assets')}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full mt-4">
                    {hasData ? (
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
                            <PieChart>
                                <Pie
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={110}
                                    paddingAngle={5}
                                    dataKey="value"
                                    label={false}
                                    labelLine={false}
                                >
                                    {data.map((entry, index) => {
                                        // Use category for semantic color if available
                                        const semanticColorMap: Record<string, string> = {
                                            'Fluid': 'var(--color-fluid)',
                                            'Stock': 'var(--color-stock)',
                                            'Crypto': 'var(--color-crypto)',
                                            'Fixed': 'var(--color-fixed)',
                                            'Receivables': 'var(--color-receivables)',
                                            'Liabilities': 'var(--color-liabilities)',
                                            // Handle "Investment" legacy or "Portfolio" translations if needed
                                            'Investment': 'var(--color-stock)'
                                        };

                                        const color = (entry.category && semanticColorMap[entry.category])
                                            ? semanticColorMap[entry.category]
                                            : colors[index % colors.length];

                                        return (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={color}
                                                stroke="var(--card)"
                                                strokeWidth={2}
                                            />
                                        );
                                    })}
                                </Pie>
                                <Tooltip
                                    formatter={(value, name) => {
                                        if (isPrivacyMode) return ['****', String(name ?? '')];
                                        const v = Number(value ?? 0);
                                        const percent = totalValue ? ((v / totalValue) * 100).toFixed(1) : 0;
                                        return [
                                            `$${new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)} (${percent}%)`,
                                            String(name ?? '')
                                        ];
                                    }}
                                    contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)' }}
                                />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                            <PieChartIcon className="w-8 h-8 opacity-20" />
                            <span className="text-sm">{t('no_data')}</span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
