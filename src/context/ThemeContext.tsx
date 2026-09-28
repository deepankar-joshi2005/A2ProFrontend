import React, { createContext, useContext, useState } from 'react';

export type ThemeMode = 'dark' | 'light';

export interface ThemePalette {
  isDark: boolean;
  background: string;
  surface: string;
  surfaceBorder: string;
  topBarBg: string;
  topBarText: string;
  text: string;
  textMuted: string;
  textFaint: string;
  accent: string;
  accentSoft: string;
  accentDeep: string;
  gradientColors: [string, string, string];
  tabBarBg: string;
  tabBarBorder: string;
  inputBg: string;
  inputBorder: string;
  cardBg: string;
  cardBorder: string;
  statusActiveBg: string;
  statusActiveText: string;
  statusExpiredBg: string;
  statusExpiredText: string;
  sheetBg: string;
}

const DARK_PALETTE: ThemePalette = {
  isDark: true,
  background: '#000000',
  surface: 'rgba(255,255,255,0.035)',
  surfaceBorder: 'rgba(255,255,255,0.08)',
  topBarBg: '#000000',
  topBarText: '#FFFFFF',
  text: '#FFFFFF',
  textMuted: '#9A9CA6',
  textFaint: '#5E6069',
  accent: '#FF1739',
  accentSoft: '#FF3B5C',
  accentDeep: '#B4102A',
  gradientColors: ['#FF3B5C', '#FF1739', '#B4102A'],
  tabBarBg: '#0A0A0D',
  tabBarBorder: 'rgba(255,255,255,0.08)',
  inputBg: 'rgba(255,255,255,0.05)',
  inputBorder: 'rgba(255,255,255,0.1)',
  cardBg: 'rgba(255,255,255,0.035)',
  cardBorder: 'rgba(255,255,255,0.08)',
  statusActiveBg: 'rgba(46, 213, 115, 0.15)',
  statusActiveText: '#2ED573',
  statusExpiredBg: 'rgba(255, 23, 57, 0.15)',
  statusExpiredText: '#FF1739',
  sheetBg: '#0A0A0D',
};

const LIGHT_PALETTE: ThemePalette = {
  isDark: false,
  background: '#F1F5F9',
  surface: '#FFFFFF',
  surfaceBorder: '#E2E8F0',
  topBarBg: '#006666',
  topBarText: '#FFFFFF',
  text: '#0F172A',
  textMuted: '#475569',
  textFaint: '#64748B',
  accent: '#006666',
  accentSoft: '#0D9488',
  accentDeep: '#004D4D',
  gradientColors: ['#0D9488', '#006666', '#004D4D'],
  tabBarBg: '#FFFFFF',
  tabBarBorder: '#E2E8F0',
  inputBg: '#FFFFFF',
  inputBorder: '#CBD5E1',
  cardBg: '#FFFFFF',
  cardBorder: '#E2E8F0',
  statusActiveBg: '#DCFCE7',
  statusActiveText: '#15803D',
  statusExpiredBg: '#FFE4E6',
  statusExpiredText: '#BE123C',
  sheetBg: '#FFFFFF',
};

interface ThemeContextType {
  themeMode: ThemeMode;
  isDark: boolean;
  palette: ThemePalette;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'dark',
  isDark: true,
  palette: DARK_PALETTE,
  toggleTheme: () => {},
  setThemeMode: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');

  const toggleTheme = () => {
    setThemeModeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const palette = themeMode === 'dark' ? DARK_PALETTE : LIGHT_PALETTE;

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        isDark: themeMode === 'dark',
        palette,
        toggleTheme,
        setThemeMode: setThemeModeState,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
