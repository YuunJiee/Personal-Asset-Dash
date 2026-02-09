import { useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { API_URL } from '@/lib/api';

interface ProfileDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onProfileCreated: () => void;
}

export function ProfileDialog({ isOpen, onClose, onProfileCreated }: ProfileDialogProps) {
    const { t } = useLanguage();
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch(`${API_URL}/system/profiles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            });

            if (res.ok) {
                onProfileCreated();
                onClose();
                setName('');
            } else {
                const data = await res.json();
                setError(data.detail || 'Failed to create profile');
            }
        } catch (e) {
            setError('Connection failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog isOpen={isOpen} onClose={onClose} title={t('create_new_profile')}>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
                <p className="text-sm text-muted-foreground">
                    {t('profile_desc')}
                </p>
                <div>
                    <Input
                        placeholder={t('profile_name_placeholder')}
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                        pattern="[a-zA-Z0-9]+"
                        title="Alphanumeric characters only"
                    />
                    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
                </div>
                <div className="flex justify-end gap-2">
                    {/* <Button type="button" variant="ghost" onClick={onClose}>{t('cancel')}</Button> */}
                    <Button type="submit" disabled={loading}>
                        {loading ? t('loading') : t('create_profile')}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
