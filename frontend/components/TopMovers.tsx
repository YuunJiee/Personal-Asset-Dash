'use client';

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePrivacy } from "@/components/PrivacyProvider";

interface TopMoversProps {
    assets: any[];
}

export function TopMovers({ assets }: TopMoversProps) {
    const { isPrivacyMode } = usePrivacy();

    // Sort assets by value (Descending)
    // Since we don't have daily change %, we'll show Top Assets by Value
    // This is "Top Holdings"
    const topAssets = [...assets]
        .filter(a => a.value_twd && a.value_twd > 0 && a.include_in_net_worth !== false)
        .sort((a, b) => b.value_twd - a.value_twd)
        .slice(0, 5);

    return (
        <div className="bg-card p-6 rounded-3xl border border-border shadow-sm">
            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-4">Top Holdings</h3>

            <div className="space-y-3">
                {topAssets.map((asset, index) => (
                    <div key={asset.id} className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                            <div className="text-sm font-bold text-muted-foreground w-4 text-center">{index + 1}</div>
                            <div>
                                <div className="font-medium text-foreground">{asset.name}</div>
                                <div className="text-xs text-muted-foreground">{asset.ticker || asset.category}</div>
                            </div>
                        </div>
                        <div className="font-bold tabular-nums">
                            {isPrivacyMode ? '****' : `$${new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(asset.value_twd)}`}
                        </div>
                    </div>
                ))}

                {topAssets.length === 0 && (
                    <div className="text-muted-foreground text-sm text-center py-4">No assets found</div>
                )}
            </div>

            <div className="mt-4 pt-4 border-t border-border/50 text-center">
                <a href="/assets" className="text-xs text-primary hover:underline font-medium">View All Assets</a>
            </div>
        </div>
    );
}
