'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type ThemeName = 'Classic' | 'Morandi' | 'Vibrant';

interface GlobalThemeContextType {
    themeName: ThemeName;
    setThemeName: (theme: ThemeName) => void;
}

const GlobalThemeContext = createContext<GlobalThemeContextType>({
    themeName: 'Morandi',
    setThemeName: () => { },
});

export const useGlobalTheme = () => useContext(GlobalThemeContext);

export function GlobalThemeProvider({ children }: { children: React.ReactNode }) {
    const [themeName, setThemeName] = useState<ThemeName>('Morandi');

    useEffect(() => {
        // Enforce Morandi theme
        applyTheme('Morandi');
    }, []);

    const applyTheme = (theme: ThemeName) => {
        setThemeName(theme);
        // Apply to document body for global CSS variables
        document.body.setAttribute('data-chart-theme', theme);
    };

    const updateTheme = async (newTheme: ThemeName) => {
        applyTheme(newTheme);
        // Persist to backend
        try {
            await fetch('http://localhost:8000/api/settings/chart_theme', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'chart_theme', value: newTheme })
            });
        } catch (e) {
            console.error("Failed to save theme setting", e);
        }
    };

    return (
        <GlobalThemeContext.Provider value={{ themeName, setThemeName: updateTheme }}>
            {children}
        </GlobalThemeContext.Provider>
    );
}
