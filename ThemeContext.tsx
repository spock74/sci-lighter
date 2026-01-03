
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark';

interface ThemeTokens {
  primary: string;
  background: string;
  surface: string;
  text: string;
}

interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  tokens: ThemeTokens;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('scilighter_theme');
      if (saved) return saved as ThemeMode;
    } catch (error) {
      console.warn('Could not access localStorage for theme. Defaulting to system preference.');
    }
    if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('scilighter_theme', theme);
    } catch (error) {
      console.warn('Could not access localStorage to save theme.');
    }
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  // Tokens for Canvas and JS-based calculations
  const tokens: ThemeTokens = {
    primary: theme === 'light' ? '#6366f1' : '#818cf8',
    background: theme === 'light' ? '#f9fafb' : '#111827',
    surface: theme === 'light' ? '#ffffff' : '#1f2937',
    text: theme === 'light' ? '#1f2937' : '#f3f4f6',
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, tokens }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
