'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomSelect } from "@/components/ui/custom-select";
import { Settings, Download, Trash2, Globe, DollarSign, Palette, Calendar, PieChart as PieChartIcon, Calculator, Key, Wallet, RefreshCw, Sun, Moon, Languages } from 'lucide-react';
import { usePrivacy } from "@/components/PrivacyProvider";
import { CategoryVisibility } from "@/components/CategoryVisibility";
import { useGlobalTheme } from "@/components/GlobalThemeProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { useTheme } from "next-themes";
import { WealthSimulatorDialog } from "@/components/WealthSimulatorDialog";
import { EmergencyFundDialog } from "@/components/EmergencyFundDialog";
import { LifeBuoy } from "lucide-react";
import { fetchSetting, updateSetting, fetchDashboardData, API_URL } from '@/lib/api';

export default function SettingsPage() {
    // Mock States for now (would be Context in real implementation)
    const [currency, setCurrency] = useState('TWD');

    const [budgetStartDay, setBudgetStartDay] = useState('1');
    const [updateInterval, setUpdateInterval] = useState('60');

    // Simulator
    const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
    const [isEmergencyOpen, setIsEmergencyOpen] = useState(false); // Emergency Fund
    const [currentNetWorth, setCurrentNetWorth] = useState(0);
    const [currentCash, setCurrentCash] = useState(0); // Emergency Fund Cash

    // Global Theme Hook (Chart Colors)
    const { themeName: chartTheme, setThemeName: setChartTheme } = useGlobalTheme();

    // System Theme Hook (Light/Dark)
    const { theme, setTheme } = useTheme();

    // Language Hook
    const { language, setLanguage, t } = useLanguage();

    useEffect(() => {
        // Fetch Settings
        const loadSettings = async () => {
            try {
                const results = await Promise.all([
                    fetchSetting('budget_start_day'),
                    fetchSetting('price_update_interval_minutes'),
                ]);

                if (results[0].value) setBudgetStartDay(String(results[0].value));
                if (results[1].value) setUpdateInterval(String(results[1].value));
            } catch (e) {
                console.error("Failed to load settings:", e);
            }
        };

        loadSettings();

        // Fetch Net Worth for Simulator
        fetchDashboardData()
            .then(data => {
                if (data && data.assets) {
                    const total = data.assets.reduce((sum: number, a: any) => sum + (a.include_in_net_worth !== false ? (a.value_twd || 0) : 0), 0);
                    setCurrentNetWorth(total);
                    const cashTotal = data.assets.filter((a: any) => a.category === 'Cash' || a.category === 'Bank').reduce((sum: number, a: any) => sum + (a.value_twd || 0), 0);
                    setCurrentCash(cashTotal);
                }
            })
            .catch(() => { });
    }, []);

    const handleSaveChartTheme = (val: string) => {
        setChartTheme(val as any);
    };

    const handleSaveUpdateInterval = async (val: string) => {
        setUpdateInterval(val);
        updateSetting('price_update_interval_minutes', val);
    };

    const handleSaveBudgetDay = async (val: string) => {
        setBudgetStartDay(val);
        updateSetting('budget_start_day', val);
    };

    const handleExport = async () => {
        try {
            const data = await fetchDashboardData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `asset_dashboard_backup_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
        } catch (e) {
            console.error("Export failed:", e);
        }
    };

    const handleReset = async () => {
        if (!confirm("Are you sure you want to delete ALL data? This action cannot be undone.")) return;
        if (!confirm("Double check: ALL assets, transactions, and goals will be lost. Confirm reset?")) return;

        try {
            const res = await fetch(`${API_URL}/system/reset`, { method: 'DELETE' });
            if (res.ok) {
                alert("System has been reset to factory defaults.");
                window.location.href = '/';
            } else {
                alert("Reset failed. Please check server logs.");
            }
        } catch (e) {
            console.error(e);
            alert("Reset failed. Server might be down.");
        }
    };

    return (
        <div className="min-h-screen bg-background p-6 md:p-10 text-foreground transition-colors duration-300">
            <header className="mb-8 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Settings className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('settings')}</h1>
                    <p className="text-muted-foreground mt-1">{t('general_settings')}</p>
                </div>
            </header>

            <div className="max-w-2xl space-y-8 pb-24">

                {/* GLOBAL SETTINGS (Language & Theme) */}
                <section className="space-y-4">
                    <h2 className="text-lg font-semibold border-b border-border pb-2">Appearance & Language</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-card p-6 rounded-3xl border border-border shadow-sm flex flex-col gap-3">
                            <div className="flex items-center gap-2 font-medium">
                                <Languages className="w-4 h-4" />
                                <span>Language</span>
                            </div>
                            <div className="flex gap-2 mt-auto">
                                <Button
                                    variant={language === 'en' ? 'default' : 'outline'}
                                    onClick={() => setLanguage('en')}
                                    className="flex-1"
                                >
                                    English
                                </Button>
                                <Button
                                    variant={language === 'zh-TW' ? 'default' : 'outline'}
                                    onClick={() => setLanguage('zh-TW')}
                                    className="flex-1"
                                >
                                    中文
                                </Button>
                            </div>
                        </div>

                        <div className="bg-card p-6 rounded-3xl border border-border shadow-sm flex flex-col gap-3">
                            <div className="flex items-center gap-2 font-medium">
                                <Palette className="w-4 h-4" />
                                <span>Theme</span>
                            </div>
                            <div className="flex gap-2 mt-auto">
                                <Button
                                    variant={theme === 'light' ? 'default' : 'outline'}
                                    onClick={() => setTheme('light')}
                                    className="flex-1"
                                >
                                    <Sun className="w-4 h-4 mr-2" /> Light
                                </Button>
                                <Button
                                    variant={theme === 'dark' ? 'default' : 'outline'}
                                    onClick={() => setTheme('dark')}
                                    className="flex-1"
                                >
                                    <Moon className="w-4 h-4 mr-2" /> Dark
                                </Button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* INTEGRATIONS */}


                {/* PREFERENCES */}
                <section className="space-y-4">
                    <h2 className="text-lg font-semibold border-b border-border pb-2">{t('preferences')}</h2>
                    <div className="bg-card p-6 rounded-3xl border border-border shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-base mb-1">{t('price_update_freq')}</h3>
                                <p className="text-sm text-muted-foreground">{t('price_update_desc')}</p>
                            </div>
                            <div className="w-[180px]">
                                <CustomSelect
                                    value={updateInterval}
                                    onChange={handleSaveUpdateInterval}
                                    options={[
                                        { value: '15', label: t('every_15_mins') || 'Every 15 mins' },
                                        { value: '30', label: t('every_30_mins') || 'Every 30 mins' },
                                        { value: '60', label: t('every_hour') },
                                        { value: '1440', label: t('daily') || 'Daily' },
                                    ]}
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* BUDGET SETTINGS */}
                <section className="space-y-4">
                    <h2 className="text-lg font-semibold border-b border-border pb-2">{t('budget_cycle')}</h2>
                    <div className="bg-card p-6 rounded-3xl border border-border shadow-sm">
                        <div>
                            <label className="text-sm font-medium mb-2 block">{t('start_day_of_month')}</label>
                            <div className="flex gap-4 items-center">
                                <Input
                                    type="number"
                                    min="1"
                                    max="31"
                                    className="w-32 bg-muted border border-border"
                                    value={budgetStartDay}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        if (val >= 1 && val <= 31) handleSaveBudgetDay(e.target.value);
                                        else if (e.target.value === '') setBudgetStartDay('');
                                    }}
                                    onBlur={(e) => {
                                        if (!e.target.value || parseInt(e.target.value) < 1) handleSaveBudgetDay('1');
                                        if (parseInt(e.target.value) > 31) handleSaveBudgetDay('31');
                                    }}
                                />
                                <p className="text-sm text-muted-foreground">
                                    {t('budget_reset_desc').replace('{day}', String(budgetStartDay))}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CATEGORY VISIBILITY */}
                <section className="space-y-4">
                    <h2 className="text-lg font-semibold border-b border-border pb-2">{t('category_visibility')}</h2>
                    <div className="bg-card p-6 rounded-3xl border border-border shadow-sm">
                        <CategoryVisibility />
                    </div>
                </section>

                {/* TOOLS */}
                <section className="space-y-4">
                    <h2 className="text-lg font-semibold border-b border-border pb-2">{t('tools')}</h2>
                    <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
                        {/* Wealth Simulator */}
                        <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors p-6 group border-b border-border" onClick={() => setIsSimulatorOpen(true)}>
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-2xl group-hover:scale-110 transition-transform">
                                    <Calculator className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{t('wealth_simulator')}</h3>
                                    <p className="text-sm text-muted-foreground">{t('wealth_simulator_desc')}</p>
                                </div>
                            </div>
                        </div>

                        {/* Emergency Fund Card */}
                        <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors p-6 group" onClick={() => setIsEmergencyOpen(true)}>
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 rounded-2xl group-hover:scale-110 transition-transform">
                                    <LifeBuoy className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{t('emergency_fund_check')}</h3>
                                    <p className="text-sm text-muted-foreground">{t('emergency_fund_subtitle')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* DATA MANAGEMENT */}
                <section className="space-y-4">
                    <h2 className="text-lg font-semibold border-b border-border pb-2">{t('data_management')}</h2>
                    <div className="bg-muted/30 p-4 rounded-xl space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium">{t('backup_data')}</h3>
                            </div>
                            <Button variant="outline" onClick={handleExport}>
                                <Download className="w-4 h-4 mr-2" /> {t('backup_json')}
                            </Button>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-border/50">
                            <div>
                                <h3 className="font-medium text-red-500">{t('reset_system')}</h3>
                            </div>
                            <Button variant="destructive" onClick={handleReset}>
                                <Trash2 className="w-4 h-4 mr-2" /> {t('reset_button')}
                            </Button>
                        </div>
                    </div>
                </section>

                <div className="text-center text-xs text-muted-foreground pt-8">
                    <p>{t('version')}</p>
                </div>
            </div>

            <WealthSimulatorDialog
                isOpen={isSimulatorOpen}
                onClose={() => setIsSimulatorOpen(false)}
                currentNetWorth={currentNetWorth}
            />

            <EmergencyFundDialog
                isOpen={isEmergencyOpen}
                onClose={() => setIsEmergencyOpen(false)}
                currentCash={currentCash}
            />
        </div>

    );
}
