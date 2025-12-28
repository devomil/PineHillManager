# Phase 5C: Scene-Level Controls

## Objective

Add per-scene controls that allow users to specify content type (person, product, nature, etc.) and visual direction for each scene. This enables fine-grained control over AI video generation and improves provider selection accuracy.

## Prerequisites

- Phase 5A complete (Brand Settings Panel working)
- Phase 5B complete (Visual Style Provider Mapping working)
- Scenes Preview showing in project dashboard

## What This Phase Creates/Modifies

- `client/src/components/scene-card.tsx` - Enhanced scene card with controls
- `client/src/components/content-type-selector.tsx` - NEW: Content type picker
- `client/src/components/visual-direction-editor.tsx` - NEW: Visual direction input
- API endpoint for updating individual scenes

## What Success Looks Like

- Each scene card shows content type badge
- Users can change content type per scene
- Users can edit visual direction per scene
- Changes save automatically and affect generation

---

## Step 1: Create Content Type Selector Component

Create `client/src/components/content-type-selector.tsx`:

```tsx
import React from 'react';
import { User, Package, Leaf, Sparkles, Home } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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

export const ContentTypeSelector: React.FC<ContentTypeSelectorProps> = ({
  value,
  onChange,
  compact = false,
  disabled = false,
}) => {
  const currentType = CONTENT_TYPES.find(t => t.id === value) || CONTENT_TYPES[4]; // Default to lifestyle

  if (compact) {
    // Compact version - just icon with tooltip
    return (
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={disabled}
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
    );
  }

  // Full version with label
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="justify-start gap-2"
          disabled={disabled}
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
};

export const getContentTypeIcon = (type: ContentType): React.ReactNode => {
  const typeConfig = CONTENT_TYPES.find(t => t.id === type);
  return typeConfig?.icon || <Home className="h-4 w-4" />;
};

export const getContentTypeName = (type: ContentType): string => {
  const typeConfig = CONTENT_TYPES.find(t => t.id === type);
  return typeConfig?.name || 'Lifestyle';
};

export default ContentTypeSelector;
```

---

## Step 2: Create Visual Direction Editor Component

Create `client/src/components/visual-direction-editor.tsx`:

```tsx
import React, { useState, useEffect } from 'react';
import { Pencil, Wand2, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface VisualDirectionEditorProps {
  sceneId: string;
  currentDirection: string;
  narration: string;
  sceneType: string;
  onSave: (direction: string) => Promise<void>;
  disabled?: boolean;
}

export const VisualDirectionEditor: React.FC<VisualDirectionEditorProps> = ({
  sceneId,
  currentDirection,
  narration,
  sceneType,
  onSave,
  disabled = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [direction, setDirection] = useState(currentDirection);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Reset direction when prop changes
  useEffect(() => {
    setDirection(currentDirection);
  }, [currentDirection]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(direction);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save visual direction:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setDirection(currentDirection);
    setIsEditing(false);
  };

  const handleGenerateSuggestion = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/ai/suggest-visual-direction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          narration,
          sceneType,
          currentDirection,
        }),
      });
      
      if (response.ok) {
        const { suggestion } = await response.json();
        setDirection(suggestion);
      }
    } catch (error) {
      console.error('Failed to generate suggestion:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Non-editing view
  if (!isEditing) {
    return (
      <div className="group relative">
        <p className="text-xs text-gray-500 pr-8 line-clamp-2">
          {currentDirection || 'No visual direction set'}
        </p>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-0 right-0 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => setIsEditing(true)}
              disabled={disabled}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Edit visual direction</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  // Editing view
  return (
    <div className="space-y-2">
      <Textarea
        value={direction}
        onChange={(e) => setDirection(e.target.value)}
        placeholder="Describe the visual style, camera angles, lighting, etc."
        className="text-xs min-h-[60px] resize-none"
        disabled={isSaving || isGenerating}
      />
      
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-7"
          onClick={handleGenerateSuggestion}
          disabled={isSaving || isGenerating}
        >
          {isGenerating ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <Wand2 className="h-3 w-3 mr-1" />
          )}
          AI Suggest
        </Button>
        
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={handleCancel}
            disabled={isSaving}
          >
            <X className="h-3 w-3" />
          </Button>
          <Button
            variant="default"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Check className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VisualDirectionEditor;
```

---

## Step 3: Create Enhanced Scene Card Component

Create or update `client/src/components/scene-card.tsx`:

