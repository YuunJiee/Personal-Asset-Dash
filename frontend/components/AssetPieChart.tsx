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

interface AssetPieChartProps {
    data: any[];
    themeName?: string;
}

export function AssetPieChart({ data, themeName = 'Classic' }: AssetPieChartProps) {
    const totalValue = data.reduce((acc, item) => acc + item.value, 0);
    const { isPrivacyMode } = usePrivacy();

    const colors = CHART_THEMES[themeName] || CHART_THEMES[DEFAULT_THEME];


    const { t } = useLanguage();

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
                    <ResponsiveContainer width="100%" height="100%">
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
                                {data.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={colors[index % colors.length]}
                                        stroke="none"
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
                                contentStyle={{ borderRadius: '12px', borderColor: '#f3f4f6', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
