'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePrivacy } from "@/components/PrivacyProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { AlertButton } from "@/components/AlertButton";
import { updateAsset } from "@/lib/api";

import { fetchDashboardData } from "@/lib/api";

import { TradeDialog } from "@/components/TradeDialog";
import { AlertCircle, ArrowLeftRight, TrendingUp } from "lucide-react";
import { PortfolioAllocation } from "@/components/PortfolioAllocation";
import { TopMovers } from "@/components/TopMovers";
import { TopPerformersWidget } from "@/components/TopPerformersWidget";

// Reusable Table Component
function AssetTable({ title, assets, exchangeRate, onUpdate, onTrade }: { title: string, assets: any[], exchangeRate: number, onUpdate: () => void, onTrade: (asset: any) => void }) {
    const { isPrivacyMode } = usePrivacy();
    const { t } = useLanguage();

    const handleCostChange = async (asset: any, value: string) => {
        const num = parseFloat(value);
        if (isNaN(num)) return;

        // If USD asset, convert input TWD back to USD for storage
        // But wait, manual_avg_cost is stored in "native" currency or TWD?
        // Let's assume manual_avg_cost is meant to be in NATIVE currency (matching buy_price logic).
        // Since user sees TWD, we should convert TWD input -> USD Output if asset is USD.

        // Helper to check if TWD
        const isTWD = asset.ticker && asset.ticker.endsWith('.TW');
        const isUSD = !isTWD && (asset.ticker && (asset.ticker.includes('-') || !asset.ticker.endsWith('.TW'))); // Ticker logic from backend
        // Actually simplest is: if title is "Cryptocurrencies" or "Others" (minus TW stocks).
        // Let's reuse the isUSD logic from existing code or pass it in.

        // Better: Calculate conversion factor passed to this row?
        // For simplicity now: manual cost is usually entered in Native currency in the *Trade* dialog.
        // Here in the table, if we show TWD, editing "Avg Cost" is ambiguous.
        // Let's DISABLE editing Cost in the table for now to avoid confusion, or assume input is Native.
        // Given the request "Portfolio converted to TWD", ideally everything is TWD.
        // If I input 32000 (TWD) for TSLA, backend stores 32000? That's wrong if TSLA is USD.

        // Decision: Keep "Avg Cost" input as NATIVE currency for now to avoid complex reverse-calc bugs,
        // OR hide the input if it's not TWD.
        // Let's HIDE the direct input for non-TWD assets for safety, forcing use of Trade Dialog or explicit settings.
        // But for this step, I will just display converted values.

        try {
            await updateAsset(asset.id, { manual_avg_cost: num });
            onUpdate();
        } catch (error) {
            console.error("Failed to update cost", error);
        }
    };

    if (assets.length === 0) return null;

    return (
        <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                {title}
                <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {assets.length}
                </span>
            </h2>
            {/* Mobile Card List */}
            <div className="md:hidden space-y-4">
                {assets.map(asset => {
                    const quantity = asset.transactions.reduce((acc: any, t: any) => acc + t.amount, 0);

                    // Native Values
                    const backendTotalCost = asset.transactions.reduce((acc: any, t: any) => acc + (t.amount * t.buy_price), 0);
                    const backendAvgCost = quantity > 0 ? backendTotalCost / quantity : 0;
                    const hasManual = asset.manual_avg_cost !== null;
                    const avgCostNative = hasManual ? asset.manual_avg_cost : backendAvgCost;
                    const currentPriceNative = asset.current_price;

                    let isUSD = false;
                    if (asset.ticker) {
                        if (asset.ticker.endsWith('.TW')) {
                            isUSD = false;
                        } else if (asset.source === 'max') {
                            isUSD = false;
                        } else if (asset.ticker.includes('-') || /^[A-Z]+$/.test(asset.ticker)) {
                            isUSD = true; // Crypto or US Stock (AAPL)
                        }
                    }

                    // Convert to TWD
                    const rate = isUSD ? exchangeRate : 1;
                    const priceTWD = currentPriceNative * rate;
                    const costTWD = avgCostNative * rate;
                    const valueTWD = (asset.value_twd !== undefined) ? asset.value_twd : (priceTWD * quantity);

                    // P/L Calculation in TWD
                    const plTWD = valueTWD - (costTWD * quantity);
                    const roi = (costTWD * quantity) > 0 ? (plTWD / (costTWD * quantity)) * 100 : 0;

                    const daysSinceUpdate = (new Date().getTime() - new Date(asset.last_updated_at).getTime()) / (1000 * 3600 * 24);
                    const isManual = !asset.ticker;
                    const isStale = isManual && daysSinceUpdate > 30;

                    return (
                        <div key={asset.id} className="bg-card p-4 rounded-2xl shadow-sm border border-border">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="font-bold text-foreground text-lg flex items-center gap-2">
                                        {asset.ticker || asset.name}
                                        {isStale && <AlertCircle className="w-4 h-4 text-amber-500" />}
                                    </div>
                                    {asset.ticker && (
                                        <div className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{asset.ticker}</div>
                                    )}
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-lg text-foreground">
                                        {isPrivacyMode ? '****' : `$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0, notation: "compact" }).format(valueTWD)}`}
                                    </div>
                                    <div className={cn("text-xs font-medium", plTWD >= 0 ? "text-trend-up" : "text-trend-down")}>
                                        {isPrivacyMode ? '****' : (plTWD > 0 ? '+' : '') + plTWD.toLocaleString(undefined, { maximumFractionDigits: 0 })} ({roi.toFixed(1)}%)
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm bg-muted/30 p-3 rounded-xl">
                                <div>
                                    <div className="text-xs text-muted-foreground mb-0.5">{t('price')}</div>
                                    <div className="font-mono">{priceTWD.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-[10px] text-muted-foreground">TWD</span></div>
                                </div>
                                <div>
                                    <div className="text-xs text-muted-foreground mb-0.5">{t('holdings')}</div>
                                    <div className="font-mono">{isPrivacyMode ? '****' : quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-muted-foreground mb-0.5">{t('avg_cost')}</div>
                                    <div className="font-mono text-muted-foreground">{costTWD.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                                </div>
                                <div className="flex items-end justify-end">
                                    <button
                                        onClick={() => onTrade(asset)}
                                        className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full font-medium hover:bg-primary/20 transition-colors flex items-center gap-1"
                                    >
                                        <ArrowLeftRight className="w-3 h-3" /> {t('trade')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="hidden md:block bg-card rounded-3xl shadow-sm border border-border overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-muted text-xs text-muted-foreground uppercase tracking-wider border-b border-border">
                            <th className="p-4 font-medium w-[25%]">{t('asset')}</th>
                            <th className="p-4 font-medium text-right w-[12%]">{t('price_twd')}</th>
                            <th className="p-4 font-medium text-right w-[10%]">{t('holdings')}</th>
                            <th className="p-4 font-medium text-right w-[13%]">{t('avg_cost_twd')}</th>
                            <th className="p-4 font-medium text-right w-[13%]">{t('value_twd')}</th>
                            <th className="p-4 font-medium text-right w-[12%]">{t('pl_twd')}</th>
                            <th className="p-4 font-medium text-right w-[10%]">{t('return_pct')}</th>
                            <th className="p-4 w-[50px]"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {assets.map(asset => {
                            const quantity = asset.transactions.reduce((acc: any, t: any) => acc + t.amount, 0);

                            // Native Values
                            const backendTotalCost = asset.transactions.reduce((acc: any, t: any) => acc + (t.amount * t.buy_price), 0);
                            const backendAvgCost = quantity > 0 ? backendTotalCost / quantity : 0;
                            const hasManual = asset.manual_avg_cost !== null;
                            const avgCostNative = hasManual ? asset.manual_avg_cost : backendAvgCost;
                            const currentPriceNative = asset.current_price;

                            // Determine Currency & Conversion
                            // Heuristic: If Ticker exists and NOT .TW, assume USD.
                            // Exceptions: .TW is TWD.
                            // Crypto (with -USD) is USD.

                            let isUSD = false;
                            if (asset.ticker) {
                                if (asset.ticker.endsWith('.TW')) {
                                    isUSD = false;
                                } else if (asset.source === 'max') {
                                    // MAX is always TWD
                                    isUSD = false;
                                } else if (asset.ticker.includes('-') || /^[A-Z]+$/.test(asset.ticker)) {
                                    isUSD = true; // Crypto or US Stock (AAPL)
                                }
                            }

                            // Convert to TWD
                            const rate = isUSD ? exchangeRate : 1;

                            const priceTWD = currentPriceNative * rate;
                            const costTWD = avgCostNative * rate;
                            const valueTWD = (asset.value_twd !== undefined) ? asset.value_twd : (priceTWD * quantity);

                            // P/L Calculation in TWD
                            const plTWD = valueTWD - (costTWD * quantity);
                            const roi = (costTWD * quantity) > 0 ? (plTWD / (costTWD * quantity)) * 100 : 0;

                            // Stale Logic
                            const daysSinceUpdate = (new Date().getTime() - new Date(asset.last_updated_at).getTime()) / (1000 * 3600 * 24);
                            const isManual = !asset.ticker;
                            const isStale = isManual && daysSinceUpdate > 30;

                            return (
                                <tr key={asset.id} className="hover:bg-muted/50 transition-colors group">
                                    <td className="p-4">
                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <div className="font-bold text-foreground flex items-center gap-2">
                                                    {asset.ticker || asset.name}
                                                    {isStale && (
                                                        <div className="text-amber-500" title={`Last updated ${Math.floor(daysSinceUpdate)} days ago`}>
                                                            <AlertCircle className="w-4 h-4" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-xs text-muted-foreground">{asset.ticker ? asset.name : asset.category}</div>
                                            </div>
                                            {asset.ticker && (
                                                <AlertButton
                                                    assetId={asset.id}
                                                    currentPrice={currentPriceNative}
                                                    ticker={asset.ticker}
                                                />
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right tabular-nums text-foreground">
                                        {priceTWD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="p-4 text-right tabular-nums font-medium text-foreground">
                                        {isPrivacyMode ? '****' : quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                                    </td>
                                    <td className="p-4 text-right tabular-nums text-muted-foreground">
                                        {/* Display Only for TWD converted cost to avoid confusion */}
                                        {costTWD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="p-4 text-right tabular-nums font-bold text-foreground">
                                        {isPrivacyMode ? '****' : `$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(valueTWD)}`}
                                    </td>
                                    <td className={cn("p-4 text-right tabular-nums font-medium", plTWD >= 0 ? "text-trend-up" : "text-trend-down")}>
                                        {isPrivacyMode ? '****' : (plTWD > 0 ? '+' : '') + plTWD.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </td>
                                    <td className={cn("p-4 text-right tabular-nums font-medium", roi >= 0 ? "text-trend-up" : "text-trend-down")}>
                                        {roi > 0 ? '+' : ''}{roi.toFixed(2)}%
                                    </td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => onTrade(asset)}
                                            className="p-2 bg-muted/50 hover:bg-primary/10 text-muted-foreground hover:text-primary rounded-full transition-colors"
                                            title="Trade"
                                        >
                                            <ArrowLeftRight className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default function InvestmentPage() {
    const [assets, setAssets] = useState<any[]>([]);
    const [exchangeRate, setExchangeRate] = useState(30);
    const [tradingAsset, setTradingAsset] = useState<any | null>(null);

    const loadData = () => {
        fetchDashboardData()
            .then(data => {
                setAssets(data.assets);
                setExchangeRate(data.exchange_rate);
            })
            .catch(console.error);
    };

    useEffect(() => {
        loadData();
    }, []);

    // Categorize
    const portfolioAssets = assets.filter(a => ['Stock', 'Crypto', 'Fund', 'Other Investment'].includes(a.category) || a.category === 'Investment');

    const { t } = useLanguage();

    return (
        <div className="min-h-screen bg-background p-6 md:p-10 text-foreground transition-colors duration-300">
            <header className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('portfolio_title')}</h1>
                        <p className="text-muted-foreground mt-1">{t('portfolio_desc')}</p>
                    </div>
                </div>
                <a
                    href="/analytics"
                    className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 transition-colors text-sm font-medium"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    {t('view_analytics')}
                </a>
            </header>

            {portfolioAssets.length === 0 && (
                <div className="bg-card rounded-3xl shadow-sm border border-border p-12 text-center">
                    <p className="text-muted-foreground">{t('no_investments_yet')}</p>
                </div>
            )}

            {portfolioAssets.length > 0 && (
                <>
                    <div className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <PortfolioAllocation
                            assets={portfolioAssets}
                            title={t('allocation_by_asset')}
                            defaultTab="Asset"
                            showToggle={false}
                        />
                        <PortfolioAllocation
                            assets={portfolioAssets}
                            title={t('allocation_by_platform')}
                            defaultTab="Platform"
                            showToggle={false}
                        />
                        <TopMovers assets={portfolioAssets} />
                    </div>
                    <div className="mb-8">
                        <TopPerformersWidget assets={portfolioAssets} />
                    </div>
                </>
            )}

            <AssetTable title={t('assets')} assets={portfolioAssets} exchangeRate={exchangeRate} onUpdate={loadData} onTrade={setTradingAsset} />

            <TradeDialog
                isOpen={!!tradingAsset}
                onClose={() => setTradingAsset(null)}
                asset={tradingAsset}
                onSuccess={loadData}
            />

            {assets.length > 0 && (
                <div className="flex justify-end mt-8">
                    <span className="text-xs bg-muted/60 text-muted-foreground px-2 py-0.5 rounded-full">
                        {t('last_updated')}: {new Date(Math.max(...assets.map(a => new Date(a.last_updated_at || 0).getTime()))).toLocaleString()}
                    </span>
                </div>
            )}
        </div>
    );
}
