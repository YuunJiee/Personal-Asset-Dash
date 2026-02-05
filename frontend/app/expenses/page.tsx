'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, DollarSign, RefreshCw, Layers, Pencil, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePrivacy } from "@/components/PrivacyProvider";
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

interface Expense {
    id: number;
    name: string;
    amount: number;
    currency: string;
    frequency: 'MONTHLY' | 'YEARLY';
    due_day: number;
    category: string;
    split_with: number;
    is_active: boolean;
}

import { useLanguage } from "@/components/LanguageProvider";

export default function ExpensesPage() {
    const { t } = useLanguage();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const { isPrivacyMode } = usePrivacy();

    // Edit State
    const [editingId, setEditingId] = useState<number | null>(null);

    // Form State
    const [search, setSearch] = useState('');

    const [newExpense, setNewExpense] = useState({
        name: '',
        amount: '',
        frequency: 'MONTHLY',
        due_day: 1,
        category: 'Subscription',
        split_with: 1
    });

    const fetchExpenses = async () => {
        try {
            const res = await fetch('http://localhost:8000/api/expenses/');
            if (res.ok) setExpenses(await res.json());
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchExpenses();
    }, []);

    const handleEdit = (expense: Expense) => {
        setEditingId(expense.id);
        setNewExpense({
            name: expense.name,
            amount: expense.amount.toString(),
            frequency: expense.frequency,
            due_day: expense.due_day,
            category: expense.category,
            split_with: expense.split_with || 1
        });
        setIsAddOpen(true);
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingId
                ? `http://localhost:8000/api/expenses/${editingId}`
                : 'http://localhost:8000/api/expenses/';

            const method = editingId ? 'PUT' : 'POST';

            await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newExpense,
                    amount: parseFloat(newExpense.amount),
                    is_active: true
                })
            });
            setIsAddOpen(false);
            setEditingId(null);
            setNewExpense({ name: '', amount: '', frequency: 'MONTHLY', due_day: 1, category: 'Subscription', split_with: 1 });
            fetchExpenses();
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm(t('delete_expense_confirm'))) return false;
        await fetch(`http://localhost:8000/api/expenses/${id}`, { method: 'DELETE' });
        fetchExpenses();
        return true;
    };

    // Calculations - Updated Logic
    // Monthly Fixed = Sum(Monthly) + Sum(Yearly / 12)
    const totalMonthlyCost = expenses
        .filter(e => e.is_active)
        .reduce((sum, e) => {
            const amount = e.amount / (e.split_with || 1);
            if (e.frequency === 'MONTHLY') return sum + amount;
            if (e.frequency === 'YEARLY') return sum + (amount / 12);
            return sum;
        }, 0);

    // Yearly Total = Monthly Fixed * 12
    const totalYearlyCost = totalMonthlyCost * 12;

    return (
        <div className="min-h-screen bg-background p-6 md:p-10 font-sans text-foreground transition-colors duration-300">
            <header className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('expenses_title')}</h1>
                    <p className="text-muted-foreground mt-1">{t('expenses_desc')}</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder={t('search')}
                            className="bg-muted/50 border border-border rounded-full pl-9 pr-4 py-2 w-full md:w-64 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Button onClick={() => {
                        setEditingId(null);
                        setNewExpense({ name: '', amount: '', frequency: 'MONTHLY', due_day: 1, category: 'Subscription', split_with: 1 });
                        setIsAddOpen(true);
                    }} className="rounded-full">
                        <Plus className="w-4 h-4 mr-2" /> {t('add_expense')}
                    </Button>
                </div>
            </header>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                <div className="bg-card p-6 rounded-3xl border border-border shadow-sm">
                    <div className="flex items-center gap-3 mb-2 text-muted-foreground">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-emerald-600 dark:text-emerald-400">
                            <DollarSign className="w-5 h-5" />
                        </div>
                        <span className="font-medium text-sm uppercase tracking-wide">{t('monthly_fixed')}</span>
                    </div>
                    <div className="text-3xl font-bold">
                        {isPrivacyMode ? '****' : `$${Math.ceil(totalMonthlyCost).toLocaleString()}`}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{t('monthly_fixed_desc')}</p>
                </div>

                <div className="bg-card p-6 rounded-3xl border border-border shadow-sm">
                    <div className="flex items-center gap-3 mb-2 text-muted-foreground">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600 dark:text-purple-400">
                            <RefreshCw className="w-5 h-5" />
                        </div>
                        <span className="font-medium text-sm uppercase tracking-wide">{t('yearly_average')}</span>
                    </div>
                    <div className="text-2xl font-bold">
                        {isPrivacyMode ? '****' : `$${Math.ceil(totalYearlyCost).toLocaleString()}`}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{t('monthly_fixed')} x 12</p>
                </div>
            </div>

            {/* Content List */}
            <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
                <div className="p-6 border-b border-border bg-muted/30">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Layers className="w-5 h-5 opacity-70" /> {t('all_subscriptions')}
                    </h3>
                </div>

                {expenses.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground">
                        {t('no_expenses')}
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {expenses
                            .filter(e => e.name.toLowerCase().includes(search.toLowerCase()) || e.category.toLowerCase().includes(search.toLowerCase()))
                            .map(expense => (
                                <div
                                    key={expense.id}
                                    onClick={() => handleEdit(expense)}
                                    className="p-4 md:p-5 flex flex-row items-start justify-between hover:bg-muted/50 transition-colors group gap-3 md:gap-4 cursor-pointer"
                                >
                                    <div className="flex items-start gap-3 md:gap-4 flex-1 min-w-0">
                                        <div className={cn("w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center text-lg md:text-xl font-bold shrink-0 mt-1",
                                            expense.category === 'Subscription' ? "bg-purple-100 text-purple-600 dark:bg-purple-900/30" : "bg-gray-100 text-gray-600 dark:bg-gray-800")}>
                                            {expense.name.charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-bold text-foreground truncate pr-2">{expense.name}</div>
                                            <div className="text-xs text-muted-foreground flex flex-wrap gap-1.5 mt-1">
                                                <span className="bg-secondary px-1.5 py-0.5 rounded text-secondary-foreground whitespace-nowrap">{expense.category}</span>
                                                {expense.frequency === 'YEARLY' && (
                                                    <span className="text-amber-600 dark:text-amber-400 font-medium whitespace-nowrap">{t('yearly')} ({t('due_day')}: {expense.due_day})</span>
                                                )}
                                                {expense.frequency === 'MONTHLY' && (
                                                    <span className="whitespace-nowrap">{t('monthly_due_day', { day: expense.due_day })}</span>
                                                )}
                                                {expense.split_with && expense.split_with > 1 && (
                                                    <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 px-1.5 py-0.5 rounded flex items-center gap-1 whitespace-nowrap">
                                                        Split: {expense.split_with}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col md:flex-row items-end md:items-center gap-2 md:gap-6 shrink-0">
                                        <div className="text-right">
                                            <div className="font-bold text-base md:text-lg whitespace-nowrap">
                                                {isPrivacyMode ? '****' : `$${(expense.amount / (expense.split_with || 1)).toLocaleString()}`}
                                            </div>
                                            <div className="text-[10px] md:text-xs text-muted-foreground uppercase">
                                                {expense.split_with && expense.split_with > 1 ? (
                                                    <span>Total: ${expense.amount.toLocaleString()}</span>
                                                ) : (
                                                    expense.currency
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                )}
            </div>

            {/* Add/Edit Dialog */}
            {/* Add/Edit Dialog */}
            {isAddOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
                    onClick={() => setIsAddOpen(false)}
                >
                    <div
                        className="bg-background rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setIsAddOpen(false)}
                            className="absolute right-4 top-4 rounded-full p-2 opacity-70 hover:opacity-100 hover:bg-muted transition-all"
                            title={t('close')}
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <h2 className="text-xl font-bold mb-4">{editingId ? t('edit_expense') : t('add_expense')}</h2>
                        <form onSubmit={handleAdd} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block">{t('name')}</label>
                                <input
                                    className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2"
                                    placeholder="Netflix, Rent..."
                                    value={newExpense.name}
                                    onChange={e => setNewExpense({ ...newExpense, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium mb-1 block">{t('amount')}</label>
                                    <input
                                        type="number"
                                        className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2"
                                        placeholder="0.00"
                                        value={newExpense.amount}
                                        onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1 block">{t('frequency')}</label>
                                    <select
                                        className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2"
                                        value={newExpense.frequency}
                                        onChange={e => setNewExpense({ ...newExpense, frequency: e.target.value as any })}
                                    >
                                        <option value="MONTHLY">{t('monthly')}</option>
                                        <option value="YEARLY">{t('yearly')}</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium mb-1 block">{t('expense_category_label')}</label>
                                    <input
                                        className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2"
                                        placeholder={t('category_placeholder')}
                                        value={newExpense.category}
                                        onChange={e => setNewExpense({ ...newExpense, category: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1 block">{t('due_day')}</label>
                                    <input
                                        type="number" min="1" max="31"
                                        className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2"
                                        value={newExpense.due_day}
                                        onChange={e => setNewExpense({ ...newExpense, due_day: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>

                            {/* Split With Section */}
                            <div>
                                <label className="text-sm font-medium mb-1 block">{t('split_with')}</label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="number" min="1"
                                        className="w-24 bg-muted/50 border border-border rounded-xl px-4 py-2"
                                        value={newExpense.split_with}
                                        onChange={e => setNewExpense({ ...newExpense, split_with: parseInt(e.target.value) || 1 })}
                                    />
                                    <div className="text-sm text-muted-foreground">
                                        {newExpense.amount && newExpense.split_with > 1 && (
                                            <span>{t('your_share')}: ${(parseFloat(newExpense.amount) / newExpense.split_with).toFixed(0)}</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                {editingId && (
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        className="shrink-0 px-3"
                                        onClick={async () => {
                                            if (await handleDelete(editingId)) {
                                                setIsAddOpen(false);
                                                setEditingId(null);
                                            }
                                        }}
                                        title={t('delete')}
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </Button>
                                )}
                                <Button type="submit" className="flex-1">{editingId ? t('save_changes') : t('add_expense')}</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
