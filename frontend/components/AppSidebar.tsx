import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, PieChart, Settings, Menu, ChevronLeft, ChevronRight, Eye, EyeOff, Wallet, Calendar, Star, Bitcoin, TrendingUp, CreditCard, History } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from "next-themes";
import { usePrivacy } from "@/components/PrivacyProvider";
import { AssetActionDialog } from './AssetActionDialog';
import { ProfileSwitcher } from './ProfileSwitcher';
import { AssetIcon } from './IconPicker';
import { useLanguage } from "@/components/LanguageProvider";
import { API_URL } from '@/lib/api';
import { useDashboard } from '@/lib/hooks';
import type { Asset } from '@/lib/types';

/** Per-category icon container class for the sidebar favourites list. */
const SIDEBAR_CATEGORY_CLASSES: Record<string, string> = {
    Fluid:       'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    Investment:  'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    Stock:       'bg-indigo-500/10 text-indigo-500',
    Crypto:      'bg-orange-500/10 text-orange-500',
    Fixed:       'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    Receivables: 'bg-orange-400/10 text-orange-400',
    Liabilities: 'bg-red-500/10 text-red-600 dark:text-red-400',
};

interface AppSidebarProps {
    isCollapsed: boolean;
    toggle: () => void;
}

export function AppSidebar({ isCollapsed, toggle }: AppSidebarProps) {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);
    const { setTheme, theme } = useTheme();
    const { isPrivacyMode, togglePrivacyMode } = usePrivacy();
    const [mounted, setMounted] = useState(false);
    const [historyAsset, setHistoryAsset] = useState<Asset | null>(null);
    const { t, language, setLanguage } = useLanguage();
    const { assets } = useDashboard();

    useEffect(() => {
        setMounted(true);
    }, []);

    const downloadBackup = () => {
        window.open(`${API_URL}/system/backup`, '_blank');
    };

    const navItems = [
        { name: t('dashboard'), href: '/', icon: LayoutDashboard },
        { name: t('assets'), href: '/assets', icon: Wallet },
        { name: t('stock'), href: '/stock', icon: TrendingUp },
        { name: t('analytics'), href: '/analytics', icon: PieChart },
        { name: t('budget_planner'), href: '/expenses', icon: CreditCard },
        { name: t('crypto'), href: '/crypto', icon: Bitcoin },
        { name: t('calendar'), href: '/calendar', icon: Calendar },
        { name: t('history'), href: '/history', icon: History },

    ];

    // Derive favorites from shared SWR dashboard cache — no extra fetch needed.
    const favorites = assets.filter((a) => a.is_favorite).slice(0, 5);

    return (
        <>
            {/* Mobile Toggle */}
            <div className="md:hidden p-4 fixed top-0 left-0 z-50">
                <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 bg-card rounded-lg shadow border border-border">
                    <Menu className="w-6 h-6" />
                </button>
            </div>

            {/* Mobile Overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar Container */}
            <aside className={cn(
                "fixed top-0 left-0 z-50 h-[100dvh] transition-transform duration-300 ease-in-out bg-card border-r border-border flex flex-col shadow-2xl md:shadow-none",
                isCollapsed ? "w-[60px] px-2 py-6" : "w-[280px] p-6",
                mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
            )}>
                {/* Header */}
                <div className={cn("flex flex-col mb-6 shrink-0", isCollapsed ? "items-center" : "px-2")}>
                    <div className={cn("flex items-center w-full", isCollapsed && "justify-center")}>
                        {/* <div className="w-8 h-8 bg-foreground rounded-lg flex items-center justify-center text-background font-bold shrink-0">Y</div> */}
                        <img src="/icon.png" alt="Yantage" className="w-8 h-8 rounded-lg shrink-0 object-cover" />
                        {!isCollapsed && (
                            <div className="flex items-center ml-3 flex-1 justify-between overflow-hidden">
                                <span className="text-xl font-bold tracking-tight">Yantage</span>
                                <button
                                    onClick={togglePrivacyMode}
                                    className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
                                    title={isPrivacyMode ? "Show Values" : "Hide Values"}
                                >
                                    {isPrivacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Profile Switcher */}
                    {!isCollapsed && (
                        <div className="mt-4 w-full">
                            <ProfileSwitcher />
                        </div>
                    )}
                </div>


                {/* Nav */}
                <nav className="space-y-1 shrink-0">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={() => setMobileOpen(false)}
                                className={cn(
                                    "flex items-center rounded-xl transition-all font-medium text-sm",
                                    isCollapsed ? "justify-center px-0 py-3" : "px-4 py-3",
                                    isActive
                                        ? "bg-foreground text-background shadow-lg"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                                title={isCollapsed ? item.name : undefined}
                            >
                                <item.icon className={cn("w-5 h-5", !isCollapsed && "mr-3")} />
                                {!isCollapsed && item.name}
                            </Link>
                        );
                    })}
                </nav>

                {/* Favorites Section (Hidden if collapsed) */}
                {!isCollapsed && (
                    <div className="mt-8 flex-1 overflow-y-auto overflow-x-hidden flex flex-col animate-in fade-in duration-300 scrollbar-thin">
                        <div className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 shrink-0">{t('favorites')}</div>
                        {favorites.map(asset => {
                            const Icon = asset.icon || 'CircleDollarSign';

                            let bgClass = "bg-primary/10 text-primary";
                            bgClass = SIDEBAR_CATEGORY_CLASSES[asset.category] ?? bgClass;

                            return (
                                <div
                                    key={asset.id}
                                    className="group flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted/60 cursor-pointer transition-all duration-200 border border-transparent hover:border-border/50"
                                    onClick={() => {
                                        setHistoryAsset(asset);
                                        setMobileOpen(false);
                                    }}
                                    title="View History"
                                >
                                    {/* Icon */}
                                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-105", bgClass)}>
                                        <AssetIcon icon={Icon} className="w-4 h-4" />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline">
                                            <span className="text-sm font-semibold truncate text-foreground/90 group-hover:text-foreground">{asset.name}</span>
                                            <span className="text-xs font-bold font-mono tracking-tight ml-2 text-foreground">
                                                {isPrivacyMode ? '****' : `$${new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(asset.value_twd || 0)}`}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            {asset.ticker && (
                                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground uppercase">
                                                    {asset.ticker}
                                                </span>
                                            )}
                                            <span className="text-[10px] text-muted-foreground/60 truncate">
                                                {t(asset.category) || asset.category}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {favorites.length === 0 && (
                            <div className="px-4 py-8 text-center">
                                <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center mx-auto mb-2 opacity-50">
                                    <Star className="w-5 h-5 text-muted-foreground" />
                                </div>
                                <div className="text-xs text-muted-foreground">{t('no_favorites')}</div>
                            </div>
                        )}
                    </div>
                )}

                {/* Footer Actions */}
                <div className="mt-auto pt-6 flex flex-col gap-2">
                    {/* Collapse Toggle (Desktop only) */}
                    <button
                        onClick={toggle}
                        className="hidden md:flex items-center justify-center gap-2 p-2 rounded-xl hover:bg-muted transition-all text-muted-foreground"
                        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                        {!isCollapsed && <span className="text-xs">{t('collapse')}</span>}
                    </button>



                    {/* Settings Link */}
                    <Link
                        href="/settings"
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                            "flex items-center justify-center gap-2 p-3 rounded-2xl bg-muted/50 hover:bg-muted transition-all text-foreground font-medium text-sm",
                            isCollapsed && "px-0"
                        )}
                        title={t('settings')}
                    >
                        <Settings className="w-5 h-5" />
                        {!isCollapsed && <span>{t('settings')}</span>}
                    </Link>

                    {/* Export Data (Footer) - Moved to Settings
                    <button
                        onClick={() => {
                            window.open(`${API_URL}/system/export/csv`, '_blank');
                        }}
                        className={cn(
                            "flex items-center justify-center gap-2 p-3 rounded-2xl bg-muted/50 hover:bg-muted transition-all text-muted-foreground hover:text-foreground font-medium text-sm",
                            isCollapsed && "px-0"
                        )}
                        title={t('export_csv')}
                    >
                        <Download className="w-5 h-5" />
                        {!isCollapsed && <span>{t('export_csv') || 'Export CSV'}</span>}
                    </button>
                    */}
                </div>
            </aside >
            <AssetActionDialog
                isOpen={!!historyAsset}
                onClose={() => setHistoryAsset(null)}
                asset={historyAsset}
                allAssets={assets}
                initialMode='history'
            />
        </>
    );
}
