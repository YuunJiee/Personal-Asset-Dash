'use client';

import { useState, useMemo } from "react";
import { ArrowDownLeft, ArrowUpRight, History } from "lucide-react";
import { usePrivacy } from "@/components/PrivacyProvider";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/LanguageProvider";
import { useDashboard } from "@/lib/hooks";
import type { Asset, Transaction } from "@/lib/types";
import { TransactionEditDialog } from "@/components/TransactionEditDialog";
import { PageHeaderSkeleton, TableRowSkeleton } from "@/components/ui/skeleton";

/** Transaction enriched with its parent asset metadata for display purposes. */
interface EnrichedTransaction extends Transaction {
    assetName: string;
    assetTicker?: string | null;
    category: Asset['category'];
    assetSource?: string;
    valueTwd?: number;
}

export default function HistoryPage() {
    const [range, setRange] = useState<string>('all');
    const [selectedTx, setSelectedTx] = useState<EnrichedTransaction | null>(null);
    const { isPrivacyMode } = usePrivacy();
    const { t } = useLanguage();
    const { assets, refresh, isLoading } = useDashboard();

    // Flatten all transactions from all assets, preserving asset metadata.
    const transactions = useMemo<EnrichedTransaction[]>(() => {
        const allTxns: EnrichedTransaction[] = [];
        assets.forEach(asset => {
            if (asset.transactions) {
                asset.transactions.forEach(txn => {
                    allTxns.push({
                        ...txn,
                        assetName: asset.name,
                        assetTicker: asset.ticker,
                        category: asset.category,
                        assetSource: asset.source,
                        valueTwd: asset.value_twd,
                    });
                });
            }
        });
        return allTxns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [assets]);

    if (isLoading) return (
        <div className="min-h-screen bg-background p-6 md:p-10 space-y-4">
            <PageHeaderSkeleton />
            {/* Range tabs placeholder */}
            <div className="flex justify-end mb-6">
                <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="w-10 h-6 rounded-md bg-muted animate-pulse" />
                    ))}
                </div>
            </div>
            <div className="bg-card rounded-3xl border border-border overflow-hidden">
                {Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} />)}
            </div>
        </div>
    );

    const handleRowClick = (txn: EnrichedTransaction) => {
        if (txn.assetSource === 'max') {
            return;
        }
        setSelectedTx(txn);
    };

    // Filter Logic
    const filteredTransactions = transactions.filter(txn => {
        if (range === 'all') return true;
        const txnDate = new Date(txn.date);
        const now = new Date();
        let limit = new Date();

        switch (range) {
            case '30d': limit.setDate(now.getDate() - 30); break;
            case '3mo': limit.setMonth(now.getMonth() - 3); break;
            case '6mo': limit.setMonth(now.getMonth() - 6); break;
            case '1y': limit.setFullYear(now.getFullYear() - 1); break;
            default: return true;
        }
        return txnDate >= limit;
    });

    return (
        <div className="min-h-screen bg-background p-6 md:p-10 text-foreground transition-colors duration-300">
            <header className="mb-8 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-500/10 flex items-center justify-center text-gray-500">
                    <History className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('history_title')}</h1>
                    <p className="text-muted-foreground mt-1">{t('history_desc')}</p>
                </div>
            </header>

            {/* Range Selector */}
            <div className="flex justify-end mb-6">
                <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
                    {['30d', '3mo', '6mo', '1y', 'all'].map((r) => (
                        <button
                            key={r}
                            onClick={() => setRange(r)}
                            className={cn(
                                "px-3 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap",
                                range === r
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {t(`range_${r}`)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden space-y-4">
                {filteredTransactions.map((txn, idx) => (
                    <div
                        key={idx}
                        className={cn(
                            "bg-card p-4 rounded-2xl shadow-sm border border-border transition-colors",
                            txn.assetSource === 'max' ? "cursor-default" : "cursor-pointer hover:bg-muted/50"
                        )}
                        onClick={() => handleRowClick(txn)}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <div className="font-bold text-foreground">{txn.assetName}</div>
                                <div className="text-xs text-muted-foreground">
                                    {new Date(txn.date).toLocaleDateString('zh-TW')} • {t(txn.category) || txn.category}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="font-mono font-bold text-foreground">
                                    {isPrivacyMode ? '****' : ((txn.amount > 0 ? '+' : '') + txn.amount.toLocaleString())}
                                </div>
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium mt-1 ${txn.amount >= 0 ? 'bg-trend-up-soft text-trend-up' : 'bg-trend-down-soft text-trend-down'}`}>
                                    {txn.category === 'Liabilities'
                                        ? (txn.amount > 0 ? t('borrow_spend') : t('repay_reduce'))
                                        : (txn.amount >= 0 ? t('increase_buy') : t('decrease_sell'))
                                    }
                                </span>
                            </div>
                        </div>
                        {txn.buy_price > 0 && (
                            <div className="text-xs text-muted-foreground items-center flex gap-1 mt-2 border-t border-border/50 pt-2">
                                <span>{t('price_at_time')}:</span>
                                <span className="font-mono">${txn.buy_price}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="hidden md:block bg-card rounded-3xl shadow-sm border border-border overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-muted text-xs text-muted-foreground uppercase tracking-wider border-b border-border">
                            <th className="p-4 font-medium">{t('date')}</th>
                            <th className="p-4 font-medium">{t('asset')}</th>
                            <th className="p-4 font-medium">{t('type')}</th>
                            <th className="p-4 font-medium text-right">{t('change_amount')}</th>
                            <th className="p-4 font-medium text-right">{t('price_at_time')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filteredTransactions.map((txn, idx) => (
                            <tr
                                key={idx}
                                className={cn(
                                    "transition-colors group",
                                    txn.assetSource === 'max' ? "cursor-default" : "hover:bg-muted/50 cursor-pointer"
                                )}
                                onClick={() => handleRowClick(txn)}
                            >
                                <td className="p-4 text-sm text-muted-foreground">
                                    {new Date(txn.date).toLocaleString('zh-TW', { hour12: false, timeZone: 'Asia/Taipei' })}
                                </td>
                                <td className="p-4">
                                    <div className="font-bold text-foreground">{txn.assetName}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {t(txn.category) || txn.category}
                                        {txn.assetTicker ? ` • ${txn.assetTicker}` : ''}
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${txn.amount >= 0 ? 'bg-trend-up-soft text-trend-up' : 'bg-trend-down-soft text-trend-down'}`}>
                                        {txn.amount >= 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownLeft className="w-3 h-3 mr-1" />}
                                        {txn.category === 'Liabilities'
                                            ? (txn.amount > 0 ? t('borrow_spend') : t('repay_reduce'))
                                            : (txn.amount >= 0 ? t('increase_buy') : t('decrease_sell'))
                                        }
                                    </span>
                                </td>
                                <td className="p-4 text-right font-mono font-medium text-foreground">
                                    {isPrivacyMode ? '****' : ((txn.amount > 0 ? '+' : '') + txn.amount.toLocaleString())}
                                </td>
                                <td className="p-4 text-right text-muted-foreground text-sm">
                                    {txn.buy_price > 0 ? `$${txn.buy_price}` : '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <TransactionEditDialog
                isOpen={!!selectedTx}
                onClose={() => setSelectedTx(null)}
                transaction={selectedTx}
                onSuccess={refresh}
            />
        </div>
    );
}
