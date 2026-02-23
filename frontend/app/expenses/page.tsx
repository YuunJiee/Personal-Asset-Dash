'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Pencil, X, PiggyBank, Wallet, ArrowRight, ShieldCheck, AlertTriangle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePrivacy } from "@/components/PrivacyProvider";
import { cn } from '@/lib/utils';
import { fetchBudgetCategories, fetchIncomeItems, API_URL } from '@/lib/api';
import { useLanguage } from "@/components/LanguageProvider";
import { IconPicker, AssetIcon } from '@/components/IconPicker';
import { IncomeItemDialog } from '@/components/views/IncomeItemDialog';

import type { BudgetCategory, IncomeItem, DashboardData } from '@/lib/types';

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

const MACRO_GROUPS = ['Fixed', 'Living', 'Investment', 'Growth', 'Unassigned'];

export default function BudgetPage() {
    const { t } = useLanguage();
    const { isPrivacyMode } = usePrivacy();
    const [categories, setCategories] = useState<BudgetCategory[]>([]);
    const [incomeItems, setIncomeItems] = useState<IncomeItem[]>([]);
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);

    // Dialog States
    const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);
    const [editingBudgetId, setEditingBudgetId] = useState<number | null>(null);
    const [isIncomeDialogOpen, setIsIncomeDialogOpen] = useState(false);
    const [editingIncomeItem, setEditingIncomeItem] = useState<IncomeItem | null>(null);

    const defaultBudgetForm = { name: '', icon: '', budget_amount: '', color: 'emerald', note: '', group_name: 'Unassigned' };
    const [budgetForm, setBudgetForm] = useState(defaultBudgetForm);

    const loadData = async () => {
        try {
            const [cats, incomes, dash] = await Promise.all([
                fetchBudgetCategories(),
                fetchIncomeItems(),
                fetch(`${API_URL}/dashboard/`, { cache: 'no-store' }).then(res => res.json())
            ]);
            setCategories(cats);
            setIncomeItems(incomes);
            setDashboardData(dash);
        } catch (e) {
            console.error("Failed to load budget data", e);
        }
    };

    useEffect(() => { loadData(); }, []);

    // --- Budget Functions ---
    const openAddBudget = () => {
        setEditingBudgetId(null);
        setBudgetForm(defaultBudgetForm);
        setIsBudgetDialogOpen(true);
    };

    const openEditBudget = (cat: BudgetCategory) => {
        setEditingBudgetId(cat.id);
        setBudgetForm({
            name: cat.name,
            icon: cat.icon ?? '',
            budget_amount: cat.budget_amount.toString(),
            color: cat.color ?? 'emerald',
            note: cat.note ?? '',
            group_name: cat.group_name || 'Unassigned',
        });
        setIsBudgetDialogOpen(true);
    };

    const handleBudgetSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            name: budgetForm.name,
            icon: budgetForm.icon || null,
            budget_amount: parseFloat(budgetForm.budget_amount),
            color: budgetForm.color || null,
            note: budgetForm.note || null,
            group_name: budgetForm.group_name || 'Unassigned',
        };

        try {
            const url = editingBudgetId ? `${API_URL}/budgets/${editingBudgetId}` : `${API_URL}/budgets/`;
            const method = editingBudgetId ? 'PUT' : 'POST';
            await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            setIsBudgetDialogOpen(false);
            loadData();
        } catch (err) {
            console.error(err);
        }
    };

    const handleBudgetDelete = async () => {
        if (!editingBudgetId) return;
        if (!confirm(t('delete_budget_confirm'))) return;
        await fetch(`${API_URL}/budgets/${editingBudgetId}`, { method: 'DELETE' });
        setIsBudgetDialogOpen(false);
        loadData();
    };

    // --- Income Functions ---
    const openAddIncome = () => {
        setEditingIncomeItem(null);
        setIsIncomeDialogOpen(true);
    };

    const openEditIncome = (item: IncomeItem) => {
        setEditingIncomeItem(item);
        setIsIncomeDialogOpen(true);
    };

    // --- Math & Metrics ---
    const totalIncome = incomeItems.reduce((s, i) => s + i.amount, 0);
    const totalBudget = categories.reduce((s, c) => s + c.budget_amount, 0);
    const deficit = totalIncome - totalBudget;

    // Investment Ratio = (Investment Budgets / Total Income) * 100
    const investmentBudgets = categories.filter(c => c.group_name === 'Investment').reduce((s, c) => s + c.budget_amount, 0);
    const investmentRatio = totalIncome > 0 ? (investmentBudgets / totalIncome) * 100 : 0;

    // Emergency Fund = Liquid Assets / (Living + Fixed Budgets * 3 months)
    const fluidAssetsTotal = dashboardData?.assets.filter(a => a.category === 'Fluid' || a.category === 'Crypto').reduce((s, a) => s + (a.value_twd || 0), 0) || 0;
    const survivalMonthlyCost = categories.filter(c => c.group_name === 'Fixed' || c.group_name === 'Living').reduce((s, c) => s + c.budget_amount, 0);
    const emergencyFundTarget = survivalMonthlyCost * 3; // 3 months fallback
    const emergencyFundProgress = emergencyFundTarget > 0 ? Math.min((fluidAssetsTotal / emergencyFundTarget) * 100, 100) : 0;


    // Helper for rendering deficit status
    const getDeficitStatus = (amount: number) => {
        if (amount > 0) return { icon: ShieldCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10', text: t('remaining_safe') };
        if (amount > -5000) return { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10', text: t('deficit_warning') };
        return { icon: AlertCircle, color: 'text-rose-500', bg: 'bg-rose-500/10', text: t('deficit_danger') };
    };
    const deficitStatus = getDeficitStatus(deficit);
    const DeficitIcon = deficitStatus.icon;

    // Group budgets
    const groupedBudgets = MACRO_GROUPS.reduce((acc, group) => {
        acc[group] = categories.filter(c => (c.group_name || 'Unassigned') === group);
        return acc;
    }, {} as Record<string, BudgetCategory[]>);

    return (
        <div className="min-h-screen bg-background p-6 md:p-10 font-sans text-foreground pb-32">
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
            </header>

            {/* 🔥 LAYER 3: Deficit Dashboard (The Soul)  */}
            <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">{t('deficit_dashboard')}</h2>
                <div className="bg-card rounded-3xl border border-border shadow-sm p-6 overflow-hidden relative">
                    {/* Background decoration */}
                    <div className={cn("absolute -right-20 -top-20 w-64 h-64 rounded-full blur-3xl opacity-20", deficitStatus.bg)} />

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center relative z-10">
                        {/* Math Equation Visual */}
                        <div className="col-span-1 lg:col-span-2 flex flex-wrap lg:flex-nowrap items-center gap-6">
                            {/* Income */}
                            <div className="flex-1 min-w-[140px]">
                                <div className="text-sm text-muted-foreground mb-1">{t('total_income')}</div>
                                <div className="text-3xl font-bold">
                                    {isPrivacyMode ? '****' : `$${totalIncome.toLocaleString()}`}
                                </div>
                            </div>
                            <div className="text-2xl font-light text-muted-foreground shrink-0">-</div>
                            {/* Budget */}
                            <div className="flex-1 min-w-[140px]">
                                <div className="text-sm text-muted-foreground mb-1">{t('total_budget')}</div>
                                <div className="text-3xl font-bold">
                                    {isPrivacyMode ? '****' : `$${totalBudget.toLocaleString()}`}
                                </div>
                            </div>
                            <div className="text-2xl font-light text-muted-foreground shrink-0">=</div>
                        </div>

                        {/* Result Panel */}
                        <div className="col-span-1 border-t lg:border-t-0 lg:border-l border-border pt-6 lg:pt-0 lg:pl-8">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className={cn("flex items-center gap-1.5 text-sm font-medium mb-1", deficitStatus.color)}>
                                        <DeficitIcon className="w-4 h-4" />
                                        {deficitStatus.text}
                                    </div>
                                    <div className={cn("text-4xl font-black tracking-tight", deficitStatus.color)}>
                                        {isPrivacyMode ? '****' : `$${Math.abs(deficit).toLocaleString()}`}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Advanced Metrics (Investment & Emergency Fund) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {/* Emergency Fund */}
                    <div className="bg-card rounded-2xl border border-border p-5 flex flex-col justify-center">
                        <div className="flex justify-between items-end mb-2">
                            <div className="text-sm font-medium text-muted-foreground">{t('emergency_fund')} (3 {t('months')})</div>
                            <div className="text-lg font-bold">{emergencyFundProgress.toFixed(0)}%</div>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${emergencyFundProgress}%` }} />
                        </div>
                        <div className="text-xs text-muted-foreground mt-2 flex justify-between">
                            <span>{isPrivacyMode ? '****' : `$${fluidAssetsTotal.toLocaleString()}`}</span>
                            <span>{isPrivacyMode ? '****' : `Tar: $${emergencyFundTarget.toLocaleString()}`}</span>
                        </div>
                    </div>
                    {/* Investment Ratio */}
                    <div className="bg-card rounded-2xl border border-border p-5 flex flex-col justify-center">
                        <div className="flex justify-between items-end mb-2">
                            <div className="text-sm font-medium text-muted-foreground">{t('investment_ratio')}</div>
                            <div className={cn("text-lg font-bold", investmentRatio > 30 ? 'text-emerald-500' : 'text-foreground')}>
                                {investmentRatio.toFixed(1)}%
                            </div>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden flex">
                            <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(investmentRatio, 100)}%` }} />
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                            {investmentRatio >= 20 ? "Healthy wealth building habit! 🚀" : "Try to invest at least 20% of income."}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                {/* 🟢 LAYER 1: Income Layer */}
                <div className="xl:col-span-1 space-y-4">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-xl font-bold">{t('monthly_income')}</h2>
                        <Button variant="ghost" onClick={openAddIncome} className="rounded-full w-8 h-8 flex justify-center items-center hover:bg-emerald-500/10 hover:text-emerald-500 p-0">
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>

                    {incomeItems.length === 0 ? (
                        <div className="border border-dashed border-border rounded-xl p-8 text-center text-muted-foreground text-sm">
                            {t('no_income_items')}
                            <Button variant="outline" className="mt-4 block w-full" onClick={openAddIncome}>{t('add_income')}</Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {incomeItems.map(item => (
                                <div key={item.id} onClick={() => openEditIncome(item)} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between cursor-pointer hover:border-emerald-500/30 transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                            $
                                        </div>
                                        <div className="font-medium">{item.name}</div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="font-bold">{isPrivacyMode ? '****' : `$${item.amount.toLocaleString()}`}</div>
                                        <Pencil className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 🔵 LAYER 2: Macro Budgets */}
                <div className="xl:col-span-2">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold">{t('budget_categories_label')}</h2>
                        <Button onClick={openAddBudget} variant="outline" className="rounded-full h-8 px-3 text-xs">
                            <Plus className="w-3.5 h-3.5 mr-1.5" />
                            {t('add_budget_category')}
                        </Button>
                    </div>

                    {categories.length === 0 ? (
                        <div className="bg-card rounded-3xl border border-border shadow-sm p-16 text-center text-muted-foreground">
                            <div className="text-4xl mb-4">🛒</div>
                            <p>{t('no_budget_categories')}</p>
                        </div>
                    ) : (
                        <div className="space-y-10">
                            {MACRO_GROUPS.map(group => {
                                const groupCats = groupedBudgets[group];
                                if (!groupCats || groupCats.length === 0) return null;

                                const groupTotal = groupCats.reduce((s, c) => s + c.budget_amount, 0);
                                const groupPercentage = totalBudget > 0 ? (groupTotal / totalBudget) * 100 : 0;
                                const groupNameKey = `group_${group.toLowerCase()}` as Parameters<typeof t>[0];

                                return (
                                    <div key={group} className="space-y-4">
                                        <div className="flex items-end justify-between border-b border-border/50 pb-2 px-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-foreground/90">{t(groupNameKey) || group}</h3>
                                                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                                                    {groupCats.length}
                                                </span>
                                            </div>
                                            <div className="text-sm font-medium text-muted-foreground">
                                                {isPrivacyMode ? '****' : `$${groupTotal.toLocaleString()}`} <span className="opacity-50">({groupPercentage.toFixed(0)}%)</span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {groupCats.map(cat => {
                                                const colors = getColors(cat.color ?? null);
                                                return (
                                                    <div
                                                        key={cat.id}
                                                        onClick={() => openEditBudget(cat)}
                                                        className="bg-card rounded-2xl border border-border shadow-sm p-5 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group relative"
                                                    >
                                                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                                                        </div>
                                                        <div className="flex items-center gap-3 mb-3">
                                                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 border border-black/5 dark:border-white/5", colors.bg)}>
                                                                {cat.icon ? <AssetIcon icon={cat.icon} className={cn("w-4 h-4", colors.text)} /> : '📦'}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="font-bold text-sm truncate">{t(`group_${cat.name.toLowerCase()}` as any) || cat.name}</div>
                                                                {cat.note && <div className="text-[10px] text-muted-foreground truncate mt-0.5 leading-tight">{cat.note}</div>}
                                                            </div>
                                                        </div>
                                                        <div className="text-xl font-bold text-foreground mb-2">
                                                            {isPrivacyMode ? '****' : `$${cat.budget_amount.toLocaleString()}`}
                                                        </div>
                                                        {/* Visual Proportion Bar relative to Group Total */}
                                                        <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                                                            <div
                                                                className={cn("h-full rounded-full", colors.bar)}
                                                                style={{ width: groupTotal > 0 ? `${(cat.budget_amount / groupTotal) * 100}%` : '0%' }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Income Dialog */}
            <IncomeItemDialog
                open={isIncomeDialogOpen}
                onOpenChange={setIsIncomeDialogOpen}
                onSave={loadData}
                editingItem={editingIncomeItem}
            />

            {/* Budget Dialog */}
            {isBudgetDialogOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsBudgetDialogOpen(false)}>
                    <div className="bg-background rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setIsBudgetDialogOpen(false)} className="absolute right-4 top-4 rounded-full p-2 opacity-70 hover:opacity-100 hover:bg-muted transition-all">
                            <X className="w-4 h-4" />
                        </button>

                        <h2 className="text-xl font-bold mb-5">{editingBudgetId ? t('edit_budget_category') : t('add_budget_category')}</h2>

                        <form onSubmit={handleBudgetSubmit} className="space-y-4">
                            <div className="grid grid-cols-4 gap-3">
                                <div>
                                    <label className="text-sm font-medium mb-1 block">{t('budget_icon_label')}</label>
                                    <IconPicker value={budgetForm.icon} onChange={(icon: string) => setBudgetForm({ ...budgetForm, icon })} defaultIcon="ShoppingBag" className="w-full h-[42px] border-border rounded-xl" iconClassName="w-5 h-5 text-foreground" />
                                </div>
                                <div className="col-span-3">
                                    <label className="text-sm font-medium mb-1 block">{t('category_name' as any) || t('name')}</label>
                                    <input className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2" placeholder={t('budget_name_placeholder')} value={budgetForm.name} onChange={e => setBudgetForm({ ...budgetForm, name: e.target.value })} required />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-1 block">{t('budget_group')}</label>
                                <div className="flex flex-wrap gap-2">
                                    {MACRO_GROUPS.map(g => (
                                        <button
                                            key={g} type="button"
                                            onClick={() => setBudgetForm({ ...budgetForm, group_name: g })}
                                            className={cn("px-3 py-1.5 rounded-lg border text-sm transition-colors", budgetForm.group_name === g ? 'bg-primary text-primary-foreground border-primary' : 'bg-transparent border-border hover:bg-muted text-foreground')}
                                        >
                                            {t(`group_${g.toLowerCase()}` as any) || g}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-1 block">{t('budget_amount_label')} (TWD)</label>
                                <input type="number" min="0" step="10" className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2" value={budgetForm.budget_amount} onChange={e => setBudgetForm({ ...budgetForm, budget_amount: e.target.value })} required />
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-2 block">{t('color')}</label>
                                <div className="flex gap-2 flex-wrap">
                                    {COLOR_OPTIONS.map(c => (
                                        <button key={c.value} type="button" onClick={() => setBudgetForm({ ...budgetForm, color: c.value })} className={cn("w-7 h-7 rounded-full transition-all border-2", c.bar, budgetForm.color === c.value ? 'border-foreground scale-110' : 'border-transparent')} />
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-1 block">{t('budget_note_label')}</label>
                                <input className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2" placeholder={t('budget_note_placeholder')} value={budgetForm.note} onChange={e => setBudgetForm({ ...budgetForm, note: e.target.value })} />
                            </div>

                            <div className="flex gap-3 mt-6">
                                {editingBudgetId && (
                                    <Button type="button" variant="destructive" className="shrink-0 px-3" onClick={handleBudgetDelete} title={t('delete')}>
                                        <Trash2 className="w-5 h-5" />
                                    </Button>
                                )}
                                <Button type="submit" className="flex-1">{editingBudgetId ? t('save_changes') : t('add_budget_category')}</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
