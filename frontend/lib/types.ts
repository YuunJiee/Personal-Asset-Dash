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
    is_transfer?: boolean;
}

export interface Asset {
    id: number;
    name: string;
    ticker?: string | null;
    category: 'Fluid' | 'Stock' | 'Crypto' | 'Fixed' | 'Receivables' | 'Liabilities';
    sub_category?: string | null;
    source?: string;
    icon?: string | null;
    current_price?: number;
    include_in_net_worth?: boolean;
    is_favorite?: boolean;
    manual_avg_cost?: number | null;
    payment_due_day?: number | null;
    // Computed fields returned by /api/dashboard/
    value_twd?: number;
    unrealized_pl?: number;
    roi?: number;
    transactions?: Transaction[];
    // Integration fields
    connection_id?: number;
    network?: string;
    contract_address?: string;
    last_updated_at?: string;
    /** Nested integration connection, if asset is linked to an exchange/wallet */
    connection?: {
        id: number;
        name: string;
        provider: string;
    } | null;
    /** Discriminant — ensures AssetGroup narrows correctly in union types */
    isGroup?: never;
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
    icon?: string | null;
    budget_amount: number;
    color?: string | null;
    note?: string | null;
    group_name?: string | null;
    is_active: boolean;
    created_at: string;
}

export interface IncomeItem {
    id: number;
    name: string;
    amount: number;
    is_active: boolean;
    created_at: string;
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

/** Wallet/exchange integration connection */
export interface IntegrationConnection {
    id: number;
    provider: string;   // 'wallet' | 'binance' | 'max' | 'pionex'
    label?: string;
    address?: string;
}

/** Single data point returned by /api/stats/asset/{id}/history */
export interface AssetHistoryPoint {
    date: string;
    value: number;
}

/** Single data point for WealthSimulator compound-growth chart */
export interface SimulatorDataPoint {
    year: string;
    balance: number;
    principal: number;
    interest: number;
}

/** A web3 wallet group combining multiple wallet addresses of the same token */
export interface AssetGroup {
    isGroup: true;
    groupKey: string;
    assets: Asset[];
    name: string;
    ticker?: string | null;
    icon?: string | null;
    category: Asset['category'];
    sub_category?: string | null;
    totalValue: number;
    last_updated_at: string | null;
}

/** A single forecast entry returned by /api/stats/forecast */
export interface GoalForecast {
    goal_id: number;
    current_amount: number;
    target_amount: number;
    avg_monthly_growth: number;
    months_to_reach: number;
    predicted_date: string;
}

export interface MetricData {
    value: number;
    status: string;
}

export interface RiskMetricsResponse {
    cagr: MetricData;
    maxDrawdown: MetricData;
    volatility: MetricData;
}
