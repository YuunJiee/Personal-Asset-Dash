'use client';

import { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { useLanguage } from '@/components/LanguageProvider';
import { AssetHistoryView } from './views/AssetHistoryView';
import { EditAssetView } from './views/EditAssetView';
import { QuickAdjustView } from './views/QuickAdjustView';
import { TransferView } from './views/TransferView';

interface AssetActionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    asset: any;
    allAssets?: any[]; // For transfer
    initialMode?: 'history' | 'edit' | 'adjust' | 'set' | 'transfer';
}

export function AssetActionDialog({ isOpen, onClose, asset, allAssets, initialMode = 'history' }: AssetActionDialogProps) {
    const { t } = useLanguage();
    const [mode, setMode] = useState(initialMode);

    // Sync mode when dialog opens/closes
    useEffect(() => {
        if (isOpen) {
            setMode(initialMode);
        }
    }, [isOpen, initialMode]);

    if (!asset && mode !== 'transfer') return null;

    const getTitle = () => {
        switch (mode) {
            case 'edit':
                return t('edit_asset');
            case 'adjust':
            case 'set':
                return `${t('adjust_balance')}: ${asset?.name}`;
            case 'transfer':
                return t('transfer_funds');
            case 'history':
            default:
                return asset?.name || '';
        }
    };

    return (
        <Dialog isOpen={isOpen} onClose={onClose} title={getTitle()}>
            <DynamicContent
                mode={mode}
                asset={asset}
                allAssets={allAssets}
                onClose={onClose}
                setMode={setMode}
            />
        </Dialog>
    );
}

// Separate component to handle Title logic if Dialog wrapper allows dynamic title? 
// Actually, looking at previous code: <Dialog ... title={asset.name}>.
// We can't change props of parent Dialog easily from inside.
// So we should NOT use the wrapper `Dialog` from `@/components/ui/dialog` if it enforces a single title for the lifespan?
// Or we just update the title prop of AssetActionDialog based on mode?

// Let's refactor slightly:
// We need to check `frontend/components/ui/dialog.tsx` to see if it just passes props to Radix.
// If so, we can pass a dynamic title.

function DynamicContent({ mode, asset, allAssets, onClose, setMode }: any) {
    switch (mode) {
        case 'edit':
            return (
                <EditAssetView
                    asset={asset}
                    onClose={onClose}
                    onBack={() => setMode('history')}
                />
            );
        case 'adjust':
        case 'set': // QuickAdjust supports both, mapping might be needed
            return (
                <QuickAdjustView
                    asset={asset}
                    onClose={onClose}
                    onBack={() => setMode('history')}
                />
            );
        case 'transfer':
            return (
                <TransferView
                    assets={allAssets || []}
                    initialFromAssetId={asset?.id}
                    onClose={onClose}
                    onBack={() => setMode('history')}
                />
            );
        case 'history':
        default:
            return (
                <AssetHistoryView
                    asset={asset}
                    onEdit={() => setMode('edit')}
                    onAdjustBalance={() => setMode('adjust')}
                    onTransfer={() => setMode('transfer')}
                />
            );
    }
}
