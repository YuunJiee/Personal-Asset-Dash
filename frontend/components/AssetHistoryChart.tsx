
'use client';

import { useState, useEffect } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useLanguage } from "@/components/LanguageProvider";
import { usePrivacy } from "@/components/PrivacyProvider";
import { fetchAssetHistory } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { Select } from "@/components/ui/select"; // Helper if you have it, else native
// Assuming native select for simplicity since we don't have Select component handy in context
// actually we do have Select in ui/select based on IntegrationManager

interface AssetHistoryChartProps {
    assetId: number;
    color?: string;
}

export function AssetHistoryChart({ assetId, color = "#8884d8" }: AssetHistoryChartProps) {
    const { t } = useLanguage();
    const { isPrivacyMode } = usePrivacy();
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [range, setRange] = useState('1y');

    useEffect(() => {
        setLoading(true);
        fetchAssetHistory(assetId, range)
            .then(res => {
                setData(res);
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [assetId, range]);

    if (loading) {
        return <div className="h-[200px] w-full flex items-center justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>;
    }

    if (!data || data.length === 0) {
        return <div className="h-[200px] w-full flex items-center justify-center text-muted-foreground text-sm">{t('no_data')}</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <select
                    value={range}
                    onChange={(e) => setRange(e.target.value)}
                    className="text-xs bg-muted border border-border rounded-md px-2 py-1 outline-none"
                >
                    <option value="30d">30 Days</option>
                    <option value="3mo">3 Months</option>
                    <option value="6mo">6 Months</option>
                    <option value="1y">1 Year</option>
                    <option value="all">All Time</option>
                </select>
            </div>

            <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={color} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                            tickFormatter={(val) => {
                                const d = new Date(val);
                                return `${d.getMonth() + 1}/${d.getDate()}`;
                            }}
                            minTickGap={30}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            hide={isPrivacyMode}
                            tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                            axisLine={false}
                            tickLine={false}
                            domain={['auto', 'auto']}
                        />
                        <Tooltip
                            contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)' }}
                            formatter={(value: any) => isPrivacyMode ? '****' : [`$${value}`, 'Value']}
                            labelFormatter={(label) => new Date(label).toLocaleDateString()}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={color}
                            fillOpacity={1}
                            fill="url(#colorValue)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
