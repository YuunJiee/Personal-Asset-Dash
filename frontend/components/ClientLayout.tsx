'use client';

import { useState } from 'react';
import { SWRConfig } from 'swr';
import { PrivacyProvider } from "@/components/PrivacyProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { GlobalThemeProvider } from "@/components/GlobalThemeProvider";
import { AppSidebar } from "./AppSidebar";
import { BottomNav } from "./BottomNav";
import { cn } from "@/lib/utils";
import { LanguageProvider } from "@/components/LanguageProvider";
import { useRealtimeUpdates } from "@/lib/hooks";
import { ToastProvider } from "@/components/ui/toast";

/** Thin wrapper so useRealtimeUpdates() is called *inside* <SWRConfig>. */
function RealtimeSync() {
    useRealtimeUpdates();
    return null;
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    return (
        <SWRConfig value={{
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            dedupingInterval: 10_000,
            errorRetryCount: 2,
        }}>
            <RealtimeSync />
            <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
            >
                <GlobalThemeProvider>
                    <LanguageProvider>
                        <PrivacyProvider>
                            <ToastProvider>
                            <div className="flex min-h-screen bg-background text-foreground">
                                <AppSidebar
                                    isCollapsed={isSidebarCollapsed}
                                    toggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                                />
                                <main className={cn(
                                    // flex-1 + min-w-0: prevents the flex child from having a 0 or negative
                                    // computed width, which would cause Recharts ResponsiveContainer to
                                    // measure width=-1 and log warnings.
                                    "flex-1 min-w-0 transition-all duration-300",
                                    // pt-14: offset for the mobile hamburger button at top-left
                                    // pb-16: offset for the mobile bottom navigation bar
                                    "pt-14 md:pt-0 pb-16 md:pb-0",
                                    isSidebarCollapsed ? "ml-[60px]" : "ml-0 md:ml-[280px]"
                                )}>
                                    {children}
                                </main>
                                <BottomNav />
                            </div>
                            </ToastProvider>
                        </PrivacyProvider>
                    </LanguageProvider>
                </GlobalThemeProvider>
            </ThemeProvider>
        </SWRConfig>
    );
}
