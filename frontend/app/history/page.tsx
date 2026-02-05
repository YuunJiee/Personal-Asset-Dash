'use client';

import { useState, useEffect } from "react";
import { ArrowDownLeft, ArrowUpRight, Trash2 } from "lucide-react";
import { usePrivacy } from "@/components/PrivacyProvider";
import { cn } from "@/lib/utils";


import { useLanguage } from "@/components/LanguageProvider";

async function fetchAssets() {
    const res = await fetch('http://localhost:8000/api/assets/');
    if (!res.ok) throw new Error("Failed");
    return res.json();
}

// ... imports
import { TransactionEditDialog } from "@/components/TransactionEditDialog";

export default function HistoryPage() {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [selectedTx, setSelectedTx] = useState<any | null>(null);
    const { isPrivacyMode } = usePrivacy();
    const { t } = useLanguage();

    const fetchTxns = () => {
        fetchAssets().then(assets => {
            const allTxns: any[] = [];
            assets.forEach((asset: any) => {
                if (asset.transactions) {
                    asset.transactions.forEach((t: any) => {
                        allTxns.push({
                            ...t,
                            assetName: asset.name,
                            assetTicker: asset.ticker,
                            category: asset.category,
                            assetSource: asset.source, // Important for check
                            valueTwd: asset.value_twd
                        });
                    });
                }
            });
            // Sort by date desc
            allTxns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setTransactions(allTxns);
        }).catch(console.error);
    };

    useEffect(() => {
        fetchTxns();
    }, []);

    const handleRowClick = (txn: any) => {
        if (txn.assetSource === 'max') {
            return;
        }
        setSelectedTx(txn);
    };

    return (
        <div className="min-h-screen bg-background p-6 md:p-10 text-foreground transition-colors duration-300">
            <header className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('history_title')}</h1>
                <p className="text-muted-foreground mt-1">{t('history_desc')}</p>
            </header>

            {/* Mobile Card List */}
            <div className="md:hidden space-y-4">
                {transactions.map((txn, idx) => (
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
                                    {new Date(txn.date).toLocaleDateString('zh-TW')} • {t(txn.category as any) || txn.category}
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
                        {transactions.map((txn, idx) => (
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
                                        {t(txn.category as any) || txn.category}
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
                onSuccess={fetchTxns}
            />
        </div>
    );
}
