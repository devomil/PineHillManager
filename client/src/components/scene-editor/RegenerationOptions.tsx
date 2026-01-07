import { useState } from 'react';
import { RefreshCw, Image, Wand2, FileQuestion, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { RegenerateOptions, PromptComplexityAnalysis } from '@shared/video-types';

interface RegenerationOptionsProps {
  sceneId: string;
  currentMediaUrl?: string;
  qualityIssues?: string[];
  suggestedImprovement?: string;
  complexity?: PromptComplexityAnalysis;
  onRegenerate: (options: RegenerateOptions) => Promise<void>;
}

export const RegenerationOptions = ({
  sceneId,
  currentMediaUrl,
  qualityIssues = [],
  suggestedImprovement,
  complexity,
  onRegenerate,
}: RegenerationOptionsProps) => {
  const [isRegenerating, setIsRegenerating] = useState(false);
  
  const hasQualityIssues = qualityIssues.length > 0;
  const isComplexPrompt = complexity?.category === 'complex' || complexity?.category === 'impossible';
  
  const handleRegenerate = async (options: RegenerateOptions) => {
    setIsRegenerating(true);
    try {
      await onRegenerate(options);
    } finally {
      setIsRegenerating(false);
    }
  };
  
  return (
    <div className="space-y-3" data-testid="container-regeneration-options">
      {isComplexPrompt && complexity?.warning && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-amber-800 text-sm">
            {complexity.warning}
          </AlertDescription>
        </Alert>
      )}
      
      {hasQualityIssues && (
        <Alert className="bg-red-50 border-red-200">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-800 text-sm">
            <strong>Quality issues found:</strong>
            <ul className="mt-1 list-disc list-inside">
              {qualityIssues.slice(0, 3).map((issue, i) => (
                <li key={i}>{issue}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant={hasQualityIssues ? "destructive" : "outline"} 
            className="w-full"
            disabled={isRegenerating}
            data-testid="button-regenerate-dropdown"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRegenerating ? 'animate-spin' : ''}`} />
            {isRegenerating ? 'Regenerating...' : 'Regenerate'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuItem 
            onClick={() => handleRegenerate({ mode: 'standard' })}
            data-testid="menu-item-standard"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            <div>
              <div className="font-medium">Standard Regenerate</div>
              <div className="text-xs text-gray-500">Try again with same settings</div>
            </div>
          </DropdownMenuItem>
          
          {currentMediaUrl && (
            <DropdownMenuItem 
              onClick={() => handleRegenerate({ 
                mode: 'with-reference', 
                referenceUrl: currentMediaUrl 
              })}
              data-testid="menu-item-with-reference"
            >
              <Image className="w-4 h-4 mr-2" />
              <div>
                <div className="font-medium">Refine Current (I2I)</div>
                <div className="text-xs text-gray-500">Use current as starting point</div>
              </div>
            </DropdownMenuItem>
          )}
          
          {suggestedImprovement && (
            <DropdownMenuItem 
              onClick={() => handleRegenerate({ 
                mode: 'standard', 
                newPrompt: suggestedImprovement 
              })}
              data-testid="menu-item-suggestion"
            >
              <Wand2 className="w-4 h-4 mr-2" />
              <div>
                <div className="font-medium">Apply Suggestion</div>
                <div className="text-xs text-gray-500">Use AI improved prompt</div>
              </div>
            </DropdownMenuItem>
          )}
          
          <DropdownMenuSeparator />
          
          {complexity?.simplifiedPrompt && (
            <DropdownMenuItem 
              onClick={() => handleRegenerate({ 
                mode: 'simplified-prompt', 
                newPrompt: complexity.simplifiedPrompt 
              })}
              data-testid="menu-item-simplified"
            >
              <FileQuestion className="w-4 h-4 mr-2" />
              <div>
                <div className="font-medium">Try Simplified</div>
                <div className="text-xs text-gray-500">Use simpler prompt for better results</div>
              </div>
            </DropdownMenuItem>
          )}
          
          <DropdownMenuItem 
            onClick={() => handleRegenerate({ mode: 'different-provider' })}
            data-testid="menu-item-different-provider"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            <div>
              <div className="font-medium">Try Different Provider</div>
              <div className="text-xs text-gray-500">Auto-select alternative AI</div>
            </div>
          </DropdownMenuItem>
          
          {complexity?.category === 'impossible' && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => handleRegenerate({ mode: 'stock-search' })}
                data-testid="menu-item-stock-search"
              >
                <FileQuestion className="w-4 h-4 mr-2" />
                <div>
                  <div className="font-medium">Search Stock Footage</div>
                  <div className="text-xs text-gray-500">Find real footage instead</div>
                </div>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default RegenerationOptions;
