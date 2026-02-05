'use client';

import { useState, useEffect } from "react";
import { AssetPieChart } from "./AssetPieChart";
import { AddAssetDialog } from "./AddAssetDialog";
import { AssetAccordion } from "./AssetAccordion";
import { GoalWidget } from "./GoalWidget";
import { GoalDialog } from "@/components/GoalDialog";
import { AssetActionDialog } from "@/components/AssetActionDialog";
import { Plus, TrendingUp, TrendingDown, Pencil, Check, Target, ArrowRightLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePrivacy } from "@/components/PrivacyProvider";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, TouchSensor, MouseSensor } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { RebalanceWidget } from "./RebalanceWidget";

const CATEGORY_COLORS: Record<string, string> = {
    'Fluid': 'bg-[var(--color-fluid)]',
    'Investment': 'bg-[var(--color-investment)]',
    'Fixed': 'bg-[var(--color-fixed)]',
    'Receivables': 'bg-[var(--color-receivables)]',
    'Liabilities': 'bg-[var(--color-liabilities)]',
};

interface DashboardClientProps {
    data: any;
}

import { useLanguage } from "@/components/LanguageProvider";

export function DashboardClient({ data }: DashboardClientProps) {
    const { isPrivacyMode } = usePrivacy();
    const { t } = useLanguage();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [addDefaultCategory, setAddDefaultCategory] = useState<string | undefined>(undefined);

    const [order, setOrder] = useState<string[]>(['Fluid', 'Investment', 'Fixed', 'Receivables', 'Liabilities']);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
    const [isTransferOpen, setIsTransferOpen] = useState(false);
    const [goalsRefreshTrigger, setGoalsRefreshTrigger] = useState(0);
    const [editingGoal, setEditingGoal] = useState<any>(null);

    useEffect(() => {
        const savedOrder = localStorage.getItem('dashboard_order');
        if (savedOrder) {
            try { setOrder(JSON.parse(savedOrder)); } catch (e) { console.error(e); }
        }
    }, []);

    const openAddDialog = (category?: string) => {
        setAddDefaultCategory(category);
        setIsAddOpen(true);
    };

    const { net_worth, total_pl, total_roi, assets, updated_at } = data;
    const formattedTime = new Date(updated_at).toLocaleTimeString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false });

    // Helper to filter assets by category and sum values (excluding those filtered out of net worth)
    const getCategoryTotal = (cat: string) => {
        return assets
            .filter((a: any) => a.category === cat && a.include_in_net_worth !== false)
            .reduce((sum: number, a: any) => {
                if (a.value_twd !== undefined) return sum + a.value_twd;
                let quantity = 0;
                if (a.transactions) {
                    a.transactions.forEach((t: any) => quantity += t.amount);
                }
                return sum + (a.current_price * quantity);
            }, 0);
    };

    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: {
                distance: 10,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            setOrder((items) => {
                const oldIndex = items.indexOf(active.id.toString());
                const newIndex = items.indexOf(over!.id.toString());
                const newOrder = arrayMove(items, oldIndex, newIndex);
                localStorage.setItem('dashboard_order', JSON.stringify(newOrder));
                return newOrder;
            });
        }
    };

    // Check for stale data (older than 5 days)
    const lastUpdateDate = new Date(updated_at);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - lastUpdateDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const isStale = diffDays > 5;

    // Prepare data for Chart
    // Prepare data for Chart: Top 5 Assets by Value
    const chartData = assets
        .filter((a: any) => a.include_in_net_worth !== false && (a.value_twd > 0 || (a.current_price * (a.quantity || 0)) > 0))
        .map((a: any) => ({
            name: a.name,
            value: a.value_twd || (a.current_price * (a.transactions?.reduce((sum: number, t: any) => sum + t.amount, 0) || 0))
        }))
        .sort((a: any, b: any) => b.value - a.value)
        .slice(0, 6); // Top 6

    const [visibleCategories, setVisibleCategories] = useState<Record<string, boolean>>({});
    const [chartTheme, setChartTheme] = useState('Classic');

    useEffect(() => {
        // Fetch visibility settings
        fetch('http://localhost:8000/api/settings/visible_categories')
            .then(res => res.json())
            .then(data => {
                try {
                    setVisibleCategories(JSON.parse(data.value));
                } catch (e) { }
            })
            .catch(() => {
                // Default all visible if fetch fails or key doesn't exist
                const defaults: Record<string, boolean> = {};
                ['Fluid', 'Investment', 'Fixed', 'Receivables', 'Liabilities'].forEach(c => defaults[c] = true);
                setVisibleCategories(defaults);
            });

        // Force Morandi Theme
        setChartTheme('Morandi');
    }, []);

    const filteredOrder = order.filter(category => {
        // If visibility setting exists, verify it. default true.
        // If undefined, we assume true for backward compatibility or before settings are saved.
        return visibleCategories[category] !== false;
    });

    return (
        <div className="min-h-screen bg-background p-6 md:p-10 font-sans text-foreground transition-colors duration-300">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                <div className="flex flex-col md:flex-row md:items-end gap-6 md:gap-20">
                    {/* Net Worth */}
                    <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">{t('net_worth')}</div>
                        <div className="text-4xl font-bold tracking-tight text-foreground flex items-baseline gap-2">
                            {isPrivacyMode ? '****' : `$${new Intl.NumberFormat('en-US', { minimumFractionDigits: 0 }).format(data.net_worth)}`}
                            <span className="text-lg text-muted-foreground font-normal">TWD</span>
                        </div>
                        <div className={cn("text-sm font-medium mt-1 flex items-center gap-1.5", data.total_pl >= 0 ? "text-trend-up" : "text-trend-down")}>
                            {data.total_pl >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            {isPrivacyMode ? '****' : `${data.total_pl >= 0 ? '+' : ''}$${new Intl.NumberFormat('en-US', { minimumFractionDigits: 0 }).format(Math.abs(data.total_pl))}`}
                            <span className="opacity-50">({data.total_roi.toFixed(1)}%)</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">{t('last_updated')}: {formattedTime}</div>
                    </div>

                    {/* Total Assets */}
                    <div className="hidden md:block pb-2">
                        <div className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">{t('total_assets')}</div>
                        <div className="text-2xl font-bold text-foreground">
                            {isPrivacyMode ? '****' : `$${new Intl.NumberFormat('en-US', { minimumFractionDigits: 0 }).format(
                                getCategoryTotal("Fluid") + getCategoryTotal("Investment") + getCategoryTotal("Fixed") + (getCategoryTotal("Receivables") || 0)
                            )}`}
                        </div>
                    </div>

                    {/* Total Liabilities */}
                    <div className="hidden md:block pb-2">
                        <div className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">{t('total_liabilities')}</div>
                        <div className="text-2xl font-bold text-trend-down">
                            {isPrivacyMode ? '****' : `$${new Intl.NumberFormat('en-US', { minimumFractionDigits: 0 }).format(getCategoryTotal("Liabilities"))}`}
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 items-center">
                    <button
                        onClick={() => setIsGoalDialogOpen(true)}
                        className="p-2 md:px-4 md:py-2.5 rounded-full font-medium transition-all flex items-center shadow-sm border bg-card hover:bg-muted border-border text-foreground"
                        title={t('set_goal')}
                    >
                        <Target className="w-5 h-5 md:mr-2" />
                        <span className="hidden md:inline">{t('set_goal')}</span>
                    </button>

                    <button
                        onClick={() => setIsEditMode(!isEditMode)}
                        className={cn(
                            "p-2 md:px-4 md:py-2.5 rounded-full font-medium transition-all flex items-center shadow-sm border",
                            isEditMode ? "bg-primary/10 text-primary border-primary" : "bg-card hover:bg-muted border-border text-foreground"
                        )}
                        title={isEditMode ? t('done') : t('limit_layout')}
                    >
                        {isEditMode ? <Check className="w-5 h-5 md:mr-2" /> : <Pencil className="w-5 h-5 md:mr-2" />}
                        <span className="hidden md:inline">{isEditMode ? t('done') : t('limit_layout')}</span>
                    </button>

                    <button
                        onClick={() => setIsTransferOpen(true)}
                        className="p-2 md:px-4 md:py-2.5 rounded-full font-medium transition-all flex items-center shadow-sm border bg-card hover:bg-muted border-border text-foreground"
                        title={t('transfer')}
                    >
                        <ArrowRightLeft className="w-5 h-5 md:mr-2" />
                        <span className="hidden md:inline">{t('transfer')}</span>
                    </button>

                    <button
                        onClick={() => setIsAddOpen(true)}
                        className="bg-foreground text-background p-2 md:px-5 md:py-2.5 rounded-full font-medium hover:opacity-90 transition-all flex items-center shadow-lg"
                        title={t('add_asset')}
                    >
                        <Plus className="w-5 h-5 md:mr-2" />
                        <span className="hidden md:inline">{t('add_asset')}</span>
                    </button>
                </div>
            </header>

            {isStale && (
                <div className="mb-8 p-4 rounded-2xl bg-amber-100/80 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-2 duration-500">
                    <Target className="w-5 h-5 mt-0.5 shrink-0" />
                    <div>
                        <h3 className="font-semibold text-sm">{t('time_for_checkin')}</h3>
                        <p className="text-sm opacity-90 mt-1">
                            {t('checkin_message').replace('{days}', String(diffDays))}
                        </p>
                    </div>
                </div>
            )}

            <GoalWidget
                dashboardData={data}
                refreshTrigger={goalsRefreshTrigger}
                onEditGoal={(goal) => {
                    setEditingGoal(goal);
                    setIsGoalDialogOpen(true);
                }}
            />

            {/* Dashboard Content Grid */}
            <div className="flex flex-col xl:flex-row gap-8">

                {/* Center Column: Core Asset Stack (Main Dashboard) */}
                <div className="flex-1 min-w-[320px]">
                    <h2 className="text-xl font-bold mb-4 px-2 text-foreground">{t('assets_breakdown')}</h2>

                    <DndContext
                        id="dashboard-dnd-context"
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={order}
                            strategy={rectSortingStrategy}
                        >
                            <div className="grid grid-cols-1 gap-4 auto-rows-min">
                                {filteredOrder.map((category, index) => {
                                    const catTotal = getCategoryTotal(category);
                                    // Calculate percentage based on Positive Net Worth (Total Assets)
                                    // Or Net Worth? Usually Asset Allocation is % of Assets.
                                    // Let's use Sum of Positive Assets as denominator
                                    const totalPositiveAssets = getCategoryTotal("Fluid") + getCategoryTotal("Investment") + getCategoryTotal("Fixed") + (getCategoryTotal("Receivables") || 0);

                                    // If category is Liabilities, do we show % of Liabilities? Or % of Assets (Debt Ratio)?
                                    // User said "50%" on Fluid card. This implies Allocation.
                                    // If it's Liabilities, maybe show % of Assets (Debt ratio) but negative? or just % of Total Liabilities?
                                    // Let's just default to [Category] / [Total Assets] * 100 for Assets.
                                    // For Liabilities: [Liabilities] / [Total Assets] * 100 (Debt Ratio)

                                    let percentage = 0;
                                    if (totalPositiveAssets > 0) {
                                        percentage = Math.round((catTotal / totalPositiveAssets) * 100);
                                    }

                                    return (
                                        <AssetAccordion
                                            key={category}
                                            category={category}
                                            title={t(category as any) || category}
                                            totalAmount={catTotal}
                                            assets={data.assets}
                                            color={CATEGORY_COLORS[category] || 'bg-gray-500'}
                                            onAddClick={() => openAddDialog(category)}
                                            isEditMode={isEditMode}
                                            percentage={percentage}
                                            className="col-span-1"
                                        />
                                    );
                                })}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>

                {/* Right Column: Analytics Panel (Charts) */}
                <div className="w-full xl:w-[420px] space-y-6 shrink-0">
                    {/* Spacer to align with "Asset Breakdown" title on the left */}
                    <h2 className="text-xl font-bold mb-4 px-2 opacity-0 select-none hidden xl:block">Spacer</h2>
                    {/* Allocation Chart */}
                    <AssetPieChart data={chartData} themeName={chartTheme} />

                    {/* Rebalancing Widget */}
                    <RebalanceWidget />
                </div>
            </div>

            <AddAssetDialog isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} defaultCategory={addDefaultCategory} />
            <GoalDialog
                isOpen={isGoalDialogOpen}
                onClose={() => {
                    setIsGoalDialogOpen(false);
                    setEditingGoal(null); // Clear editing state on close
                    setGoalsRefreshTrigger(i => i + 1);
                }}
                initialGoal={editingGoal}
            />
            <AssetActionDialog
                isOpen={isTransferOpen}
                onClose={() => setIsTransferOpen(false)}
                asset={null}
                allAssets={data.assets}
                initialMode='transfer'
            />
        </div>
    );
}
