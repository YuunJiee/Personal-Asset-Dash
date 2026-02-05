const API_URL = "http://localhost:8000/api";

export async function fetchDashboardData() {
    const res = await fetch(`${API_URL}/dashboard/`, { cache: 'no-store' });
    if (!res.ok) {
        throw new Error('Failed to fetch data');
    }
    return res.json();
}

export async function createAsset(assetData: { name: string; ticker: string | null; category: string; sub_category?: string | null; include_in_net_worth?: boolean; icon?: string | null, tags?: { name: string }[], current_price?: number | null }) {
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
