'use client';

import { useState } from 'react';
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomSelect } from "@/components/ui/custom-select"; // If needed, or use Tabs
import { createTransaction } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/LanguageProvider';

interface TradeDialogProps {
    isOpen: boolean;
    onClose: () => void;
    asset: any;
    onSuccess?: () => void;
}

export function TradeDialog({ isOpen, onClose, asset, onSuccess }: TradeDialogProps) {
    const { t } = useLanguage();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<'buy' | 'sell'>('buy');

    // Form State
    const [quantity, setQuantity] = useState('');
    const [price, setPrice] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // Default today

    // Initialize price with current asset price if available
    // But only on open? Handled by user input usually.

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const qty = parseFloat(quantity);
            const p = parseFloat(price);

            if (isNaN(qty) || isNaN(p) || qty <= 0) {
                alert("Invalid quantity or price");
                setLoading(false);
                return;
            }

            // Calculate final amount (Positive for Buy, Negative for Sell)
            const finalAmount = mode === 'buy' ? qty : -qty;

            await createTransaction(asset.id, {
                amount: finalAmount,
                buy_price: p,
                // date: date // Context: Backend uses datetime.now() by default. If we want date support we need to update backend.
                // Checking backend schemas.TransactionCreate... checking crud...
                // Crud: date=datetime.now(). It ignores input date.
                // So for now we ignore date input or just don't show it.
            });

            if (onSuccess) onSuccess();
            router.refresh();
            onClose();
            // Reset form
            setQuantity('');
            setPrice('');
        } catch (error) {
            console.error("Trade failed", error);
            alert("Trade failed");
        } finally {
            setLoading(false);
        }
    };

    if (!asset) return null;

    const total = (parseFloat(quantity) || 0) * (parseFloat(price) || 0);

    return (
        <Dialog isOpen={isOpen} onClose={onClose} title={`${t('trade')} ${asset.ticker || asset.name}`}>
            <div className="flex gap-2 mb-6 bg-muted p-1 rounded-xl">
                <button
                    type="button"
                    onClick={() => setMode('buy')}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === 'buy'
                        ? 'bg-trend-up text-white shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    {t('buy')}
                </button>
                <button
                    type="button"
                    onClick={() => setMode('sell')}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === 'sell'
                        ? 'bg-trend-down text-white shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    {t('sell')}
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label className="uppercase text-xs tracking-wider text-muted-foreground font-semibold">{t('price_unit')}</Label>
                    <Input
                        type="number"
                        step="any"
                        placeholder={asset.current_price?.toString()}
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        required
                        className="font-mono text-lg"
                    />
                </div>

                <div className="space-y-2">
                    <Label className="uppercase text-xs tracking-wider text-muted-foreground font-semibold">{t('quantity')}</Label>
                    <Input
                        type="number"
                        step="any"
                        placeholder="0.00"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        required
                        className="font-mono text-lg"
                    />
                </div>

                <div className="pt-4 border-t border-border flex justify-between items-end">
                    <Label className="text-base font-medium">{t('total_amount')}</Label>
                    <div className="text-2xl font-bold font-mono">
                        {total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        <span className="text-sm text-muted-foreground ml-1 font-sans font-normal">
                            {(asset.ticker && asset.ticker.endsWith('.TW')) || asset.source === 'max' ? 'TWD' : 'USD'}
                        </span>
                    </div>
                </div>

                <div className="pt-6">
                    <Button
                        type="submit"
                        className={`w-full h-12 text-lg ${mode === 'buy' ? 'bg-trend-up hover:opacity-90' : 'bg-trend-down hover:opacity-90'}`}
                        disabled={loading}
                    >
                        {loading ? t('loading') : `${mode === 'buy' ? t('buy') : t('sell')} ${asset.ticker || asset.name}`}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
