import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Layers, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkflowOverrideToggleProps {
  sceneId: string;
  useBrandAssets: boolean;
  onToggle: (sceneId: string, useBrandAssets: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function WorkflowOverrideToggle({
  sceneId,
  useBrandAssets,
  onToggle,
  disabled = false,
  className,
}: WorkflowOverrideToggleProps) {
  return (
    <div className={cn("flex items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border", className)}>
      <div className="flex items-center gap-2">
        {useBrandAssets ? (
          <Layers className="h-4 w-4 text-amber-600" />
        ) : (
          <Sparkles className="h-4 w-4 text-purple-600" />
        )}
        <div>
          <Label className="text-sm font-medium cursor-pointer">
            {useBrandAssets ? "Brand Asset Mode" : "AI Generation Mode"}
          </Label>
          <p className="text-xs text-muted-foreground">
            {useBrandAssets 
              ? "Uses product photos via I2V animation" 
              : "Pure AI video generation (T2V)"}
          </p>
        </div>
      </div>
      
      <Switch
        checked={useBrandAssets}
        onCheckedChange={(checked) => onToggle(sceneId, checked)}
        disabled={disabled}
        aria-label={useBrandAssets ? "Switch to AI mode" : "Switch to brand mode"}
      />
    </div>
  );
}

export function WorkflowOverrideCompact({
  sceneId,
  useBrandAssets,
  onToggle,
  disabled = false,
}: WorkflowOverrideToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <Switch
        id={`workflow-${sceneId}`}
        checked={useBrandAssets}
        onCheckedChange={(checked) => onToggle(sceneId, checked)}
        disabled={disabled}
        className="scale-75"
      />
      <Label 
        htmlFor={`workflow-${sceneId}`}
        className="text-xs text-muted-foreground cursor-pointer"
      >
        {useBrandAssets ? "Brand" : "AI"}
      </Label>
    </div>
  );
}
