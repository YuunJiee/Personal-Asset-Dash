'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { updateSetting } from '@/lib/api';

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
            await updateSetting('chart_theme', newTheme);
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
