import React, { createContext, useContext, useState, useEffect } from 'react';

export type SeasonalTheme = 'spring' | 'summer' | 'fall' | 'winter' | 'corporate' | 'clean' | 'light' | 'dark';

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
  popover: string;
  popoverForeground: string;
  
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
      
      background: '140 30% 96%', // Soft green-tinted background
      foreground: '142 84% 17%', // Dark green
      card: '140 40% 98%', // Very light green cards
      cardForeground: '142 84% 17%',
      popover: '140 40% 98%',
      popoverForeground: '142 84% 17%',
      
      muted: '140 25% 88%', // Soft green-gray
      mutedForeground: '142 30% 45%',
      accent: '320 65% 85%', // Light pink (cherry blossom)
      accentForeground: '320 65% 25%',
      border: '140 25% 80%',
      input: '140 30% 92%',
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
      
      background: '50 35% 94%', // Warm cream background
      foreground: '45 30% 10%', // Dark brown
      card: '50 45% 97%', // Warm cream cards
      cardForeground: '45 30% 10%',
      popover: '50 45% 97%',
      popoverForeground: '45 30% 10%',
      
      muted: '50 25% 85%', // Warm beige
      mutedForeground: '45 20% 40%',
      accent: '120 50% 70%', // Bright green
      accentForeground: '120 50% 20%',
      border: '50 25% 78%',
      input: '50 25% 88%',
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
      secondary: '30 45% 90%', // Light orange-cream
      secondaryForeground: '25 75% 27%',
      
      background: '35 25% 92%', // Warm autumn background
      foreground: '25 30% 15%', // Dark brown
      card: '35 35% 95%', // Warm autumn cards
      cardForeground: '25 30% 15%',
      popover: '35 35% 95%',
      popoverForeground: '25 30% 15%',
      
      muted: '35 20% 82%', // Warm autumn beige
      mutedForeground: '30 15% 35%',
      accent: '10 80% 65%', // Red-orange
      accentForeground: '10 80% 15%',
      border: '35 20% 75%',
      input: '35 20% 85%',
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
      secondary: '210 60% 92%', // Light blue
      secondaryForeground: '210 100% 25%',
      
      background: '220 15% 94%', // Cool winter background
      foreground: '210 30% 8%', // Dark blue-gray
      card: '220 25% 97%', // Cool winter cards
      cardForeground: '210 30% 8%',
      popover: '220 25% 97%',
      popoverForeground: '210 30% 8%',
      
      muted: '220 15% 86%', // Cool winter gray
      mutedForeground: '210 15% 35%',
      accent: '200 80% 75%', // Ice blue
      accentForeground: '200 80% 15%',
      border: '220 15% 80%',
      input: '220 15% 88%',
      ring: '210 100% 45%',
      
      destructive: '0 84% 60%',
      destructiveForeground: '0 0% 98%',
      success: '160 60% 45%',
      warning: '45 100% 50%'
    }
  },
  corporate: {
    name: 'Pine Hill Corporate',
    description: 'Professional brand colors',
    emoji: '🏢',
    colors: {
      primary: '206 26% 48%', // Steel blue #5b7c99
      primaryForeground: '0 0% 100%',
      secondary: '227 23% 90%', // Light slate variation
      secondaryForeground: '234 12% 25%',
      
      background: '0 0% 98%', // Clean white background
      foreground: '234 12% 20%', // Slate blue-gray dark
      card: '0 0% 100%', // White cards
      cardForeground: '234 12% 20%',
      popover: '0 0% 100%',
      popoverForeground: '234 12% 20%',
      
      muted: '227 23% 94%', // Very light slate
      mutedForeground: '234 12% 43%', // Slate blue-gray #5e637a
      accent: '132 14% 44%', // Sage green #607e66
      accentForeground: '0 0% 100%',
      border: '227 23% 88%',
      input: '227 23% 92%',
      ring: '206 26% 48%',
      
      destructive: '0 84% 60%',
      destructiveForeground: '0 0% 98%',
      success: '82 39% 41%', // Olive green #6f8f3f
      warning: '45 100% 50%'
    }
  },
  clean: {
    name: 'Simple & Clean',
    description: 'Minimalist neutral design',
    emoji: '✨',
    colors: {
      primary: '0 0% 20%', // Almost black
      primaryForeground: '0 0% 100%',
      secondary: '0 0% 96%', // Light gray
      secondaryForeground: '0 0% 20%',
      
      background: '0 0% 99%', // Off-white background
      foreground: '0 0% 10%', // Very dark gray
      card: '0 0% 100%', // Pure white cards
      cardForeground: '0 0% 10%',
      popover: '0 0% 100%',
      popoverForeground: '0 0% 10%',
      
      muted: '0 0% 94%', // Light gray
      mutedForeground: '0 0% 45%', // Medium gray
      accent: '0 0% 90%', // Subtle gray accent
      accentForeground: '0 0% 10%',
      border: '0 0% 90%',
      input: '0 0% 95%',
      ring: '0 0% 20%',
      
      destructive: '0 84% 60%',
      destructiveForeground: '0 0% 98%',
      success: '142 76% 36%',
      warning: '45 100% 50%'
    }
  },
  light: {
    name: 'Bright & Airy',
    description: 'Maximum brightness and clarity',
    emoji: '☀️',
    colors: {
      primary: '210 100% 50%', // Bright blue
      primaryForeground: '0 0% 100%',
      secondary: '210 100% 96%', // Very light blue
      secondaryForeground: '210 100% 30%',
      
      background: '0 0% 100%', // Pure white
      foreground: '0 0% 5%', // Almost black
      card: '0 0% 100%', // Pure white cards
      cardForeground: '0 0% 5%',
      popover: '0 0% 100%',
      popoverForeground: '0 0% 5%',
      
      muted: '210 40% 96%', // Very light blue-tinted
      mutedForeground: '210 10% 40%',
      accent: '200 100% 94%', // Light cyan
      accentForeground: '200 100% 25%',
      border: '210 20% 92%',
      input: '210 20% 96%',
      ring: '210 100% 50%',
      
      destructive: '0 84% 60%',
      destructiveForeground: '0 0% 98%',
      success: '142 76% 36%',
      warning: '45 100% 50%'
    }
  },
  dark: {
    name: 'Dark Mode',
    description: 'Easy on the eyes at night',
    emoji: '🌙',
    colors: {
      primary: '210 100% 60%', // Bright blue for dark bg
      primaryForeground: '0 0% 10%',
      secondary: '215 20% 25%', // Dark blue-gray
      secondaryForeground: '0 0% 90%',
      
      background: '220 15% 8%', // Very dark blue-gray
      foreground: '0 0% 95%', // Almost white
      card: '220 15% 12%', // Dark cards
      cardForeground: '0 0% 95%',
      popover: '220 15% 12%',
      popoverForeground: '0 0% 95%',
      
      muted: '215 20% 20%', // Dark muted
      mutedForeground: '0 0% 65%', // Light gray
      accent: '210 100% 40%', // Deep blue accent
      accentForeground: '0 0% 98%',
      border: '215 20% 25%',
      input: '215 20% 18%',
      ring: '210 100% 60%',
      
      destructive: '0 84% 60%',
      destructiveForeground: '0 0% 98%',
      success: '142 76% 45%',
      warning: '45 100% 55%'
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