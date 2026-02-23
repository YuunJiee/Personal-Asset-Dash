'use client';

import { useState, useEffect } from 'react';
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomSelect } from "@/components/ui/custom-select";
import { useRouter } from 'next/navigation';
import { useLanguage } from "@/components/LanguageProvider";
import { cn } from "@/lib/utils";

import { API_URL } from '@/lib/api';
import { Trash2 } from 'lucide-react';

// Categories available for allocation goals
const ALLOCATION_CATEGORIES = ['Fluid', 'Stock', 'Crypto', 'Fixed', 'Receivables'];

type AllocationMap = Record<string, number>; // { Fluid: 20, Stock: 50, ... }

function parseAllocation(description?: string): AllocationMap {
    if (!description) return { Stock: 60, Fluid: 40 };
    try {
        const parsed = JSON.parse(description);
        if (typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch (_) { }
    // Legacy single-category format
    return { [description]: 100 };
}

interface GoalDialogProps {
    isOpen: boolean;
    onClose: () => void;
    initialGoal?: any;
}

export function GoalDialog({ isOpen, onClose, initialGoal }: GoalDialogProps) {
    const router = useRouter();
    const { t } = useLanguage();
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [goalType, setGoalType] = useState<'NET_WORTH' | 'ASSET_ALLOCATION'>('NET_WORTH');
    const [name, setName] = useState('');
    const [targetAmount, setTargetAmount] = useState('');
    // Allocation map: category -> target %
    const [allocation, setAllocation] = useState<AllocationMap>({ Stock: 60, Fluid: 20, Crypto: 20 });

    const goalTypes = [
        { value: 'NET_WORTH', label: t('type_net_worth') },
        { value: 'ASSET_ALLOCATION', label: t('type_asset_allocation') },
    ];

    useEffect(() => {
        if (initialGoal) {
            setGoalType(initialGoal.goal_type || 'NET_WORTH');
            setName(initialGoal.name || '');
            setTargetAmount(String(initialGoal.target_amount || ''));
            if (initialGoal.goal_type === 'ASSET_ALLOCATION') {
                setAllocation(parseAllocation(initialGoal.description));
            }
        } else {
            setGoalType('NET_WORTH');
            setName('');
            setTargetAmount('');
            setAllocation({ Stock: 60, Fluid: 20, Crypto: 20 });
        }
    }, [initialGoal, isOpen]);

    // ----- Allocation editor helpers -----
    const total = Object.values(allocation).reduce((s, v) => s + (v || 0), 0);
    const remaining = 100 - total;

    const setPercent = (category: string, value: number) => {
        setAllocation(prev => ({ ...prev, [category]: Math.max(0, Math.min(100, value)) }));
    };

    const addCategory = (cat: string) => {
        if (cat in allocation) return;
        setAllocation(prev => ({ ...prev, [cat]: 0 }));
    };

    const removeCategory = (cat: string) => {
        const next = { ...allocation };
        delete next[cat];
        setAllocation(next);
    };

    const availableToAdd = ALLOCATION_CATEGORIES.filter(c => !(c in allocation));

    // ----- Submit -----
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (goalType === 'ASSET_ALLOCATION' && Math.abs(total - 100) > 0.01) return;
        setLoading(true);

        const payload =
            goalType === 'NET_WORTH'
                ? {
                    name,
                    target_amount: parseFloat(targetAmount),
                    goal_type: 'NET_WORTH',
                    description: null,
                }
                : {
                    name,
                    target_amount: 100,
                    goal_type: 'ASSET_ALLOCATION',
                    description: JSON.stringify(allocation),
                };

        try {
            const url = initialGoal ? `${API_URL}/goals/${initialGoal.id}` : `${API_URL}/goals/`;
            await fetch(url, {
                method: initialGoal ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            onClose();
            router.refresh();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // ----- Delete -----
    const handleDelete = async () => {
        if (!initialGoal) return;
        if (!window.confirm(t('delete_goal_confirm'))) return;
        setDeleting(true);
        try {
            await fetch(`${API_URL}/goals/${initialGoal.id}`, { method: 'DELETE' });
            onClose();
            router.refresh();
        } catch (err) {
            console.error(err);
        } finally {
            setDeleting(false);
        }
    };

    const isAllocation = goalType === 'ASSET_ALLOCATION';
    const isValid = isAllocation ? Math.abs(total - 100) <= 0.01 : !!targetAmount;

    return (
        <Dialog isOpen={isOpen} onClose={onClose} title={initialGoal ? t('update_financial_goal') : t('set_financial_goal')}>
            <form onSubmit={handleSubmit} className="space-y-5">

                {/* Goal Type */}
                <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('goal_type_label')}</Label>
                    <CustomSelect value={goalType} onChange={(v) => setGoalType(v as any)} options={goalTypes} />
                </div>

                {/* Goal Name */}
                <div className="space-y-2">
                    <Label>{t('goal_name')}</Label>
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        placeholder={isAllocation ? t('ph_allocation_goal') : t('ph_fire_goal')}
                    />
                </div>

                {/* NET_WORTH: target amount */}
                {!isAllocation && (
                    <div className="space-y-2">
                        <Label>{t('target_amount_twd')}</Label>
                        <Input
                            type="number"
                            className="font-mono"
                            value={targetAmount}
                            onChange={(e) => setTargetAmount(e.target.value)}
                            required
                            placeholder={t('ph_target_amount')}
                        />
                    </div>
                )}

                {/* ASSET_ALLOCATION: multi-category editor */}
                {isAllocation && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {t('allocation_targets')}
                            </Label>
                            {/* Total badge */}
                            <span className={cn(
                                'text-xs font-bold px-2 py-0.5 rounded-full',
                                Math.abs(total - 100) <= 0.01
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-red-100 text-red-700'
                            )}>
                                {total.toFixed(0)}% / 100%
                            </span>
                        </div>

                        {/* Rows */}
                        <div className="space-y-2">
                            {Object.entries(allocation).map(([cat, pct]) => (
                                <div key={cat} className="flex items-center gap-3">
                                    <span className="w-24 text-sm font-medium shrink-0">{t(cat) || cat}</span>
                                    <div className="relative flex-1">
                                        <Input
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="1"
                                            value={pct}
                                            onChange={(e) => setPercent(cat, Number(e.target.value))}
                                            className="font-mono text-right pr-7 h-9 w-full"
                                        />
                                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">%</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeCategory(cat)}
                                        className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                                        disabled={Object.keys(allocation).length <= 1}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Add category */}
                        {availableToAdd.length > 0 && (
                            <div className="flex gap-2 flex-wrap pt-1">
                                {availableToAdd.map(cat => (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => addCategory(cat)}
                                        className="text-xs px-2.5 py-1 rounded-full border border-dashed border-border hover:border-primary hover:text-primary transition-colors"
                                    >
                                        + {t(cat) || cat}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Remaining hint */}
                        {Math.abs(total - 100) > 0.01 && (
                            <p className="text-xs text-red-500">
                                {remaining > 0 ? `${remaining.toFixed(0)}% ${t('allocation_remaining')}` : t('allocation_over')}
                            </p>
                        )}
                        <p className="text-xs text-muted-foreground">{t('allocation_hint')}</p>
                    </div>
                )}

                {/* Bottom buttons */}
                <div className="flex items-center justify-between pt-2">
                    {initialGoal ? (
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={deleting}
                            className="flex items-center gap-1.5 text-sm text-destructive hover:text-destructive/80 transition-colors disabled:opacity-50"
                        >
                            <Trash2 className="w-4 h-4" />
                            {deleting ? t('deleting') : t('delete_goal')}
                        </button>
                    ) : <span />}
                    <Button type="submit" disabled={loading || !isValid}>
                        {loading ? t('saving') : (initialGoal ? t('update_goal_button') : t('set_goal_button'))}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
