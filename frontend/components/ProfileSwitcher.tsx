'use client';

import { useState, useEffect } from 'react';
import { ChevronsUpDown, Check, Plus, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'; // Assuming Popover exists, if not need to create
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/components/LanguageProvider';
import { ProfileDialog } from './ProfileDialog';

export function ProfileSwitcher() {
    const { t } = useLanguage();
    const [open, setOpen] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [profiles, setProfiles] = useState<string[]>([]);
    const [current, setCurrent] = useState('default');

    const fetchProfiles = async () => {
        try {
            const res = await fetch('http://localhost:8000/api/system/profiles');
            if (res.ok) {
                const data = await res.json();
                setProfiles(data.profiles);
                setCurrent(data.current);
            }
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        fetchProfiles();
    }, []);

    const handleSwitch = async (name: string) => {
        if (name === current) return;
        try {
            const res = await fetch('http://localhost:8000/api/system/switch_profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            });
            if (res.ok) {
                setCurrent(name);
                setOpen(false);
                window.location.reload(); // Reload to refresh all data
            }
        } catch (e) { console.error(e); }
    };

    return (
        <>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between h-9 px-3 text-sm font-normal"
                    >
                        <div className="flex items-center gap-2 truncate">
                            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs">
                                <User className="w-3 h-3" />
                            </div>
                            <span className="truncate capitalize">{current}</span>
                        </div>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0 ml-4">
                    <div className="p-1">
                        <div className="text-xs font-semibold text-muted-foreground px-2 py-1.5">
                            {t('my_ledgers')}
                        </div>
                        {profiles.map((profile) => (
                            <div
                                key={profile}
                                onClick={() => handleSwitch(profile)}
                                className={cn(
                                    "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-muted transition-colors",
                                    current === profile && "bg-muted"
                                )}
                            >
                                <Check
                                    className={cn(
                                        "mr-2 h-4 w-4",
                                        current === profile ? "opacity-100" : "opacity-0"
                                    )}
                                />
                                <span className="capitalize">{profile}</span>
                            </div>
                        ))}
                    </div>
                    <div className="border-t p-1">
                        <div
                            onClick={() => {
                                setOpen(false);
                                setIsCreateOpen(true);
                            }}
                            className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-muted transition-colors text-primary"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            {t('create_new')}
                        </div>
                    </div>
                </PopoverContent>
            </Popover>

            <ProfileDialog
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onProfileCreated={fetchProfiles}
            />
        </>
    );
}
