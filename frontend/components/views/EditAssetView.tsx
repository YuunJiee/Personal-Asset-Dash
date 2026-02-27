import { useState, useEffect } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomSelect } from "@/components/ui/custom-select";
import { updateAsset, deleteAsset, API_URL } from '@/lib/api';
import type { Asset } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { Trash2, X, Plus, Tag as TagIcon, ArrowLeft } from 'lucide-react';
import { IconPicker, AssetIcon, getDefaultIcon } from '../IconPicker';

interface EditAssetViewProps {
    asset: Asset | null;
    onClose: () => void;
    onBack?: () => void;
}

export function EditAssetView({ asset, onClose, onBack }: EditAssetViewProps) {
    const router = useRouter();
    const { t } = useLanguage();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState<{
        name: string;
        ticker: string;
        category: Asset['category'];
        subCategory: string;
        includeInNetWorth: boolean;
        icon: string;
        manualAvgCost: string | number;
        paymentDueDay: string | number;
    }>({
        name: '',
        ticker: '',
        category: 'Fluid',
        subCategory: '',
        includeInNetWorth: true,
        icon: '',
        manualAvgCost: 0,
        paymentDueDay: ''
    });

    // Tag Removal: Tag items removed.

    const subCategories: Record<string, string[]> = {
        'Fluid': ['Cash', 'E-Wallet', 'Debit Card', 'Other'],
        'Stock': ['TW Stock', 'US Stock', 'ETF', 'Bond', 'Mutual Fund', 'Other Investment'],
        'Crypto': ['Coin', 'Token', 'Stablecoin', 'DeFi', 'NFT'],
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

    useEffect(() => {
        if (asset) {
            setFormData({
                name: asset.name,
                ticker: asset.ticker || '',
                category: asset.category,
                subCategory: asset.sub_category || '',
                includeInNetWorth: asset.include_in_net_worth !== undefined ? asset.include_in_net_worth : true,
                icon: asset.icon || '',
                manualAvgCost: asset.manual_avg_cost || '',
                paymentDueDay: asset.payment_due_day || ''
            });
            // setTags(asset.tags || []);
        }
    }, [asset]);

    const handleDelete = async () => {
        if (!asset) return;
        if (!confirm(t('delete_asset_confirm'))) return;
        setLoading(true);
        try {
            await deleteAsset(asset.id);
            router.refresh();
            onClose();
        } catch (e) {
            alert('Delete failed');
        } finally {
            setLoading(false);
        }
    };



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!asset) return;
        setLoading(true);
        try {
            // Determine Name and Icon defaults
            const finalName = formData.name || formData.subCategory || "Asset";
            const finalIcon = formData.icon || getDefaultIcon(formData.category, formData.subCategory);

            await updateAsset(asset.id, {
                name: finalName,
                ticker: formData.ticker || null,
                category: formData.category,
                sub_category: formData.subCategory || null,
                include_in_net_worth: formData.includeInNetWorth,
                icon: finalIcon,
                manual_avg_cost: formData.manualAvgCost ? Number(formData.manualAvgCost) : null,
                payment_due_day: formData.category === 'Liabilities' && formData.paymentDueDay ? parseInt(formData.paymentDueDay as string) : null
            });



            router.refresh();
            onClose();
        } catch (error) {
            console.error("Failed to update asset", error);
            alert("Error updating asset");
        } finally {
            setLoading(false);
        }
    };

    if (!asset) return null;

    const currentBalance = asset.transactions ? asset.transactions.reduce((acc: any, t: any) => acc + t.amount, 0) : 0;

    return (
        <div className="max-h-[80vh] overflow-y-auto px-1">
            <form onSubmit={handleSubmit} className="space-y-6">

                {asset.source === 'max' && (
                    <div className="bg-blue-500/10 text-blue-600 px-4 py-3 rounded-xl text-sm font-medium mb-4 flex items-center gap-2">
                        🔒 This asset is managed by MAX Integration. Manual edits are disabled to ensure data consistency.
                    </div>
                )}

                <fieldset disabled={asset.source === 'max'} className="space-y-6 opacity-100 disabled:opacity-80">
                    {/* Name & Icon */}
                    <div className="flex gap-4 items-end">
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('icon_label')}</Label>
                            <IconPicker
                                value={formData.icon}
                                onChange={(icon) => setFormData({ ...formData, icon })}
                                defaultIcon={getDefaultIcon(formData.category, formData.subCategory)}
                            />
                        </div>
                        <div className="flex-1 space-y-2">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('name')}</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
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

                    {(formData.category === 'Stock' || formData.category === 'Crypto') && (
                        <div className="flex gap-4">
                            <div className="space-y-2 flex-1">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('ticker')}</Label>
                                <Input
                                    className="h-11 rounded-xl"
                                    value={formData.ticker}
                                    onChange={(e) => setFormData({ ...formData, ticker: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2 flex-1">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('avg_cost_twd')}</Label>
                                <Input
                                    type="number"
                                    className="h-11 rounded-xl"
                                    value={formData.manualAvgCost}
                                    onChange={(e) => setFormData({ ...formData, manualAvgCost: parseFloat(e.target.value) })}
                                    placeholder="Optional"
                                />
                            </div>
                        </div>
                    )}

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
                                className="font-mono h-11 rounded-xl"
                            />
                            <p className="text-[10px] text-muted-foreground pt-1">{t('payment_due_day_desc')}</p>
                        </div>
                    )}



                    <div className="pt-2 border-t border-border">
                        <div className="flex items-center space-x-3 py-2">
                            <input
                                type="checkbox"
                                id="editIncludeInNetWorth"
                                className="w-5 h-5 rounded-md border-gray-300 text-primary focus:ring-primary accent-primary"
                                checked={formData.includeInNetWorth}
                                onChange={(e) => setFormData({ ...formData, includeInNetWorth: e.target.checked })}
                            />
                            <label htmlFor="editIncludeInNetWorth" className="text-sm font-medium leading-none cursor-pointer">
                                {t('include_in_net_worth')}
                            </label>
                        </div>
                    </div>
                </fieldset>

                <div className="flex justify-between items-center pt-6">
                    <div className="flex gap-2">
                        {onBack && (
                            <Button type="button" variant="ghost" onClick={onBack}>
                                <ArrowLeft className="w-4 h-4 mr-1" /> {t('back')}
                            </Button>
                        )}
                        {asset.source !== 'max' && (
                            <Button type="button" variant="ghost" className="text-red-500 hover:bg-red-50 hover:text-red-600" onClick={handleDelete}>
                                <Trash2 className="w-4 h-4 mr-1" /> {t('delete')}
                            </Button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {/* <Button type="button" variant="ghost" onClick={onClose}>{t('cancel')}</Button> */}
                        {asset.source !== 'max' && (
                            <Button type="submit" disabled={loading}>
                                {loading ? t('loading') : t('save_changes')}
                            </Button>
                        )}
                    </div>
                </div>
            </form>
        </div>
    );
}
