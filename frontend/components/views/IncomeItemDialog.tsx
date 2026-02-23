"use client";

import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { translations } from "@/src/i18n/dictionaries";
import { IncomeItem } from "@/lib/types";
import { Trash2 } from "lucide-react";
import { createIncomeItem, updateIncomeItem, deleteIncomeItem } from "@/lib/api";

type TranslationKey = keyof typeof translations['en'];

interface IncomeItemDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: () => void;
    editingItem?: IncomeItem | null;
}

export function IncomeItemDialog({ open, onOpenChange, onSave, editingItem }: IncomeItemDialogProps) {
    const { language } = useLanguage();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dict: any = translations[language as keyof typeof translations] || translations['en'];
    const t = (key: TranslationKey) => dict[key] || key;

    const [name, setName] = useState("");
    const [amount, setAmount] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && editingItem) {
            setName(editingItem.name);
            setAmount(editingItem.amount.toString());
        } else if (open) {
            setName("");
            setAmount("");
        }
    }, [open, editingItem]);

    const handleSave = async () => {
        if (!name || !amount) return;
        try {
            setLoading(true);
            if (editingItem) {
                await updateIncomeItem(editingItem.id, {
                    name,
                    amount: parseFloat(amount)
                });
            } else {
                await createIncomeItem({
                    name,
                    amount: parseFloat(amount)
                });
            }
            onSave();
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to save income:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!editingItem) return;
        if (!confirm(t('delete_income_confirm') as string)) return;
        try {
            setLoading(true);
            await deleteIncomeItem(editingItem.id);
            onSave();
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to delete income:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            isOpen={open}
            onClose={() => onOpenChange(false)}
            title={editingItem ? (t('edit_income') as string) : (t('add_income') as string)}
        >
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="income-name">{t('name') as string}</Label>
                    <Input
                        id="income-name"
                        placeholder={t('income_name_placeholder') as string}
                        value={name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="income-amount">{t('expected_income')}</Label>
                    <Input
                        id="income-amount"
                        type="number"
                        value={amount}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
                    />
                </div>
            </div>
            <div className="flex justify-between mt-4">
                {editingItem ? (
                    <Button variant="destructive" onClick={handleDelete} disabled={loading} className="px-3">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                ) : <div></div>}
                <div className="space-x-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        {t('collapse') as string}
                    </Button>
                    <Button onClick={handleSave} disabled={loading || !name || !amount}>
                        {loading ? "..." : (t('save_changes') as string)}
                    </Button>
                </div>
            </div>
        </Dialog>
    );
}
