'use client';

import { MonthlyChangeChart } from "@/components/MonthlyChangeChart";
import { NetWorthTrendChart } from "@/components/NetWorthTrendChart";
import { usePrivacy } from "@/components/PrivacyProvider";
import { useState, useEffect } from "react";

import { useLanguage } from "@/components/LanguageProvider";
import { PieChart } from "lucide-react";
import { WealthSimulatorWidget } from "@/components/WealthSimulatorWidget";
import { EmergencyFundWidget } from "@/components/EmergencyFundWidget";
import { fetchDashboardData } from "@/lib/api";

export default function AnalyticsPage() {
    const { isPrivacyMode } = usePrivacy();
    const { t } = useLanguage();

    const [dashboardData, setDashboardData] = useState<any>(null);
    const [currentNetWorth, setCurrentNetWorth] = useState(0);
    const [currentCash, setCurrentCash] = useState(0);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const data = await fetchDashboardData();
                if (data) {
                    setDashboardData(data);
                    // Calculate net worth and cash for tools
                    if (data.assets) {
                        const total = data.assets.reduce((sum: number, a: any) => sum + (a.include_in_net_worth !== false ? (a.value_twd || 0) : 0), 0);
                        setCurrentNetWorth(total);
                        const cashTotal = data.assets.filter((a: any) => a.category === 'Fluid').reduce((sum: number, a: any) => sum + (a.value_twd || 0), 0);
                        setCurrentCash(cashTotal);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch dashboard data for analytics", error);
            }
        };
        fetchDashboard();
    }, []);

    return (
        <div className="min-h-screen bg-background p-6 md:p-10 text-foreground transition-colors duration-300">
            <header className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                        <PieChart className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-foreground tracking-tight">{t('analytics_title')}</h1>
                        <p className="text-muted-foreground mt-1">{t('analytics_desc')}</p>
                    </div>
                </div>
                <a
                    href="/stock"
                    className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 transition-colors text-sm font-medium"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    {t('manage_investments')}
                </a>
            </header>

            <div className="space-y-8">
                {/* Financial Tools */}
                {dashboardData ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <WealthSimulatorWidget currentNetWorth={currentNetWorth} />
                        <EmergencyFundWidget currentCash={currentCash} />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="h-[400px] w-full bg-muted/20 animate-pulse rounded-3xl border border-transparent"></div>
                        <div className="h-[400px] w-full bg-muted/20 animate-pulse rounded-3xl border border-transparent"></div>
                    </div>
                )}

                {/* Historical Charts */}
                <div className="space-y-8">
                    <NetWorthTrendChart />
                    <MonthlyChangeChart />
                </div>
            </div>
        </div>
    );
}

