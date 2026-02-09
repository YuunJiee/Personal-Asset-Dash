'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePrivacy } from "@/components/PrivacyProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { Trophy, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { cn } from "@/lib/utils";

interface TopPerformersWidgetProps {
    assets: any[];
}

export function TopPerformersWidget({ assets }: TopPerformersWidgetProps) {
    const { t } = useLanguage();
    const { isPrivacyMode } = usePrivacy();
    const [mode, setMode] = useState<'Winners' | 'Losers'>('Winners');

    const sortedAssets = useMemo(() => {
        // Filter out assets with 0 cost (infinite ROI) or cash-like if needed
        const candidates = assets.filter(a =>
            a.include_in_net_worth !== false &&
            (a.category === 'Investment' || a.category === 'Stock' || a.category === 'Crypto') && // Primarily for investments
            (a.roi !== undefined && a.roi !== 0)
        );

        if (mode === 'Winners') {
            return [...candidates].sort((a, b) => (b.unrealized_pl || 0) - (a.unrealized_pl || 0)).slice(0, 5);
        } else {
            return [...candidates].sort((a, b) => (a.unrealized_pl || 0) - (b.unrealized_pl || 0)).slice(0, 5);
        }
    }, [assets, mode]);

    return (
        <Card className="rounded-3xl shadow-sm border-border bg-card h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg md:text-xl font-bold flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    {t('top_performers')}
                </CardTitle>
                <div className="flex bg-muted p-1 rounded-lg">
                    <button
                        onClick={() => setMode('Winners')}
                        className={cn(
                            "px-2 md:px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1",
                            mode === 'Winners' ? "bg-background shadow-sm text-trend-up" : "text-muted-foreground hover:text-foreground"
                        )}
                        title={t('winners')}
                    >
                        <TrendingUp className="w-3 h-3" />
                        <span className="hidden md:inline">{t('winners')}</span>
                    </button>
                    <button
                        onClick={() => setMode('Losers')}
                        className={cn(
                            "px-2 md:px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1",
                            mode === 'Losers' ? "bg-background shadow-sm text-trend-down" : "text-muted-foreground hover:text-foreground"
                        )}
                        title={t('losers')}
                    >
                        <TrendingDown className="w-3 h-3" />
                        <span className="hidden md:inline">{t('losers')}</span>
                    </button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {sortedAssets.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            {t('no_data')}
                        </div>
                    ) : (
                        sortedAssets.map((asset, index) => {
                            const pl = asset.unrealized_pl || 0;
                            const roi = asset.roi || 0;
                            const isPositive = pl >= 0;

                            return (
                                <div key={asset.id} className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 hover:bg-muted/60 transition-colors border border-transparent hover:border-border gap-4">
                                    <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
                                        <div className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                                            index === 0 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                                                index === 1 ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" :
                                                    index === 2 ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                                                        "bg-muted text-muted-foreground"
                                        )}>
                                            {index + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold text-sm truncate">{asset.name}</div>
                                            <div className="text-xs text-muted-foreground truncate">{asset.ticker}</div>
                                        </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                        <div className={cn("font-bold text-sm", isPositive ? "text-trend-up" : "text-trend-down")}>
                                            {isPrivacyMode ? '****' : `${isPositive ? '+' : ''}$${new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(pl)}`}
                                        </div>
                                        <div className={cn("text-xs font-medium px-1.5 py-0.5 rounded-full inline-block mt-0.5",
                                            isPositive ? "bg-trend-up-soft text-trend-up" : "bg-trend-down-soft text-trend-down"
                                        )}>
                                            {roi.toFixed(1)}%
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
