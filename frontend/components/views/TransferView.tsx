'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { transferFunds } from '@/lib/api';
import { ArrowRightLeft, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Asset } from '@/lib/types';

interface TransferViewProps {
    onClose: () => void;
    assets: Asset[];
    initialFromAssetId?: number;
    onBack?: () => void;
}

export function TransferView({ onClose, assets, initialFromAssetId, onBack }: TransferViewProps) {
    const router = useRouter();
    const { t } = useLanguage();
    const [loading, setLoading] = useState(false);

    // Sort assets by name to make it easier to find
    const sortedAssets = [...assets].sort((a, b) => a.name.localeCompare(b.name));

    const [formData, setFormData] = useState({
        fromId: '',
        toId: '',
        amount: '',
        fee: '',
        date: ''
    });

    // Reset or Set Initial State when opened
    useEffect(() => {
        if (initialFromAssetId) {
            setFormData(prev => ({
                ...prev,
                fromId: String(initialFromAssetId),
                toId: '',
                amount: '',
                fee: '',
                date: ''
            }));
        } else {
            setFormData({ fromId: '', toId: '', amount: '', fee: '', date: '' });
        }
    }, [initialFromAssetId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (!formData.fromId || !formData.toId || !formData.amount) {
                alert('Please fill in all fields');
                return;
            }

            if (formData.fromId === formData.toId) {
                alert('Cannot transfer to the same account');
                return;
            }

            await transferFunds({
                from_asset_id: parseInt(formData.fromId),
                to_asset_id: parseInt(formData.toId),
                amount: parseFloat(formData.amount),
                fee: formData.fee ? parseFloat(formData.fee) : 0,
                date: formData.date || undefined
            });

            router.refresh();
            onClose();
            setFormData({ fromId: '', toId: '', amount: '', fee: '', date: '' });
        } catch (error: any) {
            console.error("Transfer failed", error);
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <form onSubmit={handleSubmit} className="space-y-4">

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>{t('from')}</Label>
                        <select
                            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                            value={formData.fromId}
                            onChange={(e) => setFormData({ ...formData, fromId: e.target.value })}
                            required
                        >
                            <option value="">{t('select_source')}</option>
                            {Object.entries(
                                sortedAssets.reduce((acc, asset) => {
                                    const cat = asset.category || 'Other';
                                    if (!acc[cat]) acc[cat] = [];
                                    acc[cat].push(asset);
                                    return acc;
                                }, {} as Record<string, typeof assets>)
                            ).map(([category, items]) => (
                                <optgroup key={category} label={category}>
                                    {items.map(a => (
                                        <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                        {formData.fromId && (
                            <div className="text-xs text-muted-foreground text-right px-1">
                                {t('balance')}: ${new Intl.NumberFormat('en-US').format(
                                    assets.find(a => a.id === parseInt(formData.fromId))?.value_twd ??
                                    ((assets.find(a => a.id === parseInt(formData.fromId))?.current_price || 0) *
                                        (assets.find(a => a.id === parseInt(formData.fromId))?.transactions?.reduce((sum: number, t) => sum + t.amount, 0) || 0))
                                )}
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>{t('to')}</Label>
                        <select
                            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                            value={formData.toId}
                            onChange={(e) => setFormData({ ...formData, toId: e.target.value })}
                            required
                        >
                            <option value="">{t('select_destination')}</option>
                            {Object.entries(
                                sortedAssets.reduce((acc, asset) => {
                                    const cat = asset.category || 'Other';
                                    if (!acc[cat]) acc[cat] = [];
                                    acc[cat].push(asset);
                                    return acc;
                                }, {} as Record<string, typeof assets>)
                            ).map(([category, items]) => (
                                <optgroup key={category} label={category}>
                                    {items.map(a => (
                                        <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                        {formData.toId && (
                            <div className="text-xs text-muted-foreground text-right px-1">
                                {t('balance')}: ${new Intl.NumberFormat('en-US').format(
                                    assets.find(a => a.id === parseInt(formData.toId))?.value_twd ??
                                    ((assets.find(a => a.id === parseInt(formData.toId))?.current_price || 0) *
                                        (assets.find(a => a.id === parseInt(formData.toId))?.transactions?.reduce((sum: number, t) => sum + t.amount, 0) || 0))
                                )}
                            </div>
                        )}
                    </div>
                </div>



                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>{t('amount')}</Label>
                        <Input
                            type="number"
                            step="any"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            placeholder="0.00"
                            className="font-mono text-lg"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>{t('fee_optional')}</Label>
                        <Input
                            type="number"
                            step="any"
                            value={formData.fee}
                            onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
                            placeholder="0.00"
                            className="font-mono text-sm text-muted-foreground"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>{t('date_optional')}</Label>
                    <Input
                        type="datetime-local"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                </div>

                <div className="flex justify-between pt-4">
                    {onBack && (
                        <Button type="button" variant="ghost" onClick={onBack}>
                            <ArrowLeft className="w-4 h-4 mr-1" /> {t('back')}
                        </Button>
                    )}
                    <div className="flex gap-2 ml-auto">
                        {/* <Button type="button" variant="ghost" onClick={onClose}>{t('cancel')}</Button> */}
                        <Button type="submit" disabled={loading || !formData.fromId || !formData.toId || !formData.amount}>
                            {loading ? t('transferring') : t('confirm')}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}
