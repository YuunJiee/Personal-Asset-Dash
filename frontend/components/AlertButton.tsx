'use client';

import { useState, useEffect } from 'react';
import { Bell, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from "@/components/ui/dialog";
import { cn } from '@/lib/utils';
import { Input } from "@/components/ui/input";
import { CustomSelect } from "@/components/ui/custom-select";
import { useLanguage } from '@/components/LanguageProvider';
import { API_URL } from '@/lib/api';

interface Alert {
    id: number;
    target_price: number;
    condition: 'ABOVE' | 'BELOW';
    is_active: boolean;
    triggered_at: string | null;
}

interface AlertButtonProps {
    assetId: number;
    currentPrice: number;
    ticker: string;
}

export function AlertButton({ assetId, currentPrice, ticker }: AlertButtonProps) {
    const { t } = useLanguage();
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [newPrice, setNewPrice] = useState<string>('');
    const [condition, setCondition] = useState<'ABOVE' | 'BELOW'>('BELOW');

    const fetchAlerts = async () => {
        try {
            const res = await fetch(`${API_URL}/alerts/${assetId}`);
            if (res.ok) {
                const data = await res.json();
                setAlerts(data);
            }
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchAlerts();
            setNewPrice(''); // Reset input
        }
    }, [isOpen, assetId]);

    const handleCreateAlert = async (e: React.FormEvent) => {
        e.preventDefault();
        const price = parseFloat(newPrice);
        if (isNaN(price)) return;

        try {
            const res = await fetch(`${API_URL}/alerts/${assetId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    target_price: price,
                    condition: condition
                })
            });
            if (res.ok) {
                setNewPrice('');
                fetchAlerts();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteAlert = async (id: number) => {
        try {
            await fetch(`${API_URL}/alerts/${id}`, { method: 'DELETE' });
            fetchAlerts();
        } catch (error) {
            console.error(error);
        }
    };

    const handlePriceInputChange = (val: string) => {
        setNewPrice(val);
        const price = parseFloat(val);
        if (!isNaN(price) && currentPrice > 0) {
            if (price > currentPrice) setCondition('ABOVE');
            else setCondition('BELOW');
        }
    };

    const activeAlertsCount = alerts.filter(a => !a.triggered_at).length;
    const triggeredAlertsCount = alerts.filter(a => a.triggered_at).length;

    return (
        <>
            <Button
                variant="ghost"
                className="h-8 w-8 p-0 rounded-full relative"
                onClick={() => setIsOpen(true)}
            >
                <Bell className={cn("h-4 w-4", activeAlertsCount > 0 ? "fill-primary text-primary" : "text-muted-foreground")} />
                {triggeredAlertsCount > 0 && (
                    <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                )}
            </Button>

            <Dialog isOpen={isOpen} onClose={() => setIsOpen(false)} title={`${t('price_alerts')}: ${ticker}`}>
                <div className="space-y-6">
                    {/* Create New Alert */}
                    <form onSubmit={handleCreateAlert} className="flex gap-2 items-end border-b border-border pb-6">
                        <div className="flex-1 space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('target_price')}</label>
                            <Input
                                type="number"
                                value={newPrice}
                                onChange={(e) => handlePriceInputChange(e.target.value)}
                                className="h-10"
                                placeholder={currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                required
                            />
                        </div>
                        <div className="w-28 space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('condition')}</label>
                            <CustomSelect
                                value={condition}
                                onChange={(val) => setCondition(val as 'ABOVE' | 'BELOW')}
                                options={[
                                    { value: 'ABOVE', label: `≥ ${t('above')}` },
                                    { value: 'BELOW', label: `≤ ${t('below')}` }
                                ]}
                                className="h-10"
                            />
                        </div>
                        <Button type="submit" disabled={!newPrice} className="h-10 w-10 p-0 rounded-xl shrink-0">
                            <Plus className="h-5 w-5" />
                        </Button>
                    </form>

                    {/* Existing Alerts */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('active_alerts')}</h4>
                        {alerts.length === 0 && <div className="text-sm text-muted-foreground text-center py-4 bg-muted/20 rounded-xl">{t('no_alerts_set')}</div>}

                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {alerts.map(alert => (
                                <div key={alert.id} className={cn(
                                    "flex items-center justify-between p-3 rounded-2xl border transition-colors",
                                    alert.triggered_at
                                        ? "bg-red-50 border-red-200 text-red-900"
                                        : "bg-card border-border/50 hover:border-primary/50"
                                )}>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", alert.condition === 'ABOVE' ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700")}>
                                                {alert.condition}
                                            </span>
                                            <span className="font-mono font-medium text-lg">
                                                {alert.target_price.toLocaleString()}
                                            </span>
                                        </div>
                                        {alert.triggered_at && (
                                            <div className="text-xs text-red-600 font-bold mt-1 animate-pulse">
                                                {t('triggered')}: {new Date(alert.triggered_at).toLocaleString()}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleDeleteAlert(alert.id)}
                                        className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </Dialog>
        </>
    );
}
