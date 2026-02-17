'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Plus, GripVertical, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AssetActionDialog } from './AssetActionDialog';
import { usePrivacy } from "@/components/PrivacyProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { updateAsset } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { AssetIcon } from './IconPicker';
import { getCategoryIconName } from '@/lib/iconHelper';

interface AssetAccordionProps {
    category: string;
    title: string;
    totalAmount: number;
    assets: any[];
    color: string;
    onAddClick?: () => void;
    onTitleClick?: () => void;
    onActionClick?: () => void;
    actionIcon?: React.ReactNode;
    className?: string;
    isEditMode?: boolean;
    percentage?: number;
}

export function AssetAccordion({ category, title, totalAmount, assets, color, onAddClick, onTitleClick, onActionClick, actionIcon, className, isEditMode, percentage }: AssetAccordionProps) {
    const [isOpen, setIsOpen] = useState(true);
    const [isMounted, setIsMounted] = useState(false);
    const { isPrivacyMode } = usePrivacy();
    const { t } = useLanguage();
    const router = useRouter();

    // Dialog State
    // Dialog State
    const [selectedAsset, setSelectedAsset] = useState<any | null>(null);
    const [dialogMode, setDialogMode] = useState<'history' | 'edit' | 'adjust' | 'set' | 'transfer'>('history');

    // Load state from localStorage on mount
    useEffect(() => {
        const savedState = localStorage.getItem(`accordion_open_${category}`);
        if (savedState !== null) {
            setIsOpen(savedState === 'true');
        }
        // Delay enabling transitions to prevent initial flash
        setTimeout(() => setIsMounted(true), 100);
    }, [category]);

    // Save state to localStorage when toggled
    const toggleOpen = () => {
        const newState = !isOpen;
        setIsOpen(newState);
        localStorage.setItem(`accordion_open_${category}`, String(newState));
    };

    const toggleFavorite = async (e: React.MouseEvent, asset: any) => {
        e.stopPropagation(); // Prevent opening edit dialog
        try {
            await updateAsset(asset.id, { is_favorite: !asset.is_favorite });
            router.refresh();
        } catch (error) {
            console.error("Failed to toggle favorite", error);
        }
    };

    const handleCardClick = (asset: any) => {
        setSelectedAsset(asset);
        setDialogMode('history');
    };

    const handleCloseDialogs = () => {
        setSelectedAsset(null);
    };

    // Filter assets for this category
    const categoryAssets = assets.filter(a => a.category === category);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: category,
        disabled: !isEditMode
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn("mb-0 flex flex-col h-full", className, isDragging ? "opacity-50" : "")}
        >
            {/* Header Card - Acts like the 'Drawer Handle' */}
            <div
                {...attributes}
                {...listeners}
                onClick={(e) => {
                    if (isEditMode) return;
                    // If title click handler exists and we clicked loosely (not on buttons), maybe we just toggle open?
                    // User wants Title to link. But the whole card is the toggle.
                    // Let's make the Title Text clickable specifically if handler exists.
                    toggleOpen();
                }}
                className={cn(
                    "relative p-6 rounded-3xl cursor-pointer transition-all duration-300 shadow-sm border border-transparent hover:shadow-md group touch-none",
                    color,
                    isOpen ? "rounded-b-none shadow-none ring-2 ring-black/5" : "text-white",
                    isEditMode ? "cursor-grab active:cursor-grabbing" : ""
                )}
            >
                <div className="flex justify-between items-start mb-4">
                    <h3
                        className={cn("text-lg font-medium tracking-tight flex items-center gap-2", isOpen ? "text-gray-900" : "text-white/90", onTitleClick ? "hover:underline cursor-pointer z-10" : "")}
                        onClick={(e) => {
                            if (onTitleClick) {
                                e.stopPropagation();
                                onTitleClick();
                            }
                        }}
                    >
                        {isEditMode && <GripVertical className="w-5 h-5 opacity-60" />}
                        {title}
                        {onTitleClick && <ChevronRight className="w-4 h-4 opacity-50" />}
                    </h3>
                    <div className="flex gap-2">
                        {/* Secondary Action (Integration) */}
                        {onActionClick && actionIcon && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onActionClick();
                                }}
                                className={cn(
                                    "p-2 rounded-full backdrop-blur-sm transition-colors hover:bg-white hover:text-black",
                                    isOpen ? "bg-gray-100 text-gray-500" : "bg-white/20 text-white"
                                )}
                                title="Action"
                            >
                                {actionIcon}
                            </button>
                        )}

                        {/* Quick Add Button in Header */}
                        {/* Quick Add Button in Header */}
                        {onAddClick && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAddClick();
                                }}
                                className={cn(
                                    "p-2 rounded-full backdrop-blur-sm transition-colors hover:bg-white hover:text-black",
                                    isOpen ? "bg-gray-100 text-gray-500" : "bg-white/20 text-white"
                                )}
                                title="Add Asset"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        )}

                        <div className={cn("p-2 rounded-full backdrop-blur-sm", isOpen ? "bg-gray-100 text-gray-900" : "bg-white/20 text-white")}>
                            {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                        </div>
                    </div>
                </div>

                <span className={cn("text-2xl md:text-3xl font-bold tracking-tighter", isOpen ? "text-gray-900" : "text-white")}>
                    {isPrivacyMode ? '****' : `$${new Intl.NumberFormat('en-US', { minimumFractionDigits: 0 }).format(totalAmount)}`}
                </span>

                {/* Percentage Display */}
                {percentage !== undefined && percentage > 0 && (
                    <div className={cn(
                        "absolute bottom-6 right-6 text-xl font-bold font-handwritten", // Handwritten style adjustment if we had a font
                        isOpen ? "text-gray-300" : "text-white/30"
                    )}>
                        {percentage}%
                    </div>
                )}

            </div>

            {/* Expanded Content Wrapper with Grid Animation */}
            <div className={cn("grid", isMounted && "transition-all duration-300 ease-in-out", isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
                <div className="overflow-hidden">
                    <div className="bg-card border-x border-b border-border rounded-b-3xl p-6 shadow-sm">
                        {categoryAssets.length === 0 ? (
                            <div className="text-center text-muted-foreground py-4 text-sm">{t('no_assets_yet')}</div>
                        ) : (
                            // Changed to Single Column Layout
                            <div className={cn("grid gap-3 grid-cols-1")}>
                                {categoryAssets.map(asset => {
                                    // Use Computed value_twd from backend if available, otherwise simplified calc
                                    const value = (asset.value_twd !== undefined && asset.value_twd !== 0) ? asset.value_twd : ((asset.current_price || 0) * (asset.transactions?.reduce((acc: any, t: any) => acc + t.amount, 0) || 0));

                                    return (
                                        <div
                                            key={asset.id}
                                            onClick={() => handleCardClick(asset)}
                                            className={cn(
                                                "relative p-4 rounded-3xl border border-border/60 transition-all cursor-pointer group flex items-center justify-between overflow-hidden",
                                                asset.include_in_net_worth === false ? "bg-muted/30 opacity-60 grayscale-[0.5]" : "bg-card hover:border-primary/50 hover:shadow-md"
                                            )}
                                        >
                                            <div className="flex items-center gap-3 md:gap-5 flex-1 min-w-0">
                                                {/* Icon */}
                                                <div className={cn("w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors",
                                                    asset.include_in_net_worth === false ? "bg-muted" : "bg-muted/50 text-foreground"
                                                )}>
                                                    {asset.icon ? (
                                                        <AssetIcon icon={asset.icon} className="w-5 h-5 md:w-6 md:h-6" />
                                                    ) : (
                                                        <AssetIcon icon={getCategoryIconName(asset.category, asset.sub_category)} className="w-5 h-5 md:w-6 md:h-6" />
                                                    )}
                                                </div>

                                                {/* Info */}
                                                <div className="space-y-0.5 md:space-y-1 min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <div className="text-sm md:text-base font-bold text-foreground leading-none truncate">{asset.name}</div>
                                                        {asset.include_in_net_worth === false && (
                                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium whitespace-nowrap">{t('excluded')}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {(asset.ticker || asset.sub_category) && (
                                                            <div className="text-[10px] md:text-xs text-muted-foreground font-medium uppercase tracking-wider truncate max-w-[80px] md:max-w-none">
                                                                {asset.ticker || asset.sub_category}
                                                            </div>
                                                        )}
                                                        {asset.last_updated_at && (
                                                            <>
                                                                {(asset.ticker || asset.sub_category) && (
                                                                    <span className="text-muted-foreground/40">•</span>
                                                                )}
                                                                <div className="text-[10px] text-muted-foreground/60 whitespace-nowrap">
                                                                    <span className="hidden md:inline">{t('updated_label')}: </span>
                                                                    {new Date(asset.last_updated_at).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                    {/* Payment Due Day for Credit Cards */}
                                                    {asset.category === 'Liabilities' && asset.payment_due_day && (
                                                        <div className="text-[10px] text-muted-foreground/80 font-medium">
                                                            📅 {t('due_on_day').replace('{day}', asset.payment_due_day)}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>



                                            {/* Right Side */}
                                            <div className="flex flex-col items-end gap-0.5 md:gap-1 shrink-0 ml-1">
                                                {/* Favorite Star - Always visible */}
                                                <button
                                                    onClick={(e) => toggleFavorite(e, asset)}
                                                    className="p-1.5 md:p-2 hover:bg-yellow-500/10 rounded-full transition-colors mb-0.5"
                                                >
                                                    <Star className={cn("w-4 h-4 md:w-5 md:h-5 transition-colors",
                                                        asset.is_favorite
                                                            ? "fill-current text-yellow-500"
                                                            : "text-muted-foreground hover:text-yellow-500"
                                                    )} />
                                                </button>

                                                {/* Amount & Percentage */}
                                                <div className="text-right">
                                                    <div className="font-bold text-foreground text-lg md:text-xl tracking-tight flex items-center justify-end gap-1 md:gap-2">
                                                        {isPrivacyMode ? '****' : `$${new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)}`}
                                                    </div>

                                                    {/* Percentage Badge */}
                                                    {totalAmount > 0 && asset.include_in_net_worth !== false && (
                                                        <div className="mt-0.5 md:mt-1 flex justify-end">
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] md:text-[11px] font-medium bg-muted text-muted-foreground">
                                                                {Math.round((value / totalAmount) * 100)}%
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Progress Bar at Bottom */}
                                            {
                                                totalAmount > 0 && asset.include_in_net_worth !== false && (
                                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/50 overflow-hidden rounded-b-3xl">
                                                        <div
                                                            className="h-full bg-primary/20"
                                                            style={{ width: `${(value / totalAmount) * 100}%` }}
                                                        />
                                                    </div>
                                                )
                                            }
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>


            {/* Unified Asset Action Dialog */}
            {
                selectedAsset && (
                    <AssetActionDialog
                        isOpen={!!selectedAsset}
                        onClose={handleCloseDialogs}
                        asset={selectedAsset}
                        allAssets={assets} // Pass all assets for Transfer context
                        initialMode={dialogMode}
                    />
                )
            }
        </div >
    );
}
