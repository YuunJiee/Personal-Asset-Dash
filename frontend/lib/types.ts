/**
 * Shared TypeScript interfaces for Yantage frontend.
 * Import from here instead of using `any`.
 */

export interface Transaction {
    id: number;
    asset_id: number;
    amount: number;
    buy_price: number;
    date: string;
    note?: string;
}

export interface Asset {
    id: number;
    name: string;
    ticker?: string;
    category: 'Fluid' | 'Stock' | 'Crypto' | 'Fixed' | 'Receivables' | 'Liabilities';
    sub_category?: string;
    source?: string;
    icon?: string;
    current_price?: number;
    include_in_net_worth?: boolean;
    is_favorite?: boolean;
    // Computed fields returned by /api/dashboard/
    value_twd?: number;
    unrealized_pl?: number;
    roi?: number;
    transactions?: Transaction[];
    // Integration fields
    connection_id?: number;
    network?: string;
}

export interface Goal {
    id: number;
    name: string;
    goal_type: 'NET_WORTH' | 'ASSET_ALLOCATION';
    target_amount: number;
    currency: string;
    description?: string;
}

export interface Alert {
    id: number;
    asset_id: number;
    condition: 'ABOVE' | 'BELOW';
    target_price: number;
    is_active: boolean;
    triggered_at?: string;
}

export interface BudgetCategory {
    id: number;
    name: string;
    icon: string;
    budget_amount: number;
    color: string;
    note?: string;
}

export interface DashboardData {
    net_worth: number;
    total_pl: number;
    total_roi: number;
    exchange_rate: number;
    assets: Asset[];
    updated_at: string;
}

export interface SystemSetting {
    key: string;
    value: string;
}