```tsx
import React, { useState } from 'react';
import { GripVertical, ChevronDown, ChevronUp, Clock, Video } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ContentTypeSelector, ContentType, getContentTypeIcon } from './content-type-selector';
import { VisualDirectionEditor } from './visual-direction-editor';

interface Scene {
  id: string;
  type: string;
  narration: string;
  duration: number;
  contentType?: ContentType;
  visualDirection?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  status?: 'pending' | 'generating' | 'complete' | 'error';
}

interface SceneCardProps {
  scene: Scene;
  index: number;
  onUpdate: (sceneId: string, updates: Partial<Scene>) => Promise<void>;
  onDragStart?: () => void;
  expanded?: boolean;
  disabled?: boolean;
}

const SCENE_TYPE_COLORS: Record<string, string> = {
  hook: 'bg-purple-100 text-purple-800',
  problem: 'bg-red-100 text-red-800',
  solution: 'bg-green-100 text-green-800',
  benefit: 'bg-blue-100 text-blue-800',
  testimonial: 'bg-yellow-100 text-yellow-800',
  cta: 'bg-orange-100 text-orange-800',
  process: 'bg-indigo-100 text-indigo-800',
  story: 'bg-pink-100 text-pink-800',
};

export const SceneCard: React.FC<SceneCardProps> = ({
  scene,
  index,
  onUpdate,
  onDragStart,
  expanded: defaultExpanded = false,
  disabled = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const handleContentTypeChange = async (contentType: ContentType) => {
    await onUpdate(scene.id, { contentType });
  };

  const handleVisualDirectionSave = async (visualDirection: string) => {
    await onUpdate(scene.id, { visualDirection });
  };

  const typeColor = SCENE_TYPE_COLORS[scene.type] || 'bg-gray-100 text-gray-800';

  return (
    <Card className={`transition-all ${disabled ? 'opacity-60' : ''}`}>
      <CardContent className="p-0">
        {/* Main row - always visible */}
        <div className="flex items-center gap-3 p-3">
          {/* Drag handle */}
          <div
            className="cursor-grab text-gray-400 hover:text-gray-600"
            onMouseDown={onDragStart}
          >
            <GripVertical className="h-5 w-5" />
          </div>

          {/* Thumbnail or placeholder */}
          <div className="h-12 w-16 bg-gray-100 rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
            {scene.thumbnailUrl ? (
              <img
                src={scene.thumbnailUrl}
                alt={`Scene ${index + 1}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <Video className="h-5 w-5 text-gray-400" />
            )}
          </div>

          {/* Scene info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {/* Scene type badge */}
              <Badge variant="secondary" className={`text-xs ${typeColor}`}>
                {scene.type.charAt(0).toUpperCase() + scene.type.slice(1)}
              </Badge>

              {/* Duration */}
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {scene.duration}s
              </span>

              {/* Content type */}
              <span className="text-xs text-gray-400 flex items-center gap-1">
                {getContentTypeIcon(scene.contentType || 'lifestyle')}
              </span>
            </div>

            {/* Narration preview */}
            <p className="text-sm text-gray-700 line-clamp-1">
              {scene.narration}
            </p>
          </div>

          {/* Content type selector (compact) */}
          <ContentTypeSelector
            value={scene.contentType || 'lifestyle'}
            onChange={handleContentTypeChange}
            compact
            disabled={disabled}
          />

          {/* Expand/collapse button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </button>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="px-3 pb-3 pt-0 space-y-3 border-t border-gray-100 mt-1">
            {/* Full narration */}
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">
                Narration
              </label>
              <p className="text-sm text-gray-700 bg-gray-50 rounded p-2">
                {scene.narration}
              </p>
            </div>

            {/* Content type (full selector) */}
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">
                Content Type
              </label>
              <ContentTypeSelector
                value={scene.contentType || 'lifestyle'}
                onChange={handleContentTypeChange}
                disabled={disabled}
              />
              <p className="text-xs text-gray-400 mt-1">
                Affects AI provider selection and prompt enhancement
              </p>
            </div>

            {/* Visual direction */}
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">
                Visual Direction
              </label>
              <VisualDirectionEditor
                sceneId={scene.id}
                currentDirection={scene.visualDirection || ''}
                narration={scene.narration}
                sceneType={scene.type}
                onSave={handleVisualDirectionSave}
                disabled={disabled}
              />
            </div>

            {/* Status indicator */}
            {scene.status && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-500">Status:</span>
                {scene.status === 'pending' && (
                  <Badge variant="outline">Pending</Badge>
                )}
                {scene.status === 'generating' && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    Generating...
                  </Badge>
                )}
                {scene.status === 'complete' && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Complete
                  </Badge>
                )}
                {scene.status === 'error' && (
                  <Badge variant="destructive">Error</Badge>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SceneCard;
```

---

## Step 4: Add API Endpoints

Add to `server/routes.ts`:

```typescript
// PATCH /api/video-projects/:projectId/scenes/:sceneId - Update individual scene
router.patch('/api/video-projects/:projectId/scenes/:sceneId', async (req, res) => {
  try {
    const { projectId, sceneId } = req.params;
    const updates = req.body;
    
    // Get the project
    const [project] = await db
      .select()
      .from(videoProjects)
      .where(eq(videoProjects.id, parseInt(projectId)));
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Update the specific scene
    const scenes = project.scenes || [];
    const sceneIndex = scenes.findIndex((s: any) => s.id === sceneId);
    
    if (sceneIndex === -1) {
      return res.status(404).json({ error: 'Scene not found' });
    }
    
    // Merge updates into scene
    scenes[sceneIndex] = {
      ...scenes[sceneIndex],
      ...updates,
    };
    
    // Save updated project
    await db
      .update(videoProjects)
      .set({ scenes, updatedAt: new Date() })
      .where(eq(videoProjects.id, parseInt(projectId)));
    
    res.json({ 
      success: true, 
      scene: scenes[sceneIndex] 
    });
    
  } catch (error: any) {
    console.error('[API] Update scene failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/suggest-visual-direction - AI suggestion for visual direction
router.post('/api/ai/suggest-visual-direction', async (req, res) => {
  try {
    const { narration, sceneType, currentDirection } = req.body;
    
    // Use Claude to generate visual direction
    const anthropic = new Anthropic();
    
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: `Generate a concise visual direction for a video scene.

Scene type: ${sceneType}
Narration: "${narration}"
${currentDirection ? `Current direction (improve this): ${currentDirection}` : ''}

Write 1-2 sentences describing:
- Camera angle/movement
- Lighting style
- Key visual elements
- Mood/atmosphere

Keep it brief and actionable for AI video generation. No preamble, just the direction.`,
        },
      ],
    });
    
    const suggestion = response.content[0].type === 'text' 
      ? response.content[0].text 
      : '';
    
    res.json({ suggestion });
    
  } catch (error: any) {
    console.error('[API] Visual direction suggestion failed:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

## Step 5: Integrate Scene Cards into Scenes Preview

Update the scenes preview section in `universal-video-producer.tsx`:

```tsx
import { SceneCard } from './scene-card';

// In the Scenes Preview section:
<div className="space-y-2">
  <div className="flex items-center justify-between mb-3">
    <h3 className="text-sm font-medium">Scenes Preview</h3>
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" onClick={handleExpandAll}>
        Expand All
      </Button>
      <Button variant="ghost" size="sm" onClick={handleCollapseAll}>
        Collapse All
      </Button>
    </div>
  </div>
  
  {project.scenes.map((scene, index) => (
    <SceneCard
      key={scene.id}
      scene={scene}
      index={index}
      onUpdate={handleSceneUpdate}
      disabled={isGenerating}
    />
  ))}
</div>

// Add handler:
const handleSceneUpdate = async (sceneId: string, updates: Partial<Scene>) => {
  try {
    await fetch(`/api/video-projects/${project.id}/scenes/${sceneId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    
    // Refresh project data
    await refetchProject();
  } catch (error) {
    console.error('Failed to update scene:', error);
  }
};
```

---

## Verification Checklist

Before moving to Phase 5D, confirm:

- [ ] Scene cards display with content type icon
- [ ] Clicking content type shows dropdown with all options
- [ ] Changing content type saves to database
- [ ] Expanding scene card shows full controls
- [ ] Visual direction editor appears in expanded view
- [ ] Editing visual direction saves correctly
- [ ] AI Suggest button generates appropriate directions
- [ ] Scene type badges display with correct colors
- [ ] Duration shows correctly
- [ ] Drag handle is visible for reordering
- [ ] Disabled state works during generation

---

## Content Type Provider Mapping

| Content Type | Best Providers | Why |
|--------------|----------------|-----|
| Person | Runway, Kling | Better human rendering, facial consistency |
| Product | Runway | Clean compositions, product photography |
| Nature | All | Most providers handle landscapes well |
| Abstract | Kling, Hailuo | Better motion effects, creative visuals |
| Lifestyle | All | General-purpose scenes |

---

## Troubleshooting

### "Content type not saving"
- Check API endpoint is registered
- Verify scene ID matches database
- Check for CORS issues

### "AI Suggest not working"
- Verify Anthropic API key is configured
- Check API endpoint path
- Look for errors in console

### "Scene card not expanding"
- Verify isExpanded state is working
- Check for CSS conflicts
- Ensure expand button click handler fires

---

## Next Phase

Once Scene-Level Controls are working, proceed to **Phase 5D: Generation Preview Panel** to show users what will be generated before they click the button.
