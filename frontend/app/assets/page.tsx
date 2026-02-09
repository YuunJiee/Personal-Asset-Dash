'use client';

import React from 'react';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowUpDown, Search, Wallet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { usePrivacy } from "@/components/PrivacyProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { fetchAssets, deleteAsset } from "@/lib/api";

import { Pencil, Trash2 } from "lucide-react";
import { AssetIcon } from "@/components/IconPicker";
import { getCategoryIconName } from "@/lib/iconHelper";
import { AssetActionDialog } from "@/components/AssetActionDialog";

// Map raw subcategory strings (from DB) to translation keys
const SUBCATEGORY_KEY_MAP: Record<string, string> = {
    'Cash': 'sc_cash',
    'E-Wallet': 'sc_ewallet',
    'Debit Card': 'sc_debit_card',
    'Other': 'sc_other',
    'Fund': 'sc_fund',
    'Stock': 'sc_stock',
    'Crypto': 'sc_crypto',
    'Other Investment': 'sc_other_invest',
    'Real Estate': 'sc_real_estate',
    'Car': 'sc_car',
    'Other Fixed Asset': 'sc_other_fixed',
    'Credit Card': 'sc_credit_card',
    'Loan': 'sc_loan',
    'Payable': 'sc_payable',
    'Other Liability': 'sc_other_liability',
};

