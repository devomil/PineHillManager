import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Video, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type CameraMovement = 
  | 'auto'
  | 'static'
  | 'push_in'
  | 'pull_out'
  | 'pan_left'
  | 'pan_right'
  | 'tilt_up'
  | 'tilt_down'
  | 'orbit_left'
  | 'orbit_right'
  | 'tracking'
  | 'crane_up'
  | 'crane_down'
  | 'dolly_in'
  | 'dolly_out'
  | 'handheld'
  | 'steadicam';

export interface MotionControlSettings {
  cameraMovement: CameraMovement;
  intensity: number;
}

export const defaultMotionSettings: MotionControlSettings = {
  cameraMovement: 'auto',
  intensity: 50,
};

const CAMERA_MOVEMENTS = [
  { value: 'auto', label: 'Auto (Smart)', description: 'Automatically chosen based on scene type' },
  { value: 'static', label: 'Static', description: 'Locked camera, no movement' },
  { value: 'push_in', label: 'Push In', description: 'Slowly move toward subject' },
  { value: 'pull_out', label: 'Pull Out', description: 'Gradually reveal wider scene' },
  { value: 'pan_left', label: 'Pan Left', description: 'Smooth horizontal pan left' },
  { value: 'pan_right', label: 'Pan Right', description: 'Smooth horizontal pan right' },
  { value: 'tilt_up', label: 'Tilt Up', description: 'Camera tilts upward' },
  { value: 'tilt_down', label: 'Tilt Down', description: 'Camera tilts downward' },
  { value: 'orbit_left', label: 'Orbit Left', description: 'Circle around subject left' },
  { value: 'orbit_right', label: 'Orbit Right', description: 'Circle around subject right' },
  { value: 'tracking', label: 'Tracking', description: 'Follow moving subject' },
  { value: 'crane_up', label: 'Crane Up', description: 'Rising aerial shot' },
  { value: 'crane_down', label: 'Crane Down', description: 'Descending reveal' },
  { value: 'dolly_in', label: 'Dolly In', description: 'Move physically closer' },
  { value: 'dolly_out', label: 'Dolly Out', description: 'Move physically away' },
  { value: 'handheld', label: 'Handheld', description: 'Natural handheld shake' },
  { value: 'steadicam', label: 'Steadicam', description: 'Smooth gliding motion' },
] as const;

interface MotionControlSelectorProps {
  settings: MotionControlSettings;
  onChange: (settings: MotionControlSettings) => void;
  sceneType?: string;
  disabled?: boolean;
  compact?: boolean;
}

export function MotionControlSelector({ 
  settings, 
  onChange, 
  sceneType,
  disabled, 
  compact 
}: MotionControlSelectorProps) {
  
  const handleCameraMovementChange = (value: string) => {
    onChange({ ...settings, cameraMovement: value as CameraMovement });
  };

  const handleIntensityChange = (value: number[]) => {
    onChange({ ...settings, intensity: value[0] });
  };

  const selectedMovement = CAMERA_MOVEMENTS.find(m => m.value === settings.cameraMovement);

  if (compact) {
    return (
      <div className="space-y-3 p-3 bg-muted/50 rounded-lg border">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Video className="h-4 w-4" />
          Camera Motion
          {sceneType && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Scene type: {sceneType}</p>
                  <p className="text-xs text-muted-foreground">Auto mode uses intelligent defaults</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        
        <div className="space-y-2">
          <Label className="text-xs">Camera Movement</Label>
          <Select value={settings.cameraMovement} onValueChange={handleCameraMovementChange} disabled={disabled}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CAMERA_MOVEMENTS.map(movement => (
                <SelectItem key={movement.value} value={movement.value}>
                  <div className="flex flex-col">
                    <span>{movement.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedMovement && settings.cameraMovement !== 'auto' && (
            <p className="text-xs text-muted-foreground">{selectedMovement.description}</p>
          )}
        </div>

        {settings.cameraMovement !== 'static' && settings.cameraMovement !== 'auto' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Intensity</Label>
              <span className="text-xs text-muted-foreground">{settings.intensity}%</span>
            </div>
            <Slider
              value={[settings.intensity]}
              onValueChange={handleIntensityChange}
              max={100}
              min={10}
              step={10}
              disabled={disabled}
              className="w-full"
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Video className="h-5 w-5" />
        <h4 className="font-medium">Camera Motion Control</h4>
        {sceneType && (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
            {sceneType}
          </span>
        )}
      </div>
      
      <div className="space-y-3">
        <div className="space-y-2">
          <Label>Camera Movement</Label>
          <Select value={settings.cameraMovement} onValueChange={handleCameraMovementChange} disabled={disabled}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CAMERA_MOVEMENTS.map(movement => (
                <SelectItem key={movement.value} value={movement.value}>
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{movement.label}</span>
                    <span className="text-xs text-muted-foreground">{movement.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {settings.cameraMovement !== 'static' && settings.cameraMovement !== 'auto' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Movement Intensity</Label>
              <span className="text-sm text-muted-foreground font-medium">{settings.intensity}%</span>
            </div>
            <Slider
              value={[settings.intensity]}
              onValueChange={handleIntensityChange}
              max={100}
              min={10}
              step={10}
              disabled={disabled}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Subtle</span>
              <span>Moderate</span>
              <span>Dramatic</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
