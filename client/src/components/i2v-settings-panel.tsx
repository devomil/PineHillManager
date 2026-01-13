import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings2, ImageIcon, Move } from "lucide-react";

export interface I2VSettings {
  imageControlStrength: number; // 0-100 (will be converted to 0-1 for API)
  animationStyle: 'product-hero' | 'product-static' | 'subtle-motion' | 'dynamic';
  motionStrength: number; // 0-100 (will be converted to 0-1 for API)
}

export const defaultI2VSettings: I2VSettings = {
  imageControlStrength: 100, // Max fidelity by default
  animationStyle: 'product-hero',
  motionStrength: 30, // Subtle motion by default
};

const ANIMATION_STYLES = [
  { value: 'product-hero', label: 'Product Hero', description: 'Product is hero, subtle environment animation' },
  { value: 'product-static', label: 'Product Static', description: 'Product stays still, background moves' },
  { value: 'subtle-motion', label: 'Subtle Motion', description: 'Gentle overall movement' },
  { value: 'dynamic', label: 'Dynamic', description: 'More dramatic animation' },
] as const;

interface I2VSettingsPanelProps {
  settings: I2VSettings;
  onChange: (settings: I2VSettings) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function I2VSettingsPanel({ settings, onChange, disabled, compact }: I2VSettingsPanelProps) {
  const handleImageControlChange = (value: number[]) => {
    onChange({ ...settings, imageControlStrength: value[0] });
  };

  const handleMotionStrengthChange = (value: number[]) => {
    onChange({ ...settings, motionStrength: value[0] });
  };

  const handleAnimationStyleChange = (value: string) => {
    onChange({ ...settings, animationStyle: value as I2VSettings['animationStyle'] });
  };

  if (compact) {
    return (
      <div className="space-y-3 p-3 bg-muted/50 rounded-lg border">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Settings2 className="h-4 w-4" />
          I2V Settings
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs flex items-center gap-1">
              <ImageIcon className="h-3 w-3" />
              Image Fidelity
            </Label>
            <span className="text-xs text-muted-foreground">{settings.imageControlStrength}%</span>
          </div>
          <Slider
            value={[settings.imageControlStrength]}
            onValueChange={handleImageControlChange}
            max={100}
            min={0}
            step={5}
            disabled={disabled}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Animation Style</Label>
          <Select value={settings.animationStyle} onValueChange={handleAnimationStyleChange} disabled={disabled}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ANIMATION_STYLES.map(style => (
                <SelectItem key={style.value} value={style.value} className="text-xs">
                  {style.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs flex items-center gap-1">
              <Move className="h-3 w-3" />
              Motion Amount
            </Label>
            <span className="text-xs text-muted-foreground">{settings.motionStrength}%</span>
          </div>
          <Slider
            value={[settings.motionStrength]}
            onValueChange={handleMotionStrengthChange}
            max={100}
            min={0}
            step={5}
            disabled={disabled}
            className="w-full"
          />
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Settings2 className="h-4 w-4" />
          Image-to-Video Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Image Fidelity
            </Label>
            <span className="text-sm font-medium">{settings.imageControlStrength}%</span>
          </div>
          <Slider
            value={[settings.imageControlStrength]}
            onValueChange={handleImageControlChange}
            max={100}
            min={0}
            step={5}
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">
            Higher = closer to original image. Lower = more AI creativity.
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Animation Style</Label>
          <Select value={settings.animationStyle} onValueChange={handleAnimationStyleChange} disabled={disabled}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ANIMATION_STYLES.map(style => (
                <SelectItem key={style.value} value={style.value}>
                  <div className="flex flex-col">
                    <span>{style.label}</span>
                    <span className="text-xs text-muted-foreground">{style.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm flex items-center gap-2">
              <Move className="h-4 w-4" />
              Motion Amount
            </Label>
            <span className="text-sm font-medium">{settings.motionStrength}%</span>
          </div>
          <Slider
            value={[settings.motionStrength]}
            onValueChange={handleMotionStrengthChange}
            max={100}
            min={0}
            step={5}
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">
            Lower = subtle animation. Higher = more dramatic movement.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