export default function AssetsPage() {
    const [assets, setAssets] = useState<any[]>([]);
    const [historyAsset, setHistoryAsset] = useState<any | null>(null);
    const [search, setSearch] = useState('');
    const [sortDesc, setSortDesc] = useState(true);
    const { isPrivacyMode } = usePrivacy();
    const { t } = useLanguage();

    useEffect(() => {
        fetchAssets().then(setAssets).catch(console.error);
    }, []);

    const filteredAssets = assets
        .filter(a =>
            a.name.toLowerCase().includes(search.toLowerCase()) ||
            (a.ticker && a.ticker.toLowerCase().includes(search.toLowerCase())) ||
            (a.tags && a.tags.some((tag: any) => tag.name.toLowerCase().includes(search.toLowerCase()) || tag.name.includes(search)))
        )
        .sort((a, b) => {
            const valA = a.current_price * (a.transactions ? a.transactions.reduce((acc: any, t: any) => acc + t.amount, 0) : 0);
            const valB = b.current_price * (b.transactions ? b.transactions.reduce((acc: any, t: any) => acc + t.amount, 0) : 0);
            return sortDesc ? valB - valA : valA - valB;
        });

    const totalValue = filteredAssets.reduce((sum, a) => {
        if (a.category === 'Liabilities') return sum; // Don't sum liabilities in Asset Total? Or Net?
        // Let's just sum positive value assets for "Total Assets" view
        const val = a.current_price * (a.transactions ? a.transactions.reduce((acc: any, t: any) => acc + t.amount, 0) : 0);
        return sum + val;
    }, 0);

    const refreshData = () => {
        fetchAssets().then(setAssets).catch(console.error);
    };

    const handleDelete = async (asset: any) => {
        if (!confirm(t('delete_asset_confirm'))) return;
        try {
            await deleteAsset(asset.id);
            refreshData();
        } catch (e) {
            console.error("Failed to delete", e);
        }
    };

    const getTranslatedSubCategory = (sub: string) => {
        const key = SUBCATEGORY_KEY_MAP[sub];
        return key ? t(key as any) : sub;
    };

    return (
        <div className="min-h-screen bg-background p-6 md:p-10 text-foreground transition-colors duration-300">
            <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                        <Wallet className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('all_assets_title')}</h1>
                        <p className="text-muted-foreground mt-1">{t('all_assets_desc')}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-card p-2 rounded-xl border border-border shadow-sm w-full md:w-auto">
                    <Search className="w-4 h-4 text-muted-foreground ml-2" />
                    <Input
                        placeholder={t('search')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="border-none shadow-none focus-visible:ring-0 w-full md:w-64 bg-transparent"
                    />
                </div>
            </header>

            {/* Mobile List View */}
            <div className="md:hidden space-y-6">
                {['Fluid', 'Crypto', 'Stock', 'Investment', 'Fixed', 'Receivables', 'Liabilities'].map(category => {
                    const categoryAssets = filteredAssets.filter(a => a.category === category);
                    if (categoryAssets.length === 0) return null;

                    return (
                        <div key={category} className="space-y-3">
                            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground px-1">{t(category as any)}</h3>
                            <div className="space-y-3">
                                {categoryAssets.map(asset => {
                                    const quantity = asset.transactions ? asset.transactions.reduce((acc: any, t: any) => acc + t.amount, 0) : 0;
                                    const value = (asset.value_twd !== undefined && asset.value_twd !== 0) ? asset.value_twd : (asset.current_price * quantity);

                                    return (
                                        <div
                                            key={asset.id}
                                            className="bg-card p-4 rounded-2xl shadow-sm border border-border flex items-center justify-between"
                                            onClick={() => setHistoryAsset(asset)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                                                    asset.category === 'Fluid' ? 'bg-emerald-400/10' :
                                                        asset.category === 'Crypto' ? 'bg-orange-500/10' :
                                                            asset.category === 'Stock' ? 'bg-indigo-500/10' :
                                                                asset.category === 'Investment' ? 'bg-indigo-500/10' :
                                                                    asset.category === 'Fixed' ? 'bg-blue-400/10' :
                                                                        asset.category === 'Receivables' ? 'bg-orange-400/10' : 'bg-red-400/10'
                                                )}>
                                                    <AssetIcon
                                                        icon={asset.icon || getCategoryIconName(asset.category, asset.sub_category)}
                                                        className={cn("w-5 h-5",
                                                            asset.category === 'Fluid' ? 'text-emerald-400' :
                                                                asset.category === 'Crypto' ? 'text-orange-500' :
                                                                    asset.category === 'Stock' ? 'text-indigo-500' :
                                                                        asset.category === 'Investment' ? 'text-indigo-500' :
                                                                            asset.category === 'Fixed' ? 'text-blue-400' :
                                                                                asset.category === 'Receivables' ? 'text-orange-400' : 'text-red-400'
                                                        )}
                                                    />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-foreground">{asset.name}</div>
                                                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                        {asset.ticker && <span className="bg-muted px-1.5 py-0.5 rounded-md">{asset.ticker}</span>}
                                                        <span>{getTranslatedSubCategory(asset.sub_category)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-foreground">
                                                    {isPrivacyMode ? '****' : `$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0, notation: "compact" }).format(value)}`}
                                                </div>
                                                {asset.include_in_net_worth === false && (
                                                    <span className="text-[9px] text-muted-foreground">Excl.</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-card rounded-3xl shadow-sm border border-border overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-muted text-xs text-muted-foreground uppercase tracking-wider border-b border-border">
                            <th className="p-4 font-medium">{t('asset')}</th>
                            <th className="p-4 font-medium text-right">{t('type')}</th>
                            <th className="p-4 font-medium text-right cursor-pointer hover:text-foreground flex items-center justify-end gap-1" onClick={() => setSortDesc(!sortDesc)}>
                                {t('value_twd')} <ArrowUpDown className="w-3 h-3" />
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {['Fluid', 'Crypto', 'Stock', 'Investment', 'Fixed', 'Receivables', 'Liabilities'].map(category => {
                            const categoryAssets = filteredAssets.filter(a => a.category === category);
                            if (categoryAssets.length === 0) return null;

                            return (

                                <React.Fragment key={category}>
                                    {/* Category Separator */}
                                    <tr className="bg-muted/20 border-b border-border">
                                        <td colSpan={3} className="py-2 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground pl-4">
                                            {t(category as any)}
                                        </td>
                                    </tr>
                                    {categoryAssets.map(asset => {
                                        const quantity = asset.transactions ? asset.transactions.reduce((acc: any, t: any) => acc + t.amount, 0) : 0;
                                        // Use backend value_twd if available and non-zero
                                        const value = (asset.value_twd !== undefined && asset.value_twd !== 0) ? asset.value_twd : (asset.current_price * quantity);
                                        const isCrypto = asset.sub_category && asset.sub_category.includes('Crypto');

                                        return (
                                            <tr key={asset.id} className="hover:bg-muted/50 transition-colors group cursor-pointer" onClick={() => setHistoryAsset(asset)}>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                                                            asset.category === 'Fluid' ? 'bg-emerald-400/10' :
                                                                asset.category === 'Crypto' ? 'bg-orange-500/10' :
                                                                    asset.category === 'Stock' ? 'bg-indigo-500/10' :
                                                                        asset.category === 'Investment' ? 'bg-indigo-500/10' :
                                                                            asset.category === 'Fixed' ? 'bg-blue-400/10' :
                                                                                asset.category === 'Receivables' ? 'bg-orange-400/10' : 'bg-red-400/10'
                                                        )}>
                                                            <AssetIcon
                                                                icon={asset.icon || getCategoryIconName(asset.category, asset.sub_category)}
                                                                className={cn("w-5 h-5",
                                                                    asset.category === 'Fluid' ? 'text-emerald-400' :
                                                                        asset.category === 'Crypto' ? 'text-orange-500' :
                                                                            asset.category === 'Stock' ? 'text-indigo-500' :
                                                                                asset.category === 'Investment' ? 'text-indigo-500' :
                                                                                    asset.category === 'Fixed' ? 'text-blue-400' :
                                                                                        asset.category === 'Receivables' ? 'text-orange-400' : 'text-red-400'
                                                                )}
                                                            />
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-foreground">{asset.name}</div>
                                                            {asset.ticker && <div className="text-xs text-muted-foreground">{asset.ticker}</div>}
                                                        </div>
                                                        {asset.include_in_net_worth === false && (
                                                            <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 font-medium">Excluded</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-sm text-muted-foreground text-right">
                                                    {getTranslatedSubCategory(asset.sub_category)}
                                                </td>
                                                <td className="p-4 text-right tabular-nums font-bold text-foreground">
                                                    {isPrivacyMode ? '****' : `$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)}`}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
                {filteredAssets.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                        {search ? `${t('no_assets_found_matching')} "${search}"` : t('no_assets_yet')}
                    </div>
                )}
            </div>

            {

                historyAsset && (
                    <AssetActionDialog
                        isOpen={!!historyAsset}
                        onClose={() => {
                            setHistoryAsset(null);
                            refreshData(); // Refresh on close to capture any changes
                        }}
                        asset={historyAsset}
                        allAssets={assets}
                        initialMode='history'
                    />
                )
            }
        </div >
    );
}
