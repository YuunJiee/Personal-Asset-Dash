"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { usePrivacy } from "@/components/PrivacyProvider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AssetActionDialog } from "@/components/AssetActionDialog";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { Wallet, Bitcoin, Activity, Layers } from 'lucide-react';
import { IntegrationManager } from "@/components/IntegrationManager";
import { fetchAssets } from "@/lib/api";

export default function CryptoPage() {
    const { t } = useLanguage();
    const { isPrivacyMode } = usePrivacy();
    const [assets, setAssets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAsset, setSelectedAsset] = useState<any | null>(null);

    useEffect(() => {
        fetchAssets()
            .then(data => {
                // Filter only crypto assets
                const crypto = data.filter((a: any) => a.category === 'Crypto');
                setAssets(crypto);
            })
            .catch(e => console.error("Failed to fetch crypto assets:", e))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="p-8">Loading crypto data...</div>;

    // Derived Data
    const totalValue = assets.reduce((sum, a) => sum + (a.value_twd || 0), 0);

    // 1. Allocation by Coin (Ticker)
    const coinAlloc = assets.reduce((acc: any, a) => {
        let ticker = a.ticker || a.name;
        // Normalize: Remove -USD suffix if present to merge duplicate symbols
        if (ticker && ticker.endsWith('-USD')) {
            ticker = ticker.replace('-USD', '');
        }
        acc[ticker] = (acc[ticker] || 0) + (a.value_twd || 0);
        return acc;
    }, {});
    const coinData = Object.entries(coinAlloc).map(([name, value]) => ({ name, value })).sort((a: any, b: any) => b.value - a.value);

    // 2. Allocation by Platform (Source)
    const platformAlloc = assets.reduce((acc: any, a) => {
        let source = 'Other';
        if (a.source === 'max') source = 'MAX';
        else if (a.source === 'pionex') source = 'Pionex';
        else if (a.source === 'binance') source = 'Binance';
        else if (a.source === 'manual') source = 'Manual';
        else if (a.source === 'manual_wallet' || a.source === 'web3_wallet') source = 'Wallet';

        acc[source] = (acc[source] || 0) + (a.value_twd || 0);
        return acc;
    }, {});
    const platformData = Object.entries(platformAlloc).map(([name, value]) => ({ name, value }));

    // 3. Allocation by Network
    const networkAlloc = assets.reduce((acc: any, a) => {
        const label = a.network ? a.network : (a.source === 'manual' ? 'Manual' : 'CEX');
        acc[label] = (acc[label] || 0) + (a.value_twd || 0);
        return acc;
    }, {});
    const networkData = Object.entries(networkAlloc).map(([name, value]) => ({ name, value }));

    // Morandi Color Palette (matching AssetAllocationWidget)
    const COLORS = ['#A4C3B2', '#E0D5C3', '#D4A59A', '#8199A6', '#8ABF9E', '#C5AFA5'];

    return (
        <div className="min-h-screen bg-background p-4 md:p-6 lg:p-10 pb-24 space-y-6 overflow-x-hidden">
            <header className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                    <Bitcoin className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight truncate">{t('crypto_dashboard_title')}</h1>
                    <p className="text-muted-foreground mt-1 text-sm">{t('crypto_dashboard_desc')}</p>
                </div>
            </header>

            {/* Integrations Section */}
            <section className="bg-card p-6 rounded-3xl border border-border shadow-sm">
                <IntegrationManager />
            </section>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">{t('total_crypto_value')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {isPrivacyMode ? '****' : `$${new Intl.NumberFormat('en-US').format(Math.round(totalValue))}`}
                            <span className="text-sm font-normal text-muted-foreground ml-2">TWD</span>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">{t('active_assets')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{assets.length} <span className="text-sm font-normal text-muted-foreground">{t('coins')}</span></div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">{t('top_holding')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{coinData.length > 0 ? coinData[0].name : '-'}</div>
                        <p className="text-sm text-muted-foreground">
                            {coinData.length > 0
                                ? (isPrivacyMode ? '****' : `${Math.round((coinData[0].value as number / totalValue) * 100)}%`)
                                : ''} {t('of_portfolio')}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="min-h-[350px]">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5" /> {t('allocation_by_asset')}</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={coinData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {coinData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip
                                    formatter={(value: any) => [
                                        isPrivacyMode ? '****' : `$${new Intl.NumberFormat('en-US').format(Math.round(value))}`,
                                        'Value'
                                    ]}
                                    contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)' }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="min-h-[350px]">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Layers className="w-5 h-5" /> {t('allocation_by_platform')}</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={platformData} margin={{ left: 0, right: 8 }}>
                                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis
                                    width={50}
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => isPrivacyMode ? '****' : `$${value / 1000}k`}
                                />
                                <Bar dataKey="value" fill="#8884d8" radius={[4, 4, 0, 0]}>
                                    {platformData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                                <RechartsTooltip
                                    cursor={{ fill: 'transparent' }}
                                    formatter={(value: any) => [
                                        isPrivacyMode ? '****' : `$${new Intl.NumberFormat('en-US').format(Math.round(value))}`,
                                        'Value'
                                    ]}
                                    contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)' }}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Assets Table */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('crypto_holdings')}</CardTitle>
                    <CardDescription>{t('crypto_holdings_desc')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {assets.map((asset) => (
                            <div
                                key={asset.id}
                                className="flex items-center justify-between gap-2 p-4 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors cursor-pointer"
                                onClick={() => setSelectedAsset(asset)}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 shrink-0 rounded-full bg-background flex items-center justify-center border border-border">
                                        <span className="font-bold text-xs">{asset.ticker ? asset.ticker.substring(0, 3) : asset.name.substring(0, 2)}</span>
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-semibold truncate">{asset.ticker || asset.name}</div>
                                        <div className="text-xs text-muted-foreground flex gap-2 flex-wrap">
                                            {asset.network && <span className="bg-blue-500/10 text-blue-600 px-1.5 py-0.5 rounded">{asset.network}</span>}
                                            <span className="capitalize">{asset.source}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className="font-bold font-mono text-sm">
                                        {isPrivacyMode ? '****' : `$${new Intl.NumberFormat('en-US').format(Math.round(asset.value_twd || 0))}`}
                                    </div>
                                    {asset.transactions && (
                                        <div className="text-xs text-muted-foreground">
                                            {asset.transactions.reduce((s: number, t: any) => s + t.amount, 0).toFixed(4)} {asset.ticker}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <AssetActionDialog
                isOpen={!!selectedAsset}
                onClose={() => setSelectedAsset(null)}
                asset={selectedAsset}
                allAssets={assets} // Just pass self for now
                initialMode="edit"
            />
        </div>
    );
}
