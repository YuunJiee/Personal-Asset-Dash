/**
 * SWR-based data-fetching hooks.
 *
 * Why SWR?
 * - Automatic deduplication: multiple components calling `useDashboard()` at the
 *   same render cycle share ONE in-flight request.
 * - Stale-while-revalidate: returns cached data immediately (no loading flash),
 *   then silently refreshes in the background.
 * - Built-in error / loading states — no manual `try/catch` boilerplate per page.
 *
 * Cache keys follow the pattern: the actual API URL string so SWR can
 * automatically invalidate when you call `mutate(key)`.
 */

import useSWR, { mutate as globalMutate, useSWRConfig } from 'swr';
import { useEffect } from 'react';
import {
    fetchDashboardData,
    fetchHistory,
    fetchBudgetCategories,
    fetchIncomeItems,
    fetchSetting,
    fetchRiskMetrics,
    API_URL,
} from './api';
import type { DashboardData, BudgetCategory, IncomeItem, RiskMetricsResponse, Alert } from './types';

// ── Shared history data point type ───────────────────────────────────────────
export interface HistoryPoint {
    date: string;
    value: number;
    breakdown?: Record<string, number>;
}

// ── SWR key factories (stable strings used as cache keys) ────────────────────
export const SWR_KEYS = {
    dashboard:    `${API_URL}/dashboard/`,
    history:      (range: string) => `${API_URL}/stats/history?range=${range}`,
    budgets:      `${API_URL}/budgets/categories`,
    income:       `${API_URL}/income/items`,
    setting:      (key: string) => `${API_URL}/settings/${key}`,
    riskMetrics:  `${API_URL}/stats/risk_metrics`,
    alerts:       `${API_URL}/alerts/`,
} as const;

// ── Convenience re-validators (call after mutations) ─────────────────────────
export const revalidateDashboard  = () => globalMutate(SWR_KEYS.dashboard);
export const revalidateBudgets    = () => globalMutate(SWR_KEYS.budgets);
export const revalidateIncome     = () => globalMutate(SWR_KEYS.income);
export const revalidateHistory    = (range: string) => globalMutate(SWR_KEYS.history(range));
export const revalidateAlerts     = () => globalMutate(SWR_KEYS.alerts);

// ── Hooks ─────────────────────────────────────────────────────────────────────

/**
 * Primary dashboard data (net worth, asset list, FX rate, etc.).
 * All components that display any asset data can call this — SWR deduplicates
 * them into a single network request per revalidation window.
 */
export function useDashboard() {
    const { data, error, isLoading, mutate } = useSWR<DashboardData>(
        SWR_KEYS.dashboard,
        fetchDashboardData,
    );
    return {
        dashboard: data,
        assets: data?.assets ?? [],
        isLoading,
        isError: !!error,
        refresh: mutate,
    };
}

/**
 * Net-worth history for a given time range.
 * Each range is cached independently (e.g. '30d', '1y', 'all').
 */
export function useNetWorthHistory(range: string) {
    const { data, error, isLoading } = useSWR<HistoryPoint[]>(
        SWR_KEYS.history(range),
        () => fetchHistory(range),
        {
            // History data changes only after the nightly snapshot job →
            // revalidate at most once per 5 minutes to avoid hammering the DB.
            dedupingInterval: 5 * 60 * 1000,
        },
    );
    return {
        history: data ?? [],
        isLoading,
        isError: !!error,
    };
}

/**
 * Budget categories list.
 */
export function useBudgetCategories() {
    const { data, error, isLoading, mutate } = useSWR<BudgetCategory[]>(
        SWR_KEYS.budgets,
        fetchBudgetCategories,
    );
    return {
        categories: data ?? [],
        isLoading,
        isError: !!error,
        refresh: mutate,
    };
}

/**
 * Income items list.
 */
export function useIncomeItems() {
    const { data, error, isLoading, mutate } = useSWR<IncomeItem[]>(
        SWR_KEYS.income,
        fetchIncomeItems,
    );
    return {
        incomeItems: data ?? [],
        isLoading,
        isError: !!error,
        refresh: mutate,
    };
}

/**
 * A single persisted application setting.
 */
export function useSetting(key: string) {
    const { data, error, isLoading, mutate } = useSWR<{ key: string; value: string }>(
        SWR_KEYS.setting(key),
        () => fetchSetting(key),
    );
    return {
        setting: data,
        value: data?.value,
        isLoading,
        isError: !!error,
        refresh: mutate,
    };
}

/**
 * Risk metrics (CAGR, max drawdown, volatility).
 * Heavy calculation on the backend → cache for 10 minutes.
 */
export function useRiskMetrics() {
    const { data, error, isLoading } = useSWR<RiskMetricsResponse>(
        SWR_KEYS.riskMetrics,
        fetchRiskMetrics,
        { dedupingInterval: 10 * 60 * 1000 },
    );
    return {
        metrics: data,
        isLoading,
        isError: !!error,
    };
}

/**
 * Alerts list.
 */
export function useAlerts() {
    const { data, error, isLoading, mutate } = useSWR<Alert[]>(
        SWR_KEYS.alerts,
        () => fetch(`${API_URL}/alerts/`).then(r => r.json()),
    );
    return {
        alerts: data ?? [],
        isLoading,
        isError: !!error,
        refresh: mutate,
    };
}

/**
 * SSE real-time push hook.
 *
 * Connects to the backend `/api/sse` endpoint.  Whenever the scheduler
 * finishes a price update it broadcasts `{"type":"prices_updated"}` which
 * causes this hook to revalidate the SWR dashboard cache — the UI refreshes
 * automatically without any polling or manual page reload.
 *
 * URL strategy:
 *  - Dev  (Next.js on :3001 / :3000): bypass the proxy, connect directly to
 *    the FastAPI backend on :8000.
 *  - Prod (behind Nginx): keep the same host/origin — Nginx proxies /api/sse.
 *
 * Reconnection is handled automatically by the browser EventSource API.
 *
 * NOTE: Call this hook only inside a component that is a **child** of
 * `<SWRConfig>` (e.g. via the `<RealtimeSync>` helper in ClientLayout).
 */
export function useRealtimeUpdates() {
    const { mutate } = useSWRConfig();

    useEffect(() => {
        function getSseUrl(): string {
            const host = window.location.host;
            // In dev, Next.js listens on :3001/:3000 but FastAPI is on :8000.
            const backendHost = /:\d{4}$/.test(host)
                ? host.replace(/:\d{4}$/, ':8000')
                : host;
            return `${window.location.protocol}//${backendHost}/api/sse`;
        }

        const es = new EventSource(getSseUrl());

        es.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data) as { type: string };
                if (msg.type === 'prices_updated') {
                    void mutate(SWR_KEYS.dashboard);
                }
            } catch (_) { /* ignore malformed messages */ }
        };

        return () => {
            es.close();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
}
