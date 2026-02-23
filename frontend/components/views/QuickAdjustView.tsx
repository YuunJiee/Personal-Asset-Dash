'use client';

import { useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTransaction } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

interface QuickAdjustViewProps {
    asset: any;
    onClose: () => void;
    onBack?: () => void;
}

export function QuickAdjustView({ asset, onClose, onBack }: QuickAdjustViewProps) {
    const router = useRouter();
    const { t } = useLanguage();
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<'set' | 'adjust'>('set');
    const [value, setValue] = useState('');

    const currentBalance = asset ? asset.transactions.reduce((acc: number, t: any) => acc + t.amount, 0) : 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const amount = parseFloat(value);
            if (isNaN(amount)) return;

            let diff = 0;
            if (mode === 'set') {
                diff = amount - currentBalance;
            } else {
                diff = amount; // Adjust mode assumes + or - value input
            }

            if (diff !== 0) {
                await createTransaction(asset.id, {
                    amount: diff,
                    buy_price: asset.current_price || 1,
                    date: new Date().toISOString()
                });
            }

            router.refresh();
            onClose();
            setValue('');
        } catch (error) {
            console.error("Failed to adjust balance", error);
        } finally {
            setLoading(false);
        }
    };

    // Reset when asset changes
    // mode and value state are local, should reset if asset changes essentially.

    return (
        <div>
            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Mode Toggle */}
                <div className="flex bg-muted p-1 rounded-xl">
                    <button
                        type="button"
                        className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${mode === 'set' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        onClick={() => { setMode('set'); setValue(''); }}
                    >
                        {t('set_final_balance')}
                    </button>
                    <button
                        type="button"
                        className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${mode === 'adjust' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        onClick={() => { setMode('adjust'); setValue(''); }}
                    >
                        {t('adjust_plus_minus')}
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="text-center">
                        <div className="text-sm text-muted-foreground mb-1">{t('current_balance')}</div>
                        <div className="text-3xl font-bold font-mono">${currentBalance.toLocaleString()}</div>
                    </div>

                    <div className="space-y-2">
                        <Label>
                            {mode === 'set' ? t('new_balance') : t('amount_to_add_sub')}
                        </Label>
                        <Input
                            type="number"
                            step="any"
                            autoFocus
                            placeholder={mode === 'set' ? "e.g. 5000" : "e.g. -200"}
                            className="font-mono text-xl h-12"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                        />
                        {mode === 'set' && value && !isNaN(parseFloat(value)) && (
                            <div className="text-xs text-muted-foreground text-right">
                                Adjustment: {parseFloat(value) - currentBalance > 0 ? '+' : ''}
                                {(parseFloat(value) - currentBalance).toLocaleString()}
                            </div>
                        )}
                        {mode === 'adjust' && value && !isNaN(parseFloat(value)) && (
                            <div className="text-xs text-muted-foreground text-right">
                                New Balance: ${(currentBalance + parseFloat(value)).toLocaleString()}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-between pt-2">
                    {onBack && (
                        <Button type="button" variant="ghost" onClick={onBack}>
                            <ArrowLeft className="w-4 h-4 mr-1" /> {t('back')}
                        </Button>
                    )}
                    <div className="flex gap-2 ml-auto">
                        {/* <Button type="button" variant="ghost" onClick={onClose}>{t('cancel')}</Button> */}
                        <Button type="submit" disabled={loading || !value}>
                            {loading ? t('loading') : t('confirm')}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}
