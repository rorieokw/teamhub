import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

type Theme = 'dark' | 'light';
type FontSize = 'small' | 'medium' | 'large';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  reduceMotion: boolean;
  setReduceMotion: (reduce: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('teamhub-theme') as Theme;
    if (saved === 'light' || saved === 'dark') return saved;
    if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark';
  });

  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    const saved = localStorage.getItem('teamhub-font-size') as FontSize;
    if (saved === 'small' || saved === 'medium' || saved === 'large') return saved;
    return 'medium';
  });

  const [reduceMotion, setReduceMotionState] = useState<boolean>(() => {
    const saved = localStorage.getItem('teamhub-reduce-motion');
    if (saved === 'true') return true;
    if (saved === 'false') return false;
    // Check system preference
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('teamhub-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-font-size', fontSize);
    localStorage.setItem('teamhub-font-size', fontSize);
  }, [fontSize]);

  useEffect(() => {
    document.documentElement.setAttribute('data-reduce-motion', reduceMotion ? 'true' : 'false');
    localStorage.setItem('teamhub-reduce-motion', reduceMotion ? 'true' : 'false');
  }, [reduceMotion]);

  function toggleTheme() {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }

  function setTheme(newTheme: Theme) {
    setThemeState(newTheme);
  }

  function setFontSize(size: FontSize) {
    setFontSizeState(size);
  }

  function setReduceMotion(reduce: boolean) {
    setReduceMotionState(reduce);
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, fontSize, setFontSize, reduceMotion, setReduceMotion }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
