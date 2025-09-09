import React, { createContext, useContext, useState, useEffect } from 'react';

export type SeasonalTheme = 'spring' | 'summer' | 'fall' | 'winter';

export interface ThemeColors {
  // Primary colors
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  
  // Background colors
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  
  // UI colors
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  border: string;
  input: string;
  ring: string;
  
  // Status colors
  destructive: string;
  destructiveForeground: string;
  success: string;
  warning: string;
}

export interface SeasonalThemeConfig {
  name: string;
  description: string;
  emoji: string;
  colors: ThemeColors;
}

// Farm-themed seasonal color palettes
export const SEASONAL_THEMES: Record<SeasonalTheme, SeasonalThemeConfig> = {
  spring: {
    name: 'Spring Bloom',
    description: 'Fresh greens and blooming flowers',
    emoji: '🌸',
    colors: {
      primary: '142 76% 36%', // Fresh green
      primaryForeground: '0 0% 98%',
      secondary: '120 60% 95%', // Light green
      secondaryForeground: '142 76% 36%',
      
      background: '120 20% 98%', // Very light green-white
      foreground: '142 84% 17%', // Dark green
      card: '0 0% 100%',
      cardForeground: '142 84% 17%',
      
      muted: '120 30% 92%', // Soft green-gray
      mutedForeground: '142 30% 45%',
      accent: '320 65% 85%', // Light pink (cherry blossom)
      accentForeground: '320 65% 25%',
      border: '120 30% 85%',
      input: '120 30% 92%',
      ring: '142 76% 36%',
      
      destructive: '0 84% 60%',
      destructiveForeground: '0 0% 98%',
      success: '142 76% 36%',
      warning: '48 96% 53%'
    }
  },
  summer: {
    name: 'Summer Harvest',
    description: 'Warm yellows and vibrant greens',
    emoji: '☀️',
    colors: {
      primary: '45 93% 47%', // Golden yellow
      primaryForeground: '45 30% 10%',
      secondary: '45 100% 95%', // Light yellow
      secondaryForeground: '45 93% 27%',
      
      background: '45 40% 98%', // Warm white
      foreground: '45 30% 10%', // Dark brown
      card: '0 0% 100%',
      cardForeground: '45 30% 10%',
      
      muted: '45 20% 90%', // Warm gray
      mutedForeground: '45 20% 40%',
      accent: '120 50% 70%', // Bright green
      accentForeground: '120 50% 20%',
      border: '45 20% 82%',
      input: '45 20% 90%',
      ring: '45 93% 47%',
      
      destructive: '0 84% 60%',
      destructiveForeground: '0 0% 98%',
      success: '120 50% 50%',
      warning: '30 100% 50%'
    }
  },
  fall: {
    name: 'Autumn Harvest',
    description: 'Rich oranges and warm browns',
    emoji: '🍂',
    colors: {
      primary: '25 75% 47%', // Pumpkin orange
      primaryForeground: '0 0% 98%',
      secondary: '25 100% 95%', // Light orange
      secondaryForeground: '25 75% 27%',
      
      background: '30 20% 96%', // Warm cream
      foreground: '25 30% 15%', // Dark brown
      card: '0 0% 100%',
      cardForeground: '25 30% 15%',
      
      muted: '30 15% 88%', // Warm beige
      mutedForeground: '30 15% 35%',
      accent: '10 80% 65%', // Red-orange
      accentForeground: '10 80% 15%',
      border: '30 15% 80%',
      input: '30 15% 88%',
      ring: '25 75% 47%',
      
      destructive: '0 84% 60%',
      destructiveForeground: '0 0% 98%',
      success: '120 40% 40%',
      warning: '45 100% 50%'
    }
  },
  winter: {
    name: 'Winter Rest',
    description: 'Cool blues and crisp whites',
    emoji: '❄️',
    colors: {
      primary: '210 100% 45%', // Deep blue
      primaryForeground: '0 0% 98%',
      secondary: '210 100% 95%', // Light blue
      secondaryForeground: '210 100% 25%',
      
      background: '210 20% 98%', // Cool white
      foreground: '210 30% 8%', // Dark blue-gray
      card: '0 0% 100%',
      cardForeground: '210 30% 8%',
      
      muted: '210 15% 92%', // Cool gray
      mutedForeground: '210 15% 35%',
      accent: '200 80% 75%', // Ice blue
      accentForeground: '200 80% 15%',
      border: '210 15% 85%',
      input: '210 15% 92%',
      ring: '210 100% 45%',
      
      destructive: '0 84% 60%',
      destructiveForeground: '0 0% 98%',
      success: '160 60% 45%',
      warning: '45 100% 50%'
    }
  }
};

interface ThemeContextType {
  currentTheme: SeasonalTheme;
  setTheme: (theme: SeasonalTheme) => void;
  themeConfig: SeasonalThemeConfig;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<SeasonalTheme>(() => {
    // Get saved theme from localStorage or default to spring
    const saved = localStorage.getItem('pine-hill-theme');
    return (saved as SeasonalTheme) || 'spring';
  });

  const setTheme = (theme: SeasonalTheme) => {
    setCurrentTheme(theme);
    localStorage.setItem('pine-hill-theme', theme);
  };

  const themeConfig = SEASONAL_THEMES[currentTheme];

  // Apply CSS variables when theme changes
  useEffect(() => {
    const root = document.documentElement;
    const colors = themeConfig.colors;

    // Apply all color variables
    Object.entries(colors).forEach(([key, value]) => {
      const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      root.style.setProperty(cssVar, value);
    });
  }, [themeConfig]);

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme, themeConfig }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}