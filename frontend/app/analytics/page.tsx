'use client';

import { MonthlyChangeChart } from "@/components/MonthlyChangeChart";
import { NetWorthTrendChart } from "@/components/NetWorthTrendChart";
import { AssetAllocationWidget } from "@/components/AssetAllocationWidget";
import { TopPerformersWidget } from "@/components/TopPerformersWidget";
import { usePrivacy } from "@/components/PrivacyProvider";
import { useState, useEffect } from "react";

import { useLanguage } from "@/components/LanguageProvider";

export default function AnalyticsPage() {
    const { isPrivacyMode } = usePrivacy();
    const { t } = useLanguage();

    const [dashboardData, setDashboardData] = useState<any>(null);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const res = await fetch('http://localhost:8000/api/dashboard');
                if (res.ok) {
                    const data = await res.json();
                    setDashboardData(data);
                }
            } catch (error) {
                console.error("Failed to fetch dashboard data for analytics", error);
            }
        };
        fetchDashboard();
    }, []);

    return (
        <div className="min-h-screen bg-background p-6 md:p-10 text-foreground transition-colors duration-300">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-foreground tracking-tight">{t('analytics_title')}</h1>
                <p className="text-muted-foreground mt-1">{t('analytics_desc')}</p>
            </header>

            <div className="space-y-8">
                {/* Top Row: New Widgets */}
                {/* Top Row: New Widgets or Skeletons */}
                {dashboardData ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <AssetAllocationWidget assets={dashboardData.assets} />
                        <TopPerformersWidget assets={dashboardData.assets} />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Skeletons for AssetAllocationWidget and TopPerformersWidget */}
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

