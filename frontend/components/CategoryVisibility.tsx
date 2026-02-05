'use client';

import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch'; // Will check if this exists, else fallback
import { Label } from '@/components/ui/label';

import { useLanguage } from '@/components/LanguageProvider';

const ALL_CATEGORIES = ['Fluid', 'Investment', 'Fixed', 'Receivables', 'Liabilities'];

export function CategoryVisibility() {
    const { t } = useLanguage();
    const [visibility, setVisibility] = useState<Record<string, boolean>>({
        'Fluid': true,
        'Investment': true,
        'Fixed': true,
        'Receivables': true,
        'Liabilities': true
    });

    useEffect(() => {
        fetch('http://localhost:8000/api/settings/visible_categories')
            .then(res => {
                if (res.ok) return res.json();
                throw new Error('Not found');
            })
            .then(data => {
                try {
                    const parsed = JSON.parse(data.value);
                    // Merge with defaults to ensure all keys exist
                    setVisibility(prev => ({ ...prev, ...parsed }));
                } catch (e) { console.error(e); }
            })
            .catch(() => {
                // Default: All true
            });
    }, []);

    const toggle = async (cat: string) => {
        const newVal = !visibility[cat];
        const newVisibility = { ...visibility, [cat]: newVal };
        setVisibility(newVisibility);

        try {
            await fetch('http://localhost:8000/api/settings/visible_categories', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'visible_categories', value: JSON.stringify(newVisibility) })
            });
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="space-y-4">
            {ALL_CATEGORIES.map(cat => (
                <div key={cat} className="flex items-center justify-between">
                    <Label htmlFor={`toggle-${cat}`} className="text-base">{t(cat)}</Label>
                    <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground">{visibility[cat] ? t('visible') : t('hidden')}</Label>
                        <Switch
                            id={`toggle-${cat}`}
                            checked={visibility[cat]}
                            onCheckedChange={() => toggle(cat)}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}
