import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Palette } from 'lucide-react';
import { useTheme, SEASONAL_THEMES, type SeasonalTheme } from '@/contexts/ThemeContext';

export function SeasonalThemeSwitcher() {
  const { currentTheme, setTheme, themeConfig } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Palette className="h-4 w-4" />
          {themeConfig.emoji} {themeConfig.name}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-center">
          🌱 Farm Seasonal Themes
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {Object.entries(SEASONAL_THEMES).map(([key, theme]) => {
          const isActive = key === currentTheme;
          
          return (
            <DropdownMenuItem
              key={key}
              onClick={() => setTheme(key as SeasonalTheme)}
              className="cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{theme.emoji}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{theme.name}</span>
                      {isActive && (
                        <Badge variant="secondary" className="text-xs">
                          Active
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {theme.description}
                    </div>
                  </div>
                </div>
                
                {/* Color preview */}
                <div className="flex gap-1">
                  <div 
                    className="w-3 h-3 rounded-full border"
                    style={{ backgroundColor: `hsl(${theme.colors.primary})` }}
                  />
                  <div 
                    className="w-3 h-3 rounded-full border"
                    style={{ backgroundColor: `hsl(${theme.colors.accent})` }}
                  />
                </div>
              </div>
            </DropdownMenuItem>
          );
        })}
        
        <DropdownMenuSeparator />
        <div className="px-2 py-1 text-xs text-muted-foreground text-center">
          Theme preference is saved automatically
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}