'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/LanguageProvider";

interface DataPoint {
    date: string;
    value: number;
}

interface MonthlyChange {
    month: string;
    change: number;
    isPositive: boolean;
}

// ... types
interface DataPoint {
    date: string;
    value: number;
    breakdown?: Record<string, number>;
}

// ... existing interfaces

export function MonthlyChangeChart() {
    const { t, language } = useLanguage();
    const [data, setData] = useState<MonthlyChange[]>([]);
    const [originalData, setOriginalData] = useState<DataPoint[]>([]);
    const [category, setCategory] = useState<string>('Total');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Fetch 1 year of data to calculate monthly changes
                const res = await fetch(`http://localhost:8000/api/stats/history?range=1y`);
                if (res.ok) {
                    const result: DataPoint[] = await res.json();
                    setOriginalData(result);
                    // Process initial (Total)
                    const processed = processMonthlyChanges(result, 'Total');
                    setData(processed);
                } else {
                    const mockData = generateMockData();
                    setOriginalData(mockData);
                    setData(processMonthlyChanges(mockData, 'Total'));
                }
            } catch (error) {
                console.error("Failed to fetch history:", error);
                const mockData = generateMockData();
                setOriginalData(mockData);
                setData(processMonthlyChanges(mockData, 'Total'));
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    // Re-process when category changes
    useEffect(() => {
        if (originalData.length > 0) {
            setData(processMonthlyChanges(originalData, category));
        }
    }, [category, originalData]);

    const processMonthlyChanges = (history: DataPoint[], selectedCat: string): MonthlyChange[] => {
        if (!history || history.length === 0) return [];

        const monthlyMap = new Map<string, number>();

        // Sort by date
        const sorted = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Group by Month (YYYY-MM) and get the LAST value of each month
        sorted.forEach(point => {
            const date = new Date(point.date);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            let val = point.value;
            if (selectedCat !== 'Total' && point.breakdown) {
                val = point.breakdown[selectedCat] || 0;
            }
            monthlyMap.set(key, val);
        });

        const months = Array.from(monthlyMap.keys()).sort();
        const changes: MonthlyChange[] = [];

        // Calculate delta between months
        for (let i = 1; i < months.length; i++) {
            const currentMonth = months[i];
            const prevMonth = months[i - 1];
            const currentVal = monthlyMap.get(currentMonth) || 0;
            const prevVal = monthlyMap.get(prevMonth) || 0;

            const delta = currentVal - prevVal;

            // Format month for display (e.g., "2024/01")
            const [year, month] = currentMonth.split('-');
            const label = `${year}/${month}`;

            changes.push({
                month: label,
                change: delta,
                isPositive: delta >= 0
            });
        }

        return changes.slice(-12); // Last 12 months
    };

    return (
        <Card className="rounded-3xl shadow-sm border-border bg-card">
            <CardHeader className="pb-2 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-0">
                <div>
                    <CardTitle className="text-lg md:text-xl font-bold text-foreground">
                        {t('monthly_change')}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{t('pl_analysis')}</p>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide justify-center md:justify-end">
                    {['Total', 'Investment', 'Fluid', 'Fixed', 'Liabilities'].map(cat => (
                        <button
                            key={cat}
                            onClick={() => setCategory(cat)}
                            className={cn(
                                "px-3 py-1.5 text-xs font-medium rounded-xl transition-all border whitespace-nowrap min-w-[60px]",
                                category === cat
                                    ? "bg-foreground text-background border-foreground"
                                    : "bg-background text-muted-foreground border-border hover:border-foreground/50"
                            )}
                        >
                            {/* Use Mobile Short Keys */}
                            {t(`cat_${cat}` as any) || cat}
                        </button>
                    ))}
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    {isLoading ? (
                        <div className="h-full w-full flex items-center justify-center text-muted-foreground">Loading...</div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
                                <XAxis
                                    dataKey="month"
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                                    tickFormatter={(val) => '$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val)}
                                />
                                <Tooltip
                                    cursor={{ fill: 'var(--muted)', opacity: 0.2 }}
                                    contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)' }}
                                    formatter={(value: any) => [
                                        `$${new Intl.NumberFormat('en-US', { minimumFractionDigits: 0 }).format(value)}`,
                                        value >= 0 ? t('profit') : t('loss')
                                    ]}
                                />
                                <Bar dataKey="change" radius={[4, 4, 0, 0]}>
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.isPositive ? 'var(--color-investment)' : 'var(--color-liabilities)'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

// Temporary Mock Data Generator (Same as NetWorthTrendChart)
function generateMockData() {
    // ... (Keep existing mock implementation, but ideally update to include breakdown if needed by fallback. For now leave as is, since mock path is failover)
    // Actually, let's update mock data to have breakdown so UI doesn't break if backend fails
    const data = [];
    let baseValue = 1500000;
    const now = new Date();
    for (let i = 540; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const change = (Math.random() - 0.45) * 5000;
        baseValue += change;
        data.push({
            date: d.toISOString().split('T')[0],
            value: baseValue,
            breakdown: {
                'Investment': baseValue * 0.6,
                'Fluid': baseValue * 0.3,
                'Fixed': baseValue * 0.1,
                'Total': baseValue
            }
        });
    }
    return data;
}
