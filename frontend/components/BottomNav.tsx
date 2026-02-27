'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Wallet, PieChart, CreditCard, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/components/LanguageProvider';

export function BottomNav() {
    const pathname = usePathname();
    const { t } = useLanguage();

    const navItems = [
        { href: '/', icon: LayoutDashboard, labelKey: 'dashboard' as const },
        { href: '/assets', icon: Wallet, labelKey: 'assets' as const },
        { href: '/analytics', icon: PieChart, labelKey: 'analytics' as const },
        { href: '/expenses', icon: CreditCard, labelKey: 'budget_planner' as const },
        { href: '/settings', icon: Settings, labelKey: 'settings' as const },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-card/90 backdrop-blur-md border-t border-border pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-around h-14">
                {navItems.map(({ href, icon: Icon, labelKey }) => {
                    const isActive = pathname === href;
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={cn(
                                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full px-1 transition-colors',
                                isActive
                                    ? 'text-foreground'
                                    : 'text-muted-foreground active:text-foreground'
                            )}
                        >
                            <div className={cn(
                                'flex items-center justify-center w-10 h-6 rounded-xl transition-all',
                                isActive ? 'bg-foreground/10' : ''
                            )}>
                                <Icon className={cn('w-5 h-5', isActive && 'stroke-[2.5px]')} />
                            </div>
                            <span className={cn('text-[10px] font-medium leading-tight', isActive ? 'opacity-100' : 'opacity-60')}>
                                {t(labelKey)}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
