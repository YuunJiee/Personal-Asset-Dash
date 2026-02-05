import { useState, useEffect } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomSelect } from "@/components/ui/custom-select";
import { updateAsset, deleteAsset } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Trash2, X, Plus, Tag as TagIcon, ArrowLeft } from 'lucide-react';
import { IconPicker, AssetIcon, getDefaultIcon } from '../IconPicker';

interface EditAssetViewProps {
    asset: any;
    onClose: () => void; // Used for saving/closing the whole flow? Or just success?
    // Actually, View doesn't close dialog directly, it calls callback.
    // We pass onClose to it as "onSuccess" or "onCancel".
    // But existing code uses onClose for everything.
    onBack?: () => void;
}

export function EditAssetView({ asset, onClose, onBack }: EditAssetViewProps) {
    const router = useRouter();
    const { t } = useLanguage();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        ticker: '',
        category: 'Fluid',
        subCategory: '',
        includeInNetWorth: true,
        icon: '',
        manualAvgCost: 0
    });

    // Tag State
    const [tags, setTags] = useState<any[]>([]);
    const [newTag, setNewTag] = useState('');

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

    useEffect(() => {
        if (asset) {
            setFormData({
                name: asset.name,
                ticker: asset.ticker || '',
                category: asset.category,
                subCategory: asset.sub_category || '',
                includeInNetWorth: asset.include_in_net_worth !== undefined ? asset.include_in_net_worth : true,
                icon: asset.icon || '',
                manualAvgCost: asset.manual_avg_cost || ''
            });
            setTags(asset.tags || []);
        }
    }, [asset]);

    const handleDelete = async () => {
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

    const handleAddTag = async () => {
        if (!newTag.trim()) return;
        try {
            const res = await fetch(`http://localhost:8000/api/assets/${asset.id}/tags`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newTag.trim(), color: 'blue' })
            });
            if (res.ok) {
                const updatedAsset = await res.json();
                setTags(updatedAsset.tags);
                setNewTag('');
                router.refresh();
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleRemoveTag = async (tagId: number) => {
        try {
            const res = await fetch(`http://localhost:8000/api/assets/${asset.id}/tags/${tagId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                const updatedAsset = await res.json();
                setTags(updatedAsset.tags);
                router.refresh();
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
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
                manual_avg_cost: formData.manualAvgCost || null
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

                    {formData.category === 'Investment' && (
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

                    {/* Tags Section */}
                    <div className="space-y-2 pt-2 border-t border-border">
                        <Label className="flex items-center gap-2">
                            <TagIcon className="w-4 h-4" /> {t('tags')}
                        </Label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {tags.map((tag) => (
                                <span key={tag.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                                    #{tag.name}
                                    <button type="button" onClick={() => handleRemoveTag(tag.id)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
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
