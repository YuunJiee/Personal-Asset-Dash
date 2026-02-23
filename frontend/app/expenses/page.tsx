'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Pencil, X, PiggyBank, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePrivacy } from "@/components/PrivacyProvider";
import { cn } from '@/lib/utils';
import { fetchBudgetCategories, API_URL } from '@/lib/api';
import { useLanguage } from "@/components/LanguageProvider";

import type { BudgetCategory } from '@/lib/types';

// Predefined color palette for categories
const COLOR_OPTIONS = [
    { value: 'emerald', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500' },
    { value: 'blue', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', bar: 'bg-blue-500' },
    { value: 'purple', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', bar: 'bg-purple-500' },
    { value: 'amber', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', bar: 'bg-amber-500' },
    { value: 'pink', bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-600 dark:text-pink-400', bar: 'bg-pink-500' },
    { value: 'cyan', bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-600 dark:text-cyan-400', bar: 'bg-cyan-500' },
    { value: 'orange', bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400', bar: 'bg-orange-500' },
    { value: 'rose', bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-600 dark:text-rose-400', bar: 'bg-rose-500' },
];

function getColors(color: string | null) {
    return COLOR_OPTIONS.find(c => c.value === color) ?? COLOR_OPTIONS[0];
}

export default function BudgetPage() {
    const { t } = useLanguage();
    const { isPrivacyMode } = usePrivacy();
    const [categories, setCategories] = useState<BudgetCategory[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    const defaultForm = { name: '', icon: '', budget_amount: '', color: 'emerald', note: '' };
    const [form, setForm] = useState(defaultForm);

    const loadCategories = async () => {
        try {
            const data = await fetchBudgetCategories();
            setCategories(data);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => { loadCategories(); }, []);

    const openAdd = () => {
        setEditingId(null);
        setForm(defaultForm);
        setIsDialogOpen(true);
    };

    const openEdit = (cat: BudgetCategory) => {
        setEditingId(cat.id);
        setForm({
            name: cat.name,
            icon: cat.icon ?? '',
            budget_amount: cat.budget_amount.toString(),
            color: cat.color ?? 'emerald',
            note: cat.note ?? '',
        });
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            name: form.name,
            icon: form.icon || null,
            budget_amount: parseFloat(form.budget_amount),
            color: form.color || null,
            note: form.note || null,
        };

        try {
            const url = editingId ? `${API_URL}/budgets/${editingId}` : `${API_URL}/budgets/`;
            const method = editingId ? 'PUT' : 'POST';
            await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            setIsDialogOpen(false);
            loadCategories();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async () => {
        if (!editingId) return;
        if (!confirm(t('delete_budget_confirm'))) return;
        await fetch(`${API_URL}/budgets/${editingId}`, { method: 'DELETE' });
        setIsDialogOpen(false);
        loadCategories();
    };

    const totalBudget = categories.reduce((s, c) => s + c.budget_amount, 0);

    return (
        <div className="min-h-screen bg-background p-6 md:p-10 font-sans text-foreground transition-colors duration-300">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
                        <PiggyBank className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('budget_title')}</h1>
                        <p className="text-muted-foreground mt-1">{t('budget_desc')}</p>
                    </div>
                </div>
                <Button onClick={openAdd} className="rounded-full w-10 h-10 md:w-auto md:h-10 p-0 md:px-4">
                    <Plus className="w-5 h-5 md:w-4 md:h-4 md:mr-2" />
                    <span className="hidden md:inline">{t('add_budget_category')}</span>
                </Button>
            </header>

            {/* Summary Card */}
            <div className="mb-8">
                <div className="bg-card p-6 rounded-3xl border border-border shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-violet-100 dark:bg-violet-900/30 rounded-full text-violet-600 dark:text-violet-400">
                        <Wallet className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{t('budget_total')}</div>
                        <div className="text-3xl font-bold mt-1">
                            {isPrivacyMode ? '****' : `$${totalBudget.toLocaleString()}`}
                            <span className="text-base font-normal text-muted-foreground ml-1">{t('per_month_suffix')}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">{categories.length} {t('budget_categories_label')}</div>
                    </div>
                </div>
            </div>

            {/* Category Grid */}
            {categories.length === 0 ? (
                <div className="bg-card rounded-3xl border border-border shadow-sm p-16 text-center text-muted-foreground">
                    <div className="text-5xl mb-4">💰</div>
                    <p>{t('no_budget_categories')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {categories.map(cat => {
                        const colors = getColors(cat.color ?? null);
                        return (
                            <div
                                key={cat.id}
                                onClick={() => openEdit(cat)}
                                className="bg-card rounded-3xl border border-border shadow-sm p-5 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group relative"
                            >
                                {/* Edit hint */}
                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                                </div>

                                {/* Icon + Name */}
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center text-2xl shrink-0", colors.bg)}>
                                        {cat.icon || '📦'}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-bold text-foreground truncate">{cat.name}</div>
                                        {cat.note && (
                                            <div className="text-xs text-muted-foreground truncate mt-0.5">{cat.note}</div>
                                        )}
                                    </div>
                                </div>

                                {/* Budget Amount */}
                                <div className="text-2xl font-bold text-foreground mb-1">
                                    {isPrivacyMode ? '****' : `$${cat.budget_amount.toLocaleString()}`}
                                </div>
                                <div className="text-xs text-muted-foreground mb-3">{t('budget_amount_label')}</div>

                                {/* Progress bar — shows proportion of total budget */}
                                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                    <div
                                        className={cn("h-full rounded-full transition-all duration-500", colors.bar)}
                                        style={{ width: totalBudget > 0 ? `${Math.min((cat.budget_amount / totalBudget) * 100, 100)}%` : '0%' }}
                                    />
                                </div>
                                <div className="text-xs text-muted-foreground mt-1.5 text-right">
                                    {totalBudget > 0 ? `${((cat.budget_amount / totalBudget) * 100).toFixed(1)}%` : '—'}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add / Edit Dialog */}
            {isDialogOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
                    onClick={() => setIsDialogOpen(false)}
                >
                    <div
                        className="bg-background rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 relative"
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setIsDialogOpen(false)}
                            className="absolute right-4 top-4 rounded-full p-2 opacity-70 hover:opacity-100 hover:bg-muted transition-all"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <h2 className="text-xl font-bold mb-5">
                            {editingId ? t('edit_budget_category') : t('add_budget_category')}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Name + Icon */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-sm font-medium mb-1 block">{t('budget_icon_label')}</label>
                                    <input
                                        className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-center text-xl"
                                        placeholder={t('budget_icon_placeholder')}
                                        value={form.icon}
                                        onChange={e => setForm({ ...form, icon: e.target.value })}
                                        maxLength={4}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-sm font-medium mb-1 block">{t('name')}</label>
                                    <input
                                        className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2"
                                        placeholder="食物、交通、娛樂..."
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Budget Amount */}
                            <div>
                                <label className="text-sm font-medium mb-1 block">{t('budget_amount_label')} (TWD)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="100"
                                    className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2"
                                    placeholder="e.g. 12000"
                                    value={form.budget_amount}
                                    onChange={e => setForm({ ...form, budget_amount: e.target.value })}
                                    required
                                />
                            </div>

                            {/* Color Picker */}
                            <div>
                                <label className="text-sm font-medium mb-2 block">顏色</label>
                                <div className="flex gap-2 flex-wrap">
                                    {COLOR_OPTIONS.map(c => (
                                        <button
                                            key={c.value}
                                            type="button"
                                            onClick={() => setForm({ ...form, color: c.value })}
                                            className={cn(
                                                "w-7 h-7 rounded-full transition-all border-2",
                                                c.bar,
                                                form.color === c.value ? 'border-foreground scale-110' : 'border-transparent'
                                            )}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Note */}
                            <div>
                                <label className="text-sm font-medium mb-1 block">{t('budget_note_label')}</label>
                                <input
                                    className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2"
                                    placeholder={t('budget_note_placeholder')}
                                    value={form.note}
                                    onChange={e => setForm({ ...form, note: e.target.value })}
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 mt-6">
                                {editingId && (
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        className="shrink-0 px-3"
                                        onClick={handleDelete}
                                        title={t('delete')}
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </Button>
                                )}
                                <Button type="submit" className="flex-1">
                                    {editingId ? t('save_changes') : t('add_budget_category')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
