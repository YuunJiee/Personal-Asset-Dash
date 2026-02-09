'use client';

import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePrivacy } from "@/components/PrivacyProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { fetchHistory } from '@/lib/api';

interface DataPoint {
    date: string;
    value: number;
}

interface NetWorthTrendChartProps {
    className?: string;
}

export function NetWorthTrendChart({ className }: NetWorthTrendChartProps) {
    const { t } = useLanguage();
    const { isPrivacyMode } = usePrivacy();
    const [data, setData] = useState<DataPoint[]>([]);
    const [range, setRange] = useState<string>('30d');
    const [isLoading, setIsLoading] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Fetch from backend
                const result = await fetchHistory(range);
                if (result && result.length > 0) {
                    setData(result);
                } else {
                    // No data available - show empty state
                    setData([]);
                }
            } catch (error) {
                console.error("Failed to fetch history:", error);
                setData([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [range]);

    if (!mounted) return <div className={cn("rounded-3xl shadow-sm border-border bg-card h-[400px]", className)} />;

    return (
        <Card className={cn("rounded-3xl shadow-sm border-border bg-card", className)}>
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-2 gap-4 md:gap-0">
                <CardTitle className="text-lg md:text-xl font-bold text-foreground">
                    {t('net_worth_trend')}
                </CardTitle>
                <div className="flex gap-1 bg-muted p-1 rounded-lg overflow-x-auto">
                    {['30d', '3mo', '6mo', '1y', 'all'].map((r) => (
                        <button
                            key={r}
                            onClick={() => setRange(r)}
                            className={cn(
                                "px-3 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap",
                                range === r
                                    ? "bg-card text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {t(`range_${r}` as any)}
                        </button>
                    ))}
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[350px] w-full min-w-0">
                    {isLoading ? (
                        <div className="h-full w-full flex items-center justify-center text-muted-foreground">Loading...</div>
                    ) : data.length === 0 ? (
                        <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground">
                            <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <p className="text-sm">{t('no_data_available')}</p>
                            <p className="text-xs mt-1 opacity-70">{t('add_assets_to_see_trends')}</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8ABF9E" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#8ABF9E" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
                                <XAxis
                                    dataKey="date"
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                                    tickFormatter={(str) => {
                                        const date = new Date(str);
                                        return `${date.getMonth() + 1}/${date.getDate()}`;
                                    }}
                                    interval="preserveStartEnd"
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                                    tickFormatter={(val) =>
                                        isPrivacyMode ? '****' : '$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0, notation: "compact" }).format(val)
                                    }
                                    domain={['auto', 'auto']}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value: any) => isPrivacyMode ? '****' : '$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 0 }).format(value)}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#8ABF9E"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorValue)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
