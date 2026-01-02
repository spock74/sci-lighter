
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Locale, translations } from './translations';

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: keyof typeof translations.en) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocale] = useState<Locale>(() => {
    try {
      const saved = localStorage.getItem('webmark_locale');
      return (saved as Locale) || 'en';
    } catch (error) {
      console.warn('Could not access localStorage for locale. Defaulting to "en".');
      return 'en';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('webmark_locale', locale);
    } catch (error) {
      console.warn('Could not access localStorage to save locale.');
    }
  }, [locale]);

  const t = React.useCallback((key: keyof typeof translations.en): string => {
    return translations[locale][key] || translations.en[key] || key;
  }, [locale]);

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};
