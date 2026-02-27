import { useState, useEffect } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { useToast } from '@/components/ui/toast';
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomSelect } from "@/components/ui/custom-select";
import { createAsset, createTransaction, lookupTicker, fetchIntegrations } from '@/lib/api';
import type { IntegrationConnection } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { IconPicker, AssetIcon, getDefaultIcon } from './IconPicker';



interface AddAssetDialogProps {
    isOpen: boolean;
    onClose: () => void;
    defaultCategory?: string;
}

export function AddAssetDialog({ isOpen, onClose, defaultCategory }: AddAssetDialogProps) {
    const { t } = useLanguage();
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        ticker: '',
        category: defaultCategory || 'Fluid',
        subCategory: '',
        initialBalance: '',
        includeInNetWorth: true,
        icon: '',
        manualAvgCost: '',
        paymentDueDay: ''
    });
    const [market, setMarket] = useState('TW'); // Default to Taiwan market
    const [fetchedPrice, setFetchedPrice] = useState<number | null>(null);

    // Web3 / Wallet State
    const [source, setSource] = useState('manual'); // manual, wallet
    const [connections, setConnections] = useState<IntegrationConnection[]>([]);
    const [selectedConnectionId, setSelectedConnectionId] = useState<string>('');
    const [network, setNetwork] = useState('Ethereum');
    const [contractAddress, setContractAddress] = useState('');
    const [decimals, setDecimals] = useState('18');

    const categories = [
        { value: 'Fluid', label: t('Fluid') },
        { value: 'Crypto', label: t('Crypto') },
        { value: 'Stock', label: t('Stock') },
        { value: 'Fixed', label: t('Fixed') },
        { value: 'Receivables', label: t('Receivables') },
        { value: 'Liabilities', label: t('Liabilities') },
    ];

    const subCategories: Record<string, string[]> = {
        'Fluid': ['Cash', 'E-Wallet', 'Debit Card', 'Other'],
        'Crypto': ['Coin', 'Token', 'Stablecoin', 'DeFi', 'NFT'],
        'Stock': ['TW Stock', 'US Stock', 'Mutual Fund'],
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
            'Coin': t('sc_coin'),
            'Token': t('sc_token'),
            'Stablecoin': t('sc_stablecoin'),
            'DeFi': t('sc_defi'),
            'NFT': t('sc_nft'),
            'TW Stock': t('sc_tw_stock'),
            'US Stock': t('sc_us_stock'),
            'Mutual Fund': t('sc_mutual_fund'),
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
                manualAvgCost: '',
                paymentDueDay: ''
            });
            setMarket('TW');
            setFetchedPrice(null);

            // Web3 Reset
            setSource('manual');
            setSelectedConnectionId('');
            setNetwork('Ethereum');
            setContractAddress('');
            setDecimals('18');

            // Fetch integrations
            fetchIntegrations().then(data => {
                setConnections((data as IntegrationConnection[]).filter((c) => c.provider === 'wallet'));
            }).catch(console.error);
        }
    }, [isOpen, defaultCategory]);

    // Auto-fetch ticker info when ticker is entered for stocks/crypto
    useEffect(() => {
        const fetchTickerInfo = async () => {
            if (!formData.ticker || formData.ticker.trim().length < 2) return;
            // Only Stock and Crypto have tickers
            if (formData.category !== 'Stock' && formData.category !== 'Crypto') return;

            try {
                let tickerToLookup = formData.ticker;

                // Add market suffix for Taiwan stocks
                if (formData.category === 'Stock' && market === 'TW') {
                    if (!tickerToLookup.endsWith('.TW')) {
                        tickerToLookup = `${tickerToLookup}.TW`;
                    }
                }

                // Add -USD for crypto
                if (formData.category === 'Crypto' && !tickerToLookup.includes('-')) {
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            let finalTicker = formData.ticker;

            // Handle Taiwan Stocks
            if (formData.category === 'Stock' && market === 'TW') {
                if (finalTicker && !finalTicker.endsWith('.TW')) {
                    finalTicker = `${finalTicker}.TW`;
                }
            }

            // Handle Crypto (Append -USD)
            if (formData.category === 'Crypto') {
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
                current_price: fetchedPrice,
                payment_due_day: formData.paymentDueDay ? parseInt(formData.paymentDueDay) : null,

                // Web3 Fields
                source: source,
                connection_id: source === 'wallet' && selectedConnectionId ? parseInt(selectedConnectionId) : undefined,
                network: source === 'wallet' ? network : undefined,
                contract_address: source === 'wallet' ? contractAddress : undefined,
                decimals: source === 'wallet' ? parseInt(decimals) : 18
            });

            const initialBalance = parseFloat(formData.initialBalance);
            if (initialBalance && !isNaN(initialBalance) && initialBalance !== 0) {
                // Use manual avg cost if provided, otherwise fetched price, otherwise 0/1
                let buyPrice = formData.manualAvgCost ? parseFloat(formData.manualAvgCost) : (fetchedPrice || (formData.ticker ? 0 : 1.0));

                await createTransaction(assetRes.id, {
                    amount: initialBalance,
                    buy_price: buyPrice,
                    date: new Date().toISOString(),
                });
            }

            router.refresh();
            onClose();
            toast(t('asset_created') || 'Asset created successfully', 'success');
            setFormData({ name: '', ticker: '', category: 'Fluid', subCategory: '', initialBalance: '', includeInNetWorth: true, icon: '', manualAvgCost: '', paymentDueDay: '' });
            setMarket('TW');
        } catch (error) {
            console.error("Failed to create asset", error);
            toast(t('asset_create_failed') || 'Failed to create asset', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Auto-fix ticker formatting on blur
    const handleTickerBlur = () => {
        let currentTicker = formData.ticker;
        if (!currentTicker) return;

        // Auto-fix Crypto Ticker
        if (formData.category === 'Crypto' && !currentTicker.includes('-')) {
            currentTicker = `${currentTicker}-USD`;
            setFormData(prev => ({ ...prev, ticker: currentTicker }));
        }

        // Auto-fix TW Stock Ticker if it's 4 digits
        if (formData.category === 'Stock' && market === 'TW' && /^\d{4}$/.test(currentTicker)) {
            setFormData(prev => ({ ...prev, ticker: `${currentTicker}.TW` }));
        }

        // Auto-set name if empty using Contract Address (Simple heuristic or just allow user)
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
                                    formData.category === 'Stock' ? t('ph_stock') :
                                        formData.category === 'Crypto' ? 'Bitcoin' : t('ph_asset_name')
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
                            onChange={(val) => {
                                setFormData({
                                    ...formData,
                                    category: val,
                                    subCategory: subCategories[val]?.[0] || ''
                                });
                                // Reset Market based on default subcategory if needed
                            }}
                            options={categories}
                        />
                    </div>
                    {formData.category !== 'Receivables' && (
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('subcategory')}</Label>
                            <CustomSelect
                                value={formData.subCategory}
                                onChange={(val) => {
                                    setFormData({ ...formData, subCategory: val });
                                    // Auto-set market based on subcategory
                                    if (val === 'TW Stock') setMarket('TW');
                                    if (val === 'US Stock' || val === 'Mutual Fund') setMarket('US');
                                }}
                                options={(subCategories[formData.category] || []).map(sub => ({ value: sub, label: getSubCategoryLabel(sub) }))}
                            />
                        </div>
                    )}
                </div>

                {/* Row 3: Investment Specifics */}
                {(formData.category === 'Stock' || formData.category === 'Crypto') && (
                    <div className="space-y-4">

                        {/* Source Selection for Crypto */}
                        {formData.category === 'Crypto' && (
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('source') || 'Source'}</Label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setSource('manual')}
                                        className={`flex-1 py-1.5 text-sm font-medium rounded-md border ${source === 'manual' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted border-input'}`}
                                    >
                                        Manual
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSource('wallet')}
                                        disabled={connections.length === 0}
                                        className={`flex-1 py-1.5 text-sm font-medium rounded-md border ${source === 'wallet' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted border-input'} ${connections.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        Web3 Wallet
                                    </button>
                                </div>
                                {connections.length === 0 && formData.category === 'Crypto' && (
                                    <p className="text-[10px] text-muted-foreground">Go to Integrations to add a Web3 Wallet.</p>
                                )}
                            </div>
                        )}

                        {source === 'wallet' && (
                            <div className="grid grid-cols-2 gap-4 border-l-2 border-primary/20 pl-3">
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Connection</Label>
                                    <CustomSelect
                                        value={selectedConnectionId}
                                        onChange={setSelectedConnectionId}
                                        options={connections.map(c => ({ value: c.id.toString(), label: c.label ?? `Connection ${c.id}` }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Network</Label>
                                    <CustomSelect
                                        value={network}
                                        onChange={setNetwork}
                                        options={[
                                            { value: 'Ethereum', label: 'Ethereum' },
                                            { value: 'BSC', label: 'BSC' },
                                            { value: 'Scroll', label: 'Scroll' },
                                            { value: 'Arbitrum', label: 'Arbitrum' },
                                        ]}
                                    />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contract Address</Label>
                                    <Input
                                        value={contractAddress}
                                        onChange={(e) => setContractAddress(e.target.value)}
                                        placeholder="0x..."
                                        className="font-mono text-xs"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Decimals</Label>
                                    <Input
                                        value={decimals}
                                        onChange={(e) => setDecimals(e.target.value)}
                                        placeholder="18"
                                        type="number"
                                        className="font-mono"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('ticker')}</Label>
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
                    </div>
                )}

                {/* Row 4: Holdings & Valuation */}
                <div className="grid grid-cols-2 gap-4">
                    <div className={`space-y-2 ${formData.category !== 'Stock' && formData.category !== 'Crypto' ? 'col-span-2' : ''}`}>
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {formData.category === 'Stock' ? t('current_shares') :
                                formData.category === 'Crypto' ? t('current_holdings') :
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
                    {(formData.category === 'Stock' || formData.category === 'Crypto') && (
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

                    {/* Payment Due Day (Only for Liabilities - Credit Cards) */}
                    {formData.category === 'Liabilities' && (
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('payment_due_day')}</Label>
                            <Input
                                type="number"
                                min="1"
                                max="31"
                                value={formData.paymentDueDay}
                                onChange={(e) => setFormData({ ...formData, paymentDueDay: e.target.value })}
                                placeholder={t('payment_due_day_hint')}
                                className="font-mono"
                            />
                            <p className="text-[10px] text-muted-foreground pt-1">{t('payment_due_day_desc')}</p>
                        </div>
                    )}
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
