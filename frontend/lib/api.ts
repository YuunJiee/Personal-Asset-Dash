// Use relative path '/api' which works with Next.js Rewrites (proxy)
// This avoids CORS and Mixed Content issues when deployed
import { DashboardData, Asset, Goal, Alert, Transaction, BudgetCategory, RiskMetricsResponse, IncomeItem } from './types';

const isServer = typeof window === 'undefined';
export const API_URL = isServer
    ? (process.env.INTERNAL_API_URL || "http://127.0.0.1:8000/api") // Server-side: Direct to backend
    : "/api"; // Client-side: Relative path (proxied by Next.js)

// Asset History
export async function fetchAssetHistory(assetId: number, range: string = '1y') {
    try {
        const res = await fetch(`${API_URL}/stats/asset/${assetId}/history?range=${range}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return await res.json();
    } catch (error) {
        console.error("fetchAssetHistory failed:", error);
        throw error;
    }
}

export async function fetchRiskMetrics(): Promise<RiskMetricsResponse> {
    try {
        const res = await fetch(`${API_URL}/stats/risk_metrics`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return await res.json();
    } catch (error) {
        console.error("fetchRiskMetrics failed:", error);
        throw error;
    }
}

export async function fetchDashboardData(): Promise<DashboardData> {
    try {
        const url = `${API_URL}/dashboard/`;
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        return await res.json();
    } catch (error) {
        console.error("fetchDashboardData failed:", error);
        throw error;
    }
}

export async function fetchAssets(): Promise<Asset[]> {
    try {
        const res = await fetch(`${API_URL}/assets/`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return await res.json();
    } catch (error) {
        console.error("fetchAssets failed:", error);
        throw error;
    }
}

export async function fetchSetting(key: string) {
    try {
        const res = await fetch(`${API_URL}/settings/${key}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return await res.json();
    } catch (error) {
        console.error(`fetchSetting failed for ${key}:`, error);
        throw error;
    }
}

export async function updateSetting(key: string, value: string) {
    try {
        const res = await fetch(`${API_URL}/settings/${key}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, value })
        });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return await res.json();
    } catch (error) {
        console.error(`updateSetting failed for ${key}:`, error);
        throw error;
    }
}

export async function fetchRebalanceData() {
    try {
        const res = await fetch(`${API_URL}/stats/rebalance`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return await res.json();
    } catch (error) {
        console.error("fetchRebalanceData failed:", error);
        throw error;
    }
}

export async function fetchHistory(range: string = '1y') {
    try {
        const res = await fetch(`${API_URL}/stats/history?range=${range}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return await res.json();
    } catch (error) {
        console.error("fetchHistory failed:", error);
        throw error;
    }
}

export async function fetchGoals() {
    try {
        const res = await fetch(`${API_URL}/goals/`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return await res.json();
    } catch (error) {
        console.error("fetchGoals failed:", error);
        throw error;
    }
}

export async function fetchForecast() {
    try {
        const res = await fetch(`${API_URL}/stats/forecast`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return await res.json();
    } catch (error) {
        console.error("fetchForecast failed:", error);
        throw error;
    }
}

export async function fetchBudgetCategories(): Promise<BudgetCategory[]> {
    try {
        const res = await fetch(`${API_URL}/budgets/`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return await res.json();
        return await res.json();
    } catch (error) {
        console.error("fetchBudgetCategories failed:", error);
        throw error;
    }
}

// --- Income API ---
export async function fetchIncomeItems(): Promise<IncomeItem[]> {
    try {
        const res = await fetch(`${API_URL}/income/`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return await res.json();
    } catch (error) {
        console.error("fetchIncomeItems failed:", error);
        throw error;
    }
}

export async function createIncomeItem(data: { name: string; amount: number }) {
    const res = await fetch(`${API_URL}/income/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("Failed to create income item");
    return res.json();
}

export async function updateIncomeItem(id: number, data: { name?: string; amount?: number }) {
    const res = await fetch(`${API_URL}/income/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("Failed to update income item");
    return res.json();
}

export async function deleteIncomeItem(id: number) {
    const res = await fetch(`${API_URL}/income/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error("Failed to delete income item");
    return true;
}

export async function createAsset(assetData: {
    name: string;
    ticker: string | null;
    category: string;
    sub_category?: string | null;
    include_in_net_worth?: boolean;
    icon?: string | null;
    tags?: { name: string }[];
    current_price?: number | null;
    payment_due_day?: number | null;
    // Web3 Fields
    source?: string;
    network?: string;
    contract_address?: string;
    decimals?: number;
    connection_id?: number | null;
}) {
    const res = await fetch(`${API_URL}/assets/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assetData)
    });
    if (!res.ok) throw new Error('Failed to create asset');
    return res.json();
}

export async function createTransaction(assetId: number, transactionData: Omit<Transaction, 'id' | 'asset_id'>): Promise<Transaction> {
    const res = await fetch(`${API_URL}/assets/${assetId}/transactions/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transactionData),
    });
    if (!res.ok) throw new Error('Failed to create transaction');
    return res.json();
}

export async function deleteAsset(assetId: number) {
    const res = await fetch(`${API_URL}/assets/${assetId}`, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete asset');
    return res.json();
}

export async function updateAsset(assetId: number, assetData: Partial<Omit<Asset, 'id'>>): Promise<Asset> {
    const res = await fetch(`${API_URL}/assets/${assetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assetData),
    });
    if (!res.ok) throw new Error('Failed to update asset');
    return res.json();
}

export async function lookupTicker(ticker: string) {
    const res = await fetch(`${API_URL}/assets/lookup/${encodeURIComponent(ticker)}`);
    if (!res.ok) throw new Error('Failed to lookup ticker');
    return res.json();
}

export async function transferFunds(data: { from_asset_id: number; to_asset_id: number; amount: number; fee?: number; date?: string }) {
    const res = await fetch(`${API_URL}/transactions/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Transfer failed');
    }
    return res.json();
}

// Update Transaction
export async function updateTransaction(id: number, data: Partial<Omit<Transaction, 'id'>>): Promise<Transaction> {
    const res = await fetch(`${API_URL}/assets/transactions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || 'Failed to update transaction');
    }
    return res.json();
}

export async function deleteTransaction(id: number) {
    const res = await fetch(`${API_URL}/assets/transactions/${id}`, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete transaction');
    return res.json();
}

export async function fetchIntegrations() {
    try {
        const res = await fetch(`${API_URL}/integrations/`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return await res.json();
    } catch (error) {
        console.error("fetchIntegrations failed:", error);
        throw error;
    }
}

export async function discoverWalletAssets(connectionId: number) {
    try {
        const res = await fetch(`${API_URL}/integrations/discover/${connectionId}`, {
            method: 'POST',
            cache: 'no-store'
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || `HTTP error! status: ${res.status}`);
        }
        return await res.json();
    } catch (error) {
        console.error("discoverWalletAssets failed:", error);
        throw error;
    }
}
