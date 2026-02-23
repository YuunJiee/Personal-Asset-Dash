'use client';

import { useState, useEffect } from 'react';
import { fetchRiskMetrics } from '@/lib/api';
import type { RiskMetricsResponse } from '@/lib/types';
import { Activity, ShieldAlert, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/components/LanguageProvider';

export function RiskMetricsWidget() {
    const [metrics, setMetrics] = useState<RiskMetricsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const { t, language } = useLanguage();

    useEffect(() => {
        async function loadMetrics() {
            try {
                const data = await fetchRiskMetrics();
                setMetrics(data);
            } catch (err) {
                console.error("Failed to load risk metrics", err);
            } finally {
                setLoading(false);
            }
        }
        loadMetrics();
    }, []);

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-card rounded-3xl p-6 border border-border/60 animate-pulse h-[140px]" />
                ))}
            </div>
        );
    }

    if (!metrics) return null;

    // Translation helpers for statuses
    // For English they match exactly. For zh-TW we'll need to add to translations.
    // Let's use generic strings for now and fallback to english status if translation is missing.
    const translateStatus = (s: string) => {
        const key = `status_${s.toLowerCase().replace(' ', '_')}`;
        const translated = t(key as any);
        return translated === key ? s : translated;
    };

    const getStatusColor = (metric: string, status: string) => {
        if (status === 'N/A') return 'text-muted-foreground';

        if (metric === 'cagr') {
            if (status === 'Excellent' || status === 'Healthy') return 'text-green-500';
            if (status === 'Slow') return 'text-yellow-500';
            return 'text-red-500';
        }

        if (metric === 'dd') {
            if (status === 'Safe') return 'text-green-500';
            if (status === 'Correction') return 'text-yellow-500';
            return 'text-red-500';
        }

        if (metric === 'vol') {
            if (status === 'Stable') return 'text-green-500';
            if (status === 'Moderate') return 'text-yellow-500';
            return 'text-red-500';
        }

        return 'text-primary';
    };

    const cagrColor = getStatusColor('cagr', metrics.cagr.status);
    const ddColor = getStatusColor('dd', metrics.maxDrawdown.status);
    const volColor = getStatusColor('vol', metrics.volatility.status);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {/* CAGR Card */}
            <div className="bg-card rounded-3xl p-6 border border-border/60 shadow-sm flex flex-col justify-between group transition-all hover:border-primary/50 hover:shadow-md">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="bg-primary/10 p-2 rounded-xl">
                            <TrendingUp className="w-5 h-5 text-primary" />
                        </div>
                        <h3 className="font-bold text-foreground">CAGR</h3>
                    </div>
                </div>
                <div>
                    <div className="text-3xl font-bold tracking-tight mb-1">
                        {metrics.cagr.status === 'N/A' ? '--' : `${metrics.cagr.value.toFixed(1)}%`}
                    </div>
                    <div className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                        <span>{t('compound_growth') || 'Annual Growth'}</span>
                        <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold", cagrColor.replace('text-', 'bg-').replace('500', '500/10'), cagrColor)}>
                            {translateStatus(metrics.cagr.status)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Max Drawdown Card */}
            <div className="bg-card rounded-3xl p-6 border border-border/60 shadow-sm flex flex-col justify-between group transition-all hover:border-primary/50 hover:shadow-md">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="bg-primary/10 p-2 rounded-xl">
                            <ShieldAlert className="w-5 h-5 text-primary" />
                        </div>
                        <h3 className="font-bold text-foreground">Max Drawdown</h3>
                    </div>
                </div>
                <div>
                    <div className="text-3xl font-bold tracking-tight mb-1">
                        {metrics.maxDrawdown.status === 'N/A' ? '--' : `-${metrics.maxDrawdown.value.toFixed(1)}%`}
                    </div>
                    <div className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                        <span>{t('max_drawdown') || 'Peak to Trough'}</span>
                        <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold", ddColor.replace('text-', 'bg-').replace('500', '500/10'), ddColor)}>
                            {translateStatus(metrics.maxDrawdown.status)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Volatility Card */}
            <div className="bg-card rounded-3xl p-6 border border-border/60 shadow-sm flex flex-col justify-between group transition-all hover:border-primary/50 hover:shadow-md">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="bg-primary/10 p-2 rounded-xl">
                            <Activity className="w-5 h-5 text-primary" />
                        </div>
                        <h3 className="font-bold text-foreground">Volatility</h3>
                    </div>
                </div>
                <div>
                    <div className="text-3xl font-bold tracking-tight mb-1">
                        {metrics.volatility.status === 'N/A' ? '--' : `${metrics.volatility.value.toFixed(1)}%`}
                    </div>
                    <div className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                        <span>{t('annual_volatility') || 'Annualized Risk'}</span>
                        <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold", volColor.replace('text-', 'bg-').replace('500', '500/10'), volColor)}>
                            {translateStatus(metrics.volatility.status)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
