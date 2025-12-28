import { User, Package, Leaf, Sparkles, Home } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

export type ContentType = 'person' | 'product' | 'nature' | 'abstract' | 'lifestyle';

interface ContentTypeOption {
  id: ContentType;
  name: string;
  description: string;
  icon: React.ReactNode;
  providerHint: string;
}

const CONTENT_TYPES: ContentTypeOption[] = [
  {
    id: 'person',
    name: 'Person',
    description: 'People, faces, human activity',
    icon: <User className="h-4 w-4" />,
    providerHint: 'Best with Runway, Kling',
  },
  {
    id: 'product',
    name: 'Product',
    description: 'Product shots, items, objects',
    icon: <Package className="h-4 w-4" />,
    providerHint: 'Best with Runway',
  },
  {
    id: 'nature',
    name: 'Nature',
    description: 'Landscapes, outdoor scenes',
    icon: <Leaf className="h-4 w-4" />,
    providerHint: 'Works well with all providers',
  },
  {
    id: 'abstract',
    name: 'Abstract',
    description: 'Conceptual, artistic visuals',
    icon: <Sparkles className="h-4 w-4" />,
    providerHint: 'Best with Kling, Hailuo',
  },
  {
    id: 'lifestyle',
    name: 'Lifestyle',
    description: 'Daily life, activities, spaces',
    icon: <Home className="h-4 w-4" />,
    providerHint: 'Works well with all providers',
  },
];

interface ContentTypeSelectorProps {
  value: ContentType;
  onChange: (type: ContentType) => void;
  compact?: boolean;
  disabled?: boolean;
}

export function ContentTypeSelector({
  value,
  onChange,
  compact = false,
  disabled = false,
}: ContentTypeSelectorProps) {
  const currentType = CONTENT_TYPES.find(t => t.id === value) || CONTENT_TYPES[4];

  if (compact) {
    return (
      <TooltipProvider>
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={disabled}
                  data-testid="button-content-type-compact"
                >
                  {currentType.icon}
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>{currentType.name}</p>
              <p className="text-xs text-gray-400">{currentType.description}</p>
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start">
            {CONTENT_TYPES.map((type) => (
              <DropdownMenuItem
                key={type.id}
                onClick={() => onChange(type.id)}
                className="flex items-center gap-2"
                data-testid={`menu-item-content-type-${type.id}`}
              >
                {type.icon}
                <div>
                  <p className="font-medium">{type.name}</p>
                  <p className="text-xs text-gray-500">{type.description}</p>
                </div>
                {type.id === value && (
                  <span className="ml-auto text-primary">✓</span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </TooltipProvider>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="justify-start gap-2"
          disabled={disabled}
          data-testid="button-content-type-full"
        >
          {currentType.icon}
          <span>{currentType.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {CONTENT_TYPES.map((type) => (
          <DropdownMenuItem
            key={type.id}
            onClick={() => onChange(type.id)}
            className="flex items-start gap-3 p-3"
            data-testid={`menu-item-content-type-${type.id}`}
          >
            <div className="mt-0.5">{type.icon}</div>
            <div className="flex-1">
              <p className="font-medium">{type.name}</p>
              <p className="text-xs text-gray-500">{type.description}</p>
              <p className="text-xs text-blue-500 mt-1">{type.providerHint}</p>
            </div>
            {type.id === value && (
              <span className="text-primary">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function getContentTypeIcon(type: ContentType): React.ReactNode {
  const typeConfig = CONTENT_TYPES.find(t => t.id === type);
  return typeConfig?.icon || <Home className="h-4 w-4" />;
}

export function getContentTypeName(type: ContentType): string {
  const typeConfig = CONTENT_TYPES.find(t => t.id === type);
  return typeConfig?.name || 'Lifestyle';
}

export default ContentTypeSelector;
