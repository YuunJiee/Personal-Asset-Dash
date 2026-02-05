'use client';

import { useState, useEffect } from 'react';
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomSelect } from "@/components/ui/custom-select";
import { useRouter } from 'next/navigation';
import { useLanguage } from "@/components/LanguageProvider";

interface GoalDialogProps {
    isOpen: boolean;
    onClose: () => void;
    initialGoal?: any;
}

export function GoalDialog({ isOpen, onClose, initialGoal }: GoalDialogProps) {
    const router = useRouter();
    const { t } = useLanguage();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: initialGoal?.name || '',
        target_amount: initialGoal?.target_amount || '',
        goal_type: initialGoal?.goal_type || 'NET_WORTH', // NET_WORTH or MONTHLY_SPENDING
        description: initialGoal?.description || ''
    });

    const goalTypes = [
        { value: 'NET_WORTH', label: t('type_net_worth') },
        { value: 'MONTHLY_SPENDING', label: t('type_monthly_spending') }
    ];

    // Reset form when initialGoal changes or dialog opens
    useEffect(() => {
        if (initialGoal) {
            setFormData({
                name: initialGoal.name,
                target_amount: initialGoal.target_amount,
                goal_type: initialGoal.goal_type,
                description: initialGoal.description
            });
        } else {
            setFormData({ name: '', target_amount: '', goal_type: 'NET_WORTH', description: '' });
        }
    }, [initialGoal, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const url = initialGoal
                ? `http://localhost:8000/api/goals/${initialGoal.id}`
                : 'http://localhost:8000/api/goals/';

            const method = initialGoal ? 'PUT' : 'POST';

            await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    target_amount: parseFloat(formData.target_amount),
                    goal_type: formData.goal_type,
                    description: formData.description
                })
            });
            onClose();
            if (!initialGoal) {
                setFormData({ name: '', target_amount: '', goal_type: 'NET_WORTH', description: '' });
            }
            router.refresh();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog isOpen={isOpen} onClose={onClose} title={initialGoal ? t('update_financial_goal') : t('set_financial_goal')}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('goal_type_label')}</Label>
                    <CustomSelect
                        value={formData.goal_type}
                        onChange={(val) => setFormData({ ...formData, goal_type: val })}
                        options={goalTypes}
                    />
                </div>

                <div className="space-y-2">
                    <Label>{t('goal_name')}</Label>
                    <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        placeholder={formData.goal_type === 'NET_WORTH' ? t('ph_fire_goal') : t('ph_monthly_limit')}
                    />
                </div>

                <div className="space-y-2">
                    <Label>{t('target_amount_twd')}</Label>
                    <Input
                        type="number"
                        value={formData.target_amount}
                        onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                        required
                        className="font-mono"
                        placeholder={t('ph_target_amount')}
                    />
                </div>

                <div className="flex justify-end pt-4">
                    {/* <Button type="button" variant="ghost" onClick={onClose} className="mr-2">Cancel</Button> */}
                    <Button type="submit" disabled={loading}>{loading ? t('saving') : (initialGoal ? t('update_goal_button') : t('set_goal_button'))}</Button>
                </div>
            </form>
        </Dialog>
    );
}
