'use client';

import { useState } from 'react';
import { PrivacyProvider } from "@/components/PrivacyProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { GlobalThemeProvider } from "@/components/GlobalThemeProvider";
import { AppSidebar } from "./AppSidebar";
import { cn } from "@/lib/utils";

import { LanguageProvider } from "@/components/LanguageProvider";

export function ClientLayout({ children }: { children: React.ReactNode }) {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            <GlobalThemeProvider>
                <LanguageProvider>
                    <PrivacyProvider>
                        <div className="flex min-h-screen bg-background text-foreground">
                            <AppSidebar
                                isCollapsed={isSidebarCollapsed}
                                toggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                            />
                            <main className={cn(
                                "flex-1 transition-all duration-300",
                                isSidebarCollapsed ? "ml-[60px]" : "ml-0 md:ml-64"
                            )}>
                                {children}
                            </main>
                        </div>
                    </PrivacyProvider>
                </LanguageProvider>
            </GlobalThemeProvider>
        </ThemeProvider>
    );
}
