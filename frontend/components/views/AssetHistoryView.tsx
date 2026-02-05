import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/components/LanguageProvider';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, ArrowRightLeft, Pencil, Wallet } from 'lucide-react';

interface Transaction {
    id: number;
    amount: number;
    buy_price: number;
    date: string;
    is_transfer: boolean;
}

interface Asset {
    id: number;
    name: string;
    ticker?: string;
    category: string;
    sub_category?: string;
    current_price: number;
    icon?: string;
    transactions: Transaction[];
    source?: string;
}

interface AssetHistoryDialogProps {
    isOpen: boolean;
    onClose: () => void;
    asset: Asset | null;
    onEdit?: () => void;
    onAdjustBalance?: () => void;
    onTransfer?: () => void;
}

export function AssetHistoryView({ asset, onEdit, onAdjustBalance, onTransfer }: Omit<AssetHistoryDialogProps, 'isOpen' | 'onClose'>) {
    const { t } = useLanguage();

    if (!asset) return null;

    // Sort transactions by date (newest first)
    const sortedTransactions = [...(asset.transactions || [])].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Calculate running balance
    let runningBalance = 0;
    const transactionsWithBalance = sortedTransactions.reverse().map(tx => {
        runningBalance += tx.amount;
        return {
            ...tx,
            balance: runningBalance
        };
    }).reverse();

    const totalQuantity = asset.transactions?.reduce((sum, tx) => sum + tx.amount, 0) || 0;
    const totalValue = asset.current_price * totalQuantity;
    const isCrypto = asset.sub_category?.includes('Crypto');

    return (
        <div className="space-y-4">
            {/* Asset Summary */}
            <div className="bg-muted/50 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-sm text-muted-foreground">{t('current_holdings')}</div>
                        <div className="text-2xl font-bold tabular-nums">
                            {totalQuantity.toLocaleString(undefined, {
                                minimumFractionDigits: isCrypto ? 8 : 0,
                                maximumFractionDigits: isCrypto ? 8 : 2
                            })}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-muted-foreground">{t('value_twd')}</div>
                        <div className="text-2xl font-bold tabular-nums">
                            ${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                    </div>
                </div>
                {asset.ticker && (
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                        <div className="text-xs text-muted-foreground">{t('ticker')}</div>
                        <div className="text-sm font-medium">{asset.ticker}</div>
                    </div>
                )}
            </div>

            {/* Transaction History */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                        {t('transaction_history')}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                        {sortedTransactions.length} {t('transactions')}
                    </span>
                </div>

                {sortedTransactions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        {t('no_transactions_yet')}
                    </div>
                ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {transactionsWithBalance.map((tx) => {
                            const isPositive = tx.amount > 0;
                            const isTransfer = tx.is_transfer;

                            return (
                                <div
                                    key={tx.id}
                                    className="flex items-center justify-between p-3 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                                            isTransfer ? "bg-blue-500/10" :
                                                isPositive ? "bg-emerald-500/10" : "bg-red-500/10"
                                        )}>
                                            {isTransfer ? (
                                                <ArrowRightLeft className={cn("w-4 h-4 text-blue-500")} />
                                            ) : isPositive ? (
                                                <TrendingUp className="w-4 h-4 text-emerald-500" />
                                            ) : (
                                                <TrendingDown className="w-4 h-4 text-red-500" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className={cn(
                                                    "font-semibold tabular-nums",
                                                    isPositive ? "text-emerald-500" : "text-red-500"
                                                )}>
                                                    {isPositive ? '+' : ''}{tx.amount.toLocaleString(undefined, {
                                                        minimumFractionDigits: isCrypto ? 8 : 0,
                                                        maximumFractionDigits: isCrypto ? 8 : 2
                                                    })}
                                                </span>
                                                {isTransfer && (
                                                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400">
                                                        {t('transfer')}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {new Date(tx.date).toLocaleDateString()} • {t('balance')}: {tx.balance.toLocaleString(undefined, {
                                                    minimumFractionDigits: isCrypto ? 8 : 0,
                                                    maximumFractionDigits: isCrypto ? 8 : 2
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                    {!isTransfer && tx.buy_price > 0 && (
                                        <div className="text-right">
                                            <div className="text-xs text-muted-foreground">{t('price')}</div>
                                            <div className="text-sm font-medium tabular-nums">
                                                {tx.buy_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t border-border">
                {asset['source'] === 'max' ? (
                    <div className="flex items-center text-xs text-muted-foreground mr-auto bg-muted/50 px-3 py-1 rounded-full">
                        Managed by MAX Integration
                    </div>
                ) : (
                    <>
                        <Button
                            variant="ghost"
                            onClick={() => {
                                if (onAdjustBalance) onAdjustBalance();
                            }}
                            className="w-10 h-10 p-0 hover:bg-green-500/10 hover:text-green-600"
                            title={t('adjust_balance')}
                        >
                            <Wallet className="w-5 h-5" />
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => {
                                if (onTransfer) onTransfer();
                            }}
                            className="w-10 h-10 p-0 hover:bg-blue-500/10 hover:text-blue-600"
                            title={t('transfer')}
                        >
                            <ArrowRightLeft className="w-5 h-5" />
                        </Button>
                        <Button
                            onClick={() => {
                                if (onEdit) onEdit();
                            }}
                            className="w-10 h-10 p-0 hover:bg-primary/10"
                            title={t('edit')}
                        >
                            <Pencil className="w-5 h-5" />
                        </Button>
                    </>
                )}
                {/* Allow Transfer for MAX? Yes, user might move funds OUT. But 'balance' is auto-synced. */}
                {/* If user transfers out, MAX balance decreases on next sync. */}
                {/* BUT internal transfer logic reduces balance immediately. */}
                {/* If we allow transfer, next sync might 'correct' it back if MAX hasn't updated or vice versa. */}
                {/* Let's keep Transfer enabled but maybe warn? Or just disable for consistency with "Auto-Sync" paradigm. */}
                {/* User said "Lock it". Let's lock everything for now to be safe. */}
                {/* Actually, let me just add the MAX lock block above. */}
                {/* Re-adding Transfer button for MAX? Maybe not if fully managed. */}
                {/* Wait, if I transfer 1 BTC from MAX to Wallet, MAX balance decreases. My App needs to reflect that. */}
                {/* If I do it in App, App decreases MAX asset, increases Wallet asset. */}
                {/* 1 hour later, Sync runs. MAX API says "1 BTC less". App sees DB has "1 BTC less". Matches. */}
                {/* So Transfer IS valid. But Adjust Balance (arbitrary change) is NOT valid. */}
                {/* Edit (rename/ticker) IS NOT valid. */}

                {/* Modified Plan: Allow Transfer, Disable Adjust/Edit. */}

                {/* Transfer button removed for MAX as per user request */}
            </div>
        </div>
    );
}
