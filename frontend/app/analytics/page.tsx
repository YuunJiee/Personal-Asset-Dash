'use client';

import { MonthlyChangeChart } from "@/components/MonthlyChangeChart";
import { NetWorthTrendChart } from "@/components/NetWorthTrendChart";
import { RiskMetricsWidget } from "@/components/RiskMetricsWidget";
import { useLanguage } from "@/components/LanguageProvider";
import { ChartSkeleton, StatCardSkeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { PieChart, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AnalyticsPage() {
    const { t } = useLanguage();
    // Lightweight loading flag: show skeletons until charts mount
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => { setIsLoading(false); }, []);

    return (
        <div className="min-h-screen bg-background p-6 md:p-10 text-foreground transition-colors duration-300 print:p-4">
            <header className="mb-8 flex items-center justify-between print:hidden">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                        <PieChart className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-foreground tracking-tight">{t('analytics_title')}</h1>
                        <p className="text-muted-foreground mt-1">{t('analytics_desc')}</p>
                    </div>
                </div>
                <div className="hidden md:flex items-center gap-2">
                    {/* Print / Export PDF */}
                    <Button
                        variant="outline"
                        className="gap-2 text-sm px-3 py-1.5 h-auto"
                        onClick={() => window.print()}
                    >
                        <Printer className="w-4 h-4" />
                        {t('export_pdf') || 'Export PDF'}
                    </Button>
                    <a
                        href="/stock"
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 transition-colors text-sm font-medium"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        {t('manage_investments')}
                    </a>
                </div>
            </header>

            {/* Print-only title */}
            <div className="hidden print:block mb-6">
                <h1 className="text-2xl font-bold">{t('analytics_title')}</h1>
                <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString()}</p>
            </div>

            {isLoading ? (
                <div className="space-y-8">
                    <StatCardSkeleton />
                    <ChartSkeleton height={300} />
                    <ChartSkeleton />
                </div>
            ) : (
                <div className="space-y-8">
                    <RiskMetricsWidget />
                    <NetWorthTrendChart />
                    <MonthlyChangeChart />
                </div>
            )}
        </div>
    );
}
