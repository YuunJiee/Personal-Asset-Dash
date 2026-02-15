// Use relative path '/api' which works with Next.js Rewrites (proxy)
// This avoids CORS and Mixed Content issues when deployed
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

export async function fetchDashboardData() {
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

export async function fetchAssets() {
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

export async function fetchExpenses() {
    try {
        const res = await fetch(`${API_URL}/expenses/`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return await res.json();
    } catch (error) {
        console.error("fetchExpenses failed:", error);
        throw error;
    }
}

export async function createAsset(assetData: { name: string; ticker: string | null; category: string; sub_category?: string | null; include_in_net_worth?: boolean; icon?: string | null, tags?: { name: string }[], current_price?: number | null, payment_due_day?: number | null }) {
    const res = await fetch(`${API_URL}/assets/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assetData)
    });
    if (!res.ok) throw new Error('Failed to create asset');
    return res.json();
}

export async function createTransaction(assetId: number, transactionData: any) {
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

export async function updateAsset(assetId: number, assetData: any) {
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
export async function updateTransaction(id: number, data: any) {
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
