import { useState, useEffect } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomSelect } from "@/components/ui/custom-select";
import { createAsset, createTransaction, lookupTicker } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { IconPicker, AssetIcon, getDefaultIcon } from './IconPicker';
import { X, Tag as TagIcon } from 'lucide-react';

interface AddAssetDialogProps {
    isOpen: boolean;
    onClose: () => void;
    defaultCategory?: string;
}

export function AddAssetDialog({ isOpen, onClose, defaultCategory }: AddAssetDialogProps) {
    const { t } = useLanguage();
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        ticker: '',
        category: defaultCategory || 'Fluid',
        subCategory: '',
        initialBalance: '',
        includeInNetWorth: true,
        icon: '',
        manualAvgCost: ''
    });
    const [market, setMarket] = useState('TW'); // Default to Taiwan market
    const [fetchedPrice, setFetchedPrice] = useState<number | null>(null);

    // Local Tags State
    const [tags, setTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState('');

    const categories = [
        { value: 'Fluid', label: t('Fluid') },
        { value: 'Investment', label: t('Investment') },
        { value: 'Fixed', label: t('Fixed') },
        { value: 'Receivables', label: t('Receivables') },
        { value: 'Liabilities', label: t('Liabilities') },
    ];

    const subCategories: Record<string, string[]> = {
        'Fluid': ['Cash', 'E-Wallet', 'Debit Card', 'Other'],
        'Investment': ['Fund', 'Stock', 'Crypto', 'Other Investment'],
        'Fixed': ['Real Estate', 'Car', 'Other Fixed Asset'],
        'Receivables': [],
        'Liabilities': ['Credit Card', 'Loan', 'Payable', 'Other Liability']
    };

    const getSubCategoryLabel = (key: string) => {
        const map: Record<string, string> = {
            'Cash': t('sc_cash'),
            'E-Wallet': t('sc_ewallet'),
            'Debit Card': t('sc_debit_card'),
            'Other': t('sc_other'),
            'Fund': t('sc_fund'),
            'Stock': t('sc_stock'),
            'Crypto': t('sc_crypto'),
            'Other Investment': t('sc_other_invest'),
            'Real Estate': t('sc_real_estate'),
            'Car': t('sc_car'),
            'Other Fixed Asset': t('sc_other_fixed'),
            'Credit Card': t('sc_credit_card'),
            'Loan': t('sc_loan'),
            'Payable': t('sc_payable'),
            'Other Liability': t('sc_other_liability')
        };
        return map[key] || key;
    };

    const currentSubCategories = subCategories[formData.category] || [];

    // Reset form and sync category when dialog opens
    useEffect(() => {
        if (isOpen) {
            setFormData({
                name: '',
                ticker: '',
                category: defaultCategory || 'Fluid',
                subCategory: subCategories[defaultCategory || 'Fluid']?.[0] || '',
                initialBalance: '',
                includeInNetWorth: true,
                icon: '',
                manualAvgCost: ''
            });
            setTags([]);
            setNewTag('');
            setMarket('TW');
            setFetchedPrice(null);
        }
    }, [isOpen, defaultCategory]);

    // Auto-fetch ticker info when ticker is entered for stocks/crypto
    useEffect(() => {
        const fetchTickerInfo = async () => {
            if (!formData.ticker || formData.ticker.trim().length < 2) return;
            if (formData.category !== 'Investment') return;
            if (!formData.subCategory.includes('Stock') && !formData.subCategory.includes('Crypto')) return;

            try {
                let tickerToLookup = formData.ticker;

                // Add market suffix for Taiwan stocks
                if (formData.subCategory.includes('Stock') && market === 'TW') {
                    if (!tickerToLookup.endsWith('.TW')) {
                        tickerToLookup = `${tickerToLookup}.TW`;
                    }
                }

                // Add -USD for crypto
                if (formData.subCategory.includes('Crypto') && !tickerToLookup.includes('-')) {
                    tickerToLookup = `${tickerToLookup}-USD`;
                }

                const result = await lookupTicker(tickerToLookup);

                if (result.name && !result.error) {
                    // Auto-fill name if it's empty
                    setFormData(prev => ({
                        ...prev,
                        name: prev.name || result.name
                    }));
                }

                if (result.price) {
                    setFetchedPrice(result.price);
                    // Set manual avg cost default to fetched price if not already set
                    setFormData(prev => ({
                        ...prev,
                        manualAvgCost: result.price ? result.price.toString() : prev.manualAvgCost
                    }));
                } else {
                    setFetchedPrice(null);
                }
            } catch (error) {
                console.error('Failed to lookup ticker:', error);
                setFetchedPrice(null);
            }
        };

        // Debounce the API call
        const timeoutId = setTimeout(fetchTickerInfo, 500);
        return () => clearTimeout(timeoutId);
    }, [formData.ticker, formData.category, formData.subCategory, market]);

    const handleAddTag = () => {
        if (newTag.trim() && !tags.includes(newTag.trim())) {
            setTags([...tags, newTag.trim()]);
            setNewTag('');
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            let finalTicker = formData.ticker;

            // Handle Taiwan Stocks
            if (formData.category === 'Investment' && formData.subCategory.includes('Stock') && market === 'TW') {
                if (finalTicker && !finalTicker.endsWith('.TW')) {
                    finalTicker = `${finalTicker}.TW`;
                }
            }

            // Handle Crypto (Append -USD)
            if (formData.category === 'Investment' && formData.subCategory.includes('Crypto')) {
                if (finalTicker && !finalTicker.includes('-')) {
                    finalTicker = `${finalTicker}-USD`;
                }
            }


            // Determine Name and Icon defaults
            const finalName = formData.name || formData.subCategory || "New Asset";
            const finalIcon = formData.icon || getDefaultIcon(formData.category, formData.subCategory);

            const assetRes = await createAsset({
                name: finalName,
                ticker: finalTicker || null,
                category: formData.category,
                sub_category: formData.subCategory || null,
                include_in_net_worth: formData.includeInNetWorth,
                icon: finalIcon,
                tags: tags.map(tag => ({ name: tag })),
                current_price: fetchedPrice
            });

            const initialBalance = parseFloat(formData.initialBalance);
            if (initialBalance && !isNaN(initialBalance) && initialBalance !== 0) {
                // Use manual avg cost if provided, otherwise fetched price, otherwise 0/1
                let buyPrice = formData.manualAvgCost ? parseFloat(formData.manualAvgCost) : (fetchedPrice || (formData.ticker ? 0 : 1.0));

                await createTransaction(assetRes.id, {
                    amount: initialBalance,
                    buy_price: buyPrice
                });
            }

            router.refresh();
            onClose();
            setFormData({ name: '', ticker: '', category: 'Fluid', subCategory: '', initialBalance: '', includeInNetWorth: true, icon: '', manualAvgCost: '' });
            setTags([]);
            setMarket('TW');
        } catch (error) {
            console.error("Failed to create asset", error);
            alert("Error creating asset");
        } finally {
            setLoading(false);
        }
    };

    // Auto-fix ticker formatting on blur
    const handleTickerBlur = () => {
        let currentTicker = formData.ticker;
        if (!currentTicker) return;

        // Auto-fix Crypto Ticker
        if (formData.subCategory.includes('Crypto') && !currentTicker.includes('-')) {
            currentTicker = `${currentTicker}-USD`;
            setFormData(prev => ({ ...prev, ticker: currentTicker }));
        }

        // Auto-fix TW Stock Ticker if it's 4 digits
        if (formData.subCategory.includes('Stock') && market === 'TW' && /^\d{4}$/.test(currentTicker)) {
            setFormData(prev => ({ ...prev, ticker: `${currentTicker}.TW` }));
        }
    };

    // Calc default icon for preview
    const defaultIconPreview = getDefaultIcon(formData.category, formData.subCategory);

    return (
        <Dialog isOpen={isOpen} onClose={onClose} title={t('add_asset')}>
            <form onSubmit={handleSubmit} className="space-y-4">

                {/* Row 1: Icon & Name */}
                <div className="flex gap-4 items-end">
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('icon_label')}</Label>
                        <IconPicker
                            value={formData.icon}
                            onChange={(icon) => setFormData({ ...formData, icon })}
                            defaultIcon={defaultIconPreview}
                        />
                    </div>
                    <div className="flex-1 space-y-2">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('name')}</Label>
                        <Input
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder={
                                formData.category === 'Fluid' ? t('ph_bank_account') :
                                    formData.category === 'Investment' ? t('ph_stock') : t('ph_asset_name')
                            }
                        />
                    </div>
                </div>

                {/* Row 2: Category & SubCategory */}
                <div className="grid grid-cols-2 gap-4">
                    <div className={`space-y-2 ${formData.category === 'Receivables' ? 'col-span-2' : ''}`}>
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('asset')}</Label>
                        <CustomSelect
                            value={formData.category}
                            onChange={(val) => setFormData({
                                ...formData,
                                category: val,
                                subCategory: subCategories[val]?.[0] || ''
                            })}
                            options={categories}
                        />
                    </div>
                    {formData.category !== 'Receivables' && (
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('subcategory')}</Label>
                            <CustomSelect
                                value={formData.subCategory}
                                onChange={(val) => setFormData({ ...formData, subCategory: val })}
                                options={(subCategories[formData.category] || []).map(sub => ({ value: sub, label: getSubCategoryLabel(sub) }))}
                            />
                        </div>
                    )}
                </div>

                {/* Row 3: Investment Specifics */}
                {formData.category === 'Investment' && (
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('ticker')}</Label>
                            {/* Market Selection for Stocks */}
                            {formData.subCategory.includes('Stock') && (
                                <div className="flex bg-secondary/50 p-1 rounded-lg text-xs font-medium">
                                    <button
                                        type="button"
                                        onClick={() => setMarket('TW')}
                                        className={`px-3 py-1 rounded-md transition-all ${market === 'TW' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        TW
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMarket('US')}
                                        className={`px-3 py-1 rounded-md transition-all ${market === 'US' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        US
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="relative">
                            <Input
                                value={formData.ticker}
                                onChange={(e) => {
                                    setFormData({ ...formData, ticker: e.target.value });
                                    if (!e.target.value) setFetchedPrice(null);
                                }}
                                onBlur={handleTickerBlur}
                                placeholder={market === 'TW' ? t('ph_ticker_tw') : t('ph_ticker_us')}
                                className="pr-24 font-mono uppercase"
                            />
                            {fetchedPrice !== null && (
                                <div className="absolute right-3 bottom-0 top-0 flex items-center">
                                    <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-md border border-emerald-500/20">
                                        ${fetchedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Row 4: Holdings & Valuation */}
                <div className="grid grid-cols-2 gap-4">
                    <div className={`space-y-2 ${formData.category !== 'Investment' ? 'col-span-2' : ''}`}>
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {formData.subCategory.includes('Stock') ? t('current_shares') :
                                formData.subCategory.includes('Crypto') ? t('current_holdings') :
                                    t('initial_balance')}
                        </Label>
                        <Input
                            type="number"
                            step="any"
                            className="font-mono"
                            value={formData.initialBalance}
                            onChange={(e) => setFormData({ ...formData, initialBalance: e.target.value })}
                            placeholder={t('ph_amount')}
                        />
                        {/* Estimated Value Display */}
                        {fetchedPrice !== null && formData.initialBalance && !isNaN(parseFloat(formData.initialBalance)) && (
                            <div className="text-[10px] text-muted-foreground text-right px-1">
                                ≈ <span className="font-medium text-foreground">
                                    ${(fetchedPrice * parseFloat(formData.initialBalance)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Average Cost Input (Only for Investments) */}
                    {formData.category === 'Investment' && (
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('average_cost')}</Label>
                            <Input
                                type="number"
                                step="any"
                                value={formData.manualAvgCost}
                                onChange={(e) => setFormData({ ...formData, manualAvgCost: e.target.value })}
                                placeholder={fetchedPrice ? `${fetchedPrice}` : t('ph_average_cost')}
                                className="font-mono"
                            />
                            <p className="text-[10px] text-muted-foreground pt-1">{t('avg_cost_desc')}</p>
                        </div>
                    )}
                </div>


                {/* Tags Section */}
                <div className="space-y-2 pt-2 border-t border-border">
                    <Label className="flex items-center gap-2">
                        <TagIcon className="w-4 h-4" /> {t('tags')}
                    </Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {tags.map((tag) => (
                            <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                                #{tag}
                                <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                            </span>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <Input
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            placeholder={t('add_tag')}
                            className="h-9 text-sm"
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                        />
                        <Button type="button" onClick={handleAddTag} disabled={!newTag} className="h-9 px-3 whitespace-nowrap shrink-0">{t('add_button')}</Button>
                    </div>
                </div>

                {/* Include in Net Worth */}
                <div className="pt-2 border-t border-border">
                    <div className="flex items-center space-x-3 py-2">
                        <input
                            type="checkbox"
                            id="includeInNetWorth"
                            className="w-5 h-5 rounded-md border-gray-300 text-primary focus:ring-primary accent-primary"
                            checked={formData.includeInNetWorth}
                            onChange={(e) => setFormData({ ...formData, includeInNetWorth: e.target.checked })}
                        />
                        <label htmlFor="includeInNetWorth" className="text-sm font-medium leading-none cursor-pointer">
                            {t('include_in_net_worth')}
                        </label>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    {/* <Button type="button" variant="ghost" onClick={onClose} className="mr-2">{t('cancel')}</Button> */}
                    <Button type="submit" disabled={loading}>
                        {loading ? 'Creating...' : t('add_asset')}
                    </Button>
                </div>
            </form>
        </Dialog >
    );
}
