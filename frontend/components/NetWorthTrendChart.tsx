'use client';

import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/LanguageProvider";

interface DataPoint {
    date: string;
    value: number;
}

interface NetWorthTrendChartProps {
    className?: string;
}

export function NetWorthTrendChart({ className }: NetWorthTrendChartProps) {
    const { t } = useLanguage();
    const [data, setData] = useState<DataPoint[]>([]);
    const [range, setRange] = useState<string>('30d');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Fetch from backend
                const res = await fetch(`http://localhost:8000/api/stats/history?range=${range}`);
                if (res.ok) {
                    const result = await res.json();
                    setData(result);
                } else {
                    // Fallback Mock Data if endpoint fails or returns empty (for demo)
                    const mockData = generateMockData(range);
                    setData(mockData);
                }
            } catch (error) {
                console.error("Failed to fetch history:", error);
                setData(generateMockData(range));
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [range]);

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
                <div className="h-[350px] w-full">
                    {isLoading ? (
                        <div className="h-full w-full flex items-center justify-center text-muted-foreground">Loading...</div>
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
                                        '$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val)
                                    }
                                    domain={['auto', 'auto']}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value: any) => '$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 0 }).format(value)}
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

// Temporary Mock Data Generator until Backend Logic is 100%
function generateMockData(range: string) {
    const data = [];
    let points = 30;
    if (range === '3mo') points = 90;
    if (range === '6mo') points = 180;
    if (range === '1y') points = 365;

    let baseValue = 1500000;
    const now = new Date();

    for (let i = points; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);

        // Random walk
        const change = (Math.random() - 0.48) * 20000;
        baseValue += change;

        data.push({
            date: d.toISOString().split('T')[0],
            value: baseValue
        });
    }
    return data;
}
