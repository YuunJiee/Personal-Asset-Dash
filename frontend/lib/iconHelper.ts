import { LucideIcon, Wallet, CreditCard, Building, Coins, Bitcoin, DollarSign, Home, Car, Smartphone, Briefcase, Key } from 'lucide-react';

export const getCategoryIconName = (category: string, subCategory?: string): string => {
    // Sub-category Specific Defaults
    if (subCategory) {
        const sub = subCategory.toLowerCase();
        if (sub.includes('crypto')) return 'Bitcoin';
        if (sub.includes('stock') || sub.includes('fund')) return 'TrendingUp';
        if (sub.includes('cash')) return 'Banknote';
        if (sub.includes('card')) return 'CreditCard';
        if (sub.includes('real estate')) return 'Home';
        if (sub.includes('car')) return 'Car';
        if (sub.includes('wallet')) return 'Wallet';
    }

    // Category Defaults
    switch (category) {
        case 'Fluid': return 'Wallet';
        case 'Stock': return 'TrendingUp';
        case 'Crypto': return 'Bitcoin';
        case 'Receivables': return 'Briefcase';
        case 'Liabilities': return 'CreditCard';
        default: return 'Coins';
    }
};
