'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, Language, TranslationKey } from '../i18n/dictionaries';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguageState] = useState<Language>('zh-TW');

    useEffect(() => {
        // Load from localStorage on mount
        const saved = localStorage.getItem('app_language') as string;
        if (saved && (saved === 'en' || saved === 'zh-TW')) {
            setLanguageState(saved as Language);
        }
    }, []);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('app_language', lang);
    };

    const t = (key: string | TranslationKey, params?: Record<string, string | number>): string => {
        // 1. Get dictionary for current language, fallback to English
        const dict = translations[language] || translations['en'];

        // 2. Fetch value
        let value = (dict as any)[key];

        // 3. Fallback to English if missing in current language
        if (!value && language !== 'en') {
            value = (translations['en'] as any)[key];
        }

        // 4. Return key if absolutely not found
        if (!value) return key as string;

        // 5. Variable substitution (Robust: handles {var})
        if (params) {
            Object.keys(params).forEach(paramKey => {
                const placeholder = `{${paramKey}}`;
                // Use replaceAll if env supports ES2021, otherwise regex with global flag
                // Safe regex replacement escaping potentially needed, but simplified here for keys
                value = value.replace(new RegExp(placeholder, 'g'), String(params[paramKey]));
            });
        }

        return value;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
