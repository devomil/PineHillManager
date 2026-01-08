# Phase 12 Addendum: Content Type UI & Reference Image Persistence Fix

## Issues Identified

### Issue 1: Reference Image Configuration Not Persisting
**Symptom:** User applies reference image (I2I mode), sees success toast, but:
- Configuration doesn't save to database
- Reopening scene shows no reference image
- Warning count doesn't update

**Root Cause:** The `ReferenceImageSection` component likely updates local state but doesn't call the API to persist changes.

### Issue 2: Content Type Warning Not Actionable
**Symptom:** Warning says "6 scene(s) will use default content type based on style" but:
- Doesn't show which scenes
- Doesn't explain what content types are
- No way to fix from the warning

---

## Fix 1: Reference Image Persistence

### Backend: Add API Endpoint for Scene Reference Config

```typescript
// server/routes/scenes.ts

import { Router } from 'express';
import { db } from '../db';
import { scenes } from '../db/schema';
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * PATCH /api/scenes/:sceneId/reference-config
 * Save reference image configuration for a scene
 */
router.patch('/:sceneId/reference-config', async (req, res) => {
  const { sceneId } = req.params;
  const { 
    mode,           // 'none' | 'image-to-image' | 'image-to-video' | 'style-reference'
    sourceUrl,      // URL of reference image
    sourceType,     // 'upload' | 'current-media' | 'asset-library' | 'brand-media'
    settings        // Mode-specific settings (strength, motion, etc.)
  } = req.body;
  
  try {
    // Validate mode
    const validModes = ['none', 'image-to-image', 'image-to-video', 'style-reference'];
    if (!validModes.includes(mode)) {
      return res.status(400).json({ error: 'Invalid reference mode' });
    }
    
    // Build reference config object
    const referenceConfig = mode === 'none' ? null : {
      mode,
      sourceUrl,
      sourceType,
      settings,
      updatedAt: new Date().toISOString(),
    };
    
    // Update scene in database
    const [updated] = await db
      .update(scenes)
      .set({ 
        referenceConfig: referenceConfig ? JSON.stringify(referenceConfig) : null,
        // Also update content type if I2I/I2V implies it
        ...(mode === 'image-to-image' && { mediaSourceType: 'reference-image' }),
        ...(mode === 'image-to-video' && { mediaSourceType: 'reference-video' }),
      })
      .where(eq(scenes.id, sceneId))
      .returning();
    
    if (!updated) {
      return res.status(404).json({ error: 'Scene not found' });
    }
    
    console.log(`[API] Scene ${sceneId} reference config updated: ${mode}`);
    
    res.json({ 
      success: true, 
      scene: updated,
      message: mode === 'none' 
        ? 'Reference config cleared' 
        : `${mode} mode configured`
    });
    
  } catch (error) {
    console.error('[API] Failed to update reference config:', error);
    res.status(500).json({ error: 'Failed to save reference configuration' });
  }
});

/**
 * GET /api/scenes/:sceneId/reference-config
 * Get reference image configuration for a scene
 */
router.get('/:sceneId/reference-config', async (req, res) => {
  const { sceneId } = req.params;
  
  try {
    const scene = await db.query.scenes.findFirst({
      where: eq(scenes.id, sceneId),
      columns: {
        id: true,
        referenceConfig: true,
      },
    });
    
    if (!scene) {
      return res.status(404).json({ error: 'Scene not found' });
    }
    
    const config = scene.referenceConfig 
      ? JSON.parse(scene.referenceConfig) 
      : { mode: 'none' };
    
    res.json(config);
    
  } catch (error) {
    console.error('[API] Failed to get reference config:', error);
    res.status(500).json({ error: 'Failed to get reference configuration' });
  }
});

export default router;
```

### Database Schema Update

```typescript
// server/db/schema.ts - Add referenceConfig column to scenes table

export const scenes = pgTable('scenes', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  sceneNumber: integer('scene_number').notNull(),
  
  // ... existing columns ...
  
  // NEW: Reference image configuration
  referenceConfig: text('reference_config'), // JSON string
  
  // NEW: Media source type for tracking
  mediaSourceType: text('media_source_type'), // 'ai-generated' | 'reference-image' | 'reference-video' | 'stock-footage' | 'brand-media'
  
  // ... existing columns ...
});
```

### Frontend: Update ReferenceImageSection to Persist

```tsx
// client/src/components/scene-editor/ReferenceImageSection.tsx

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Add to component props
interface ReferenceImageSectionProps {
  sceneId: string;
  currentMediaUrl?: string;
  currentMediaType: 'image' | 'video';
  onReferenceApplied?: () => void;  // Callback after successful save
}

export const ReferenceImageSection: React.FC<ReferenceImageSectionProps> = ({
  sceneId,
  currentMediaUrl,
  currentMediaType,
  onReferenceApplied,
}) => {
  const queryClient = useQueryClient();
  
  // Fetch existing reference config on mount
  const { data: existingConfig, isLoading } = useQuery({
    queryKey: ['scene-reference-config', sceneId],
    queryFn: async () => {
      const response = await fetch(`/api/scenes/${sceneId}/reference-config`);
      if (!response.ok) throw new Error('Failed to fetch config');
      return response.json();
    },
  });
  
  // Initialize state from existing config
  useEffect(() => {
    if (existingConfig && existingConfig.mode !== 'none') {
      setMode(existingConfig.mode);
      setReferenceUrl(existingConfig.sourceUrl);
      setSourceType(existingConfig.sourceType);
      
      // Restore settings
      if (existingConfig.settings) {
        if (existingConfig.mode === 'image-to-image') {
          setI2iStrength(existingConfig.settings.strength || 0.7);
        }
        if (existingConfig.mode === 'image-to-video') {
          setI2vMotion(existingConfig.settings.motionStrength || 0.5);
          setI2vMotionType(existingConfig.settings.motionType || 'subtle');
        }
      }
      
      setIsExpanded(true);
    }
  }, [existingConfig]);
  
  // Mutation to save reference config
  const saveConfigMutation = useMutation({
    mutationFn: async (config: ReferenceConfig) => {
      const response = await fetch(`/api/scenes/${sceneId}/reference-config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: config.mode,
          sourceUrl: config.sourceUrl,
          sourceType: config.sourceType,
          settings: config.mode === 'image-to-image' 
            ? config.i2iSettings 
            : config.mode === 'image-to-video'
            ? config.i2vSettings
            : config.styleSettings,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['scene-reference-config', sceneId] });
      queryClient.invalidateQueries({ queryKey: ['scene', sceneId] });
      queryClient.invalidateQueries({ queryKey: ['generation-preview'] }); // Refresh warnings
      
      toast.success(data.message || 'Reference config saved');
      onReferenceApplied?.();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save reference configuration');
    },
  });
  
  // Update handleApply to use mutation
  const handleApply = useCallback(() => {
    if (!referenceUrl && mode !== 'none') {
      toast.error('Please select a reference image');
      return;
    }
    
    const config: ReferenceConfig = {
      mode,
      sourceUrl: referenceUrl || undefined,
      sourceType,
    };
    
    if (mode === 'image-to-image') {
      config.i2iSettings = {
        strength: i2iStrength,
        preserveComposition: true,
        preserveColors: true,
      };
    }
    
    if (mode === 'image-to-video') {
      config.i2vSettings = {
        motionStrength: i2vMotion,
        motionType: i2vMotionType,
        preserveSubject: true,
      };
    }
    
    // Save to backend (not just local state!)
    saveConfigMutation.mutate(config);
  }, [mode, referenceUrl, sourceType, i2iStrength, i2vMotion, i2vMotionType]);
  
  // Update handleClear to also clear in backend
  const handleClear = useCallback(() => {
    saveConfigMutation.mutate({ mode: 'none', sourceType: 'upload' });
    setMode('none');
    setReferenceUrl(null);
  }, []);
  
  // Show loading state
  if (isLoading) {
    return (
      <Card className="p-4 mb-4 border-dashed border-2 border-gray-200">
        <Skeleton className="h-6 w-32" />
      </Card>
    );
  }
  
  // ... rest of component JSX remains the same, but update Apply button:
  
  return (
    // ... existing JSX ...
    
    <Button 
      className="flex-1" 
      onClick={handleApply}
      disabled={!referenceUrl || saveConfigMutation.isPending}
    >
      {saveConfigMutation.isPending ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Saving...
        </>
      ) : (
        'Apply Reference'
      )}
    </Button>
    
    // ... rest of JSX ...
  );
};
```

---

## Fix 2: Actionable Content Type Warning

### Update Generation Preview Warning Component

```tsx
// client/src/components/generation-preview/ContentTypeWarning.tsx

import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Edit2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Scene {
  id: string;
  sceneNumber: number;
  title?: string;
  visualDirection: string;
  contentType?: string;
  detectedContentType?: string;
  contentTypeConfidence?: number;
}

interface ContentTypeWarningProps {
  scenes: Scene[];
  onContentTypeChange: (sceneId: string, contentType: string) => void;
}

const CONTENT_TYPES = [
  { value: 'b-roll', label: 'B-Roll', description: 'Background/ambient footage' },
  { value: 'product-shot', label: 'Product Shot', description: 'Focus on product display' },
  { value: 'lifestyle', label: 'Lifestyle', description: 'People using product naturally' },
  { value: 'talking-head', label: 'Talking Head', description: 'Person speaking to camera' },
  { value: 'testimonial', label: 'Testimonial', description: 'Customer review/story' },
  { value: 'demo', label: 'Demo/Tutorial', description: 'How-to or demonstration' },
  { value: 'cinematic', label: 'Cinematic', description: 'Dramatic/artistic shots' },
  { value: 'text-overlay', label: 'Text/Graphics', description: 'Motion graphics or text focus' },
];

export const ContentTypeWarning: React.FC<ContentTypeWarningProps> = ({
  scenes,
  onContentTypeChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Filter to scenes needing attention (no explicit content type set)
  const scenesNeedingAttention = scenes.filter(
    s => !s.contentType || s.contentType === 'default' || s.contentType === 'auto'
  );
  
  if (scenesNeedingAttention.length === 0) {
    return null;
  }
  
  return (
    <Alert className="bg-amber-50 border-amber-200">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
          <div className="flex-1">
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
              <AlertDescription className="text-amber-800 font-medium">
                {scenesNeedingAttention.length} scene(s) will use auto-detected content type
              </AlertDescription>
              <Button variant="ghost" size="sm" className="ml-auto">
                {isOpen ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <>
                    <Edit2 className="w-4 h-4 mr-1" />
                    Review
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="mt-3 space-y-2">
              <p className="text-sm text-amber-700 mb-3">
                Content type affects provider selection and quality checks. 
                Review and adjust if needed:
              </p>
              
              {scenesNeedingAttention.map((scene) => (
                <SceneContentTypeRow
                  key={scene.id}
                  scene={scene}
                  onContentTypeChange={onContentTypeChange}
                />
              ))}
              
              <div className="pt-2 border-t border-amber-200 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Apply detected types to all
                    scenesNeedingAttention.forEach(scene => {
                      if (scene.detectedContentType) {
                        onContentTypeChange(scene.id, scene.detectedContentType);
                      }
                    });
                  }}
                >
                  Accept All Suggestions
                </Button>
              </div>
            </CollapsibleContent>
          </div>
        </div>
      </Collapsible>
    </Alert>
  );
};

// Individual scene row
const SceneContentTypeRow: React.FC<{
  scene: Scene;
  onContentTypeChange: (sceneId: string, contentType: string) => void;
}> = ({ scene, onContentTypeChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  
  const detectedType = CONTENT_TYPES.find(t => t.value === scene.detectedContentType);
  const confidence = scene.contentTypeConfidence || 0;
  
  return (
    <div className="flex items-center gap-3 p-2 bg-white rounded border border-amber-100">
      {/* Scene number */}
      <Badge variant="outline" className="shrink-0">
        Scene {scene.sceneNumber}
      </Badge>
      
      {/* Visual direction preview */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-700 truncate">
          {scene.visualDirection?.substring(0, 60)}...
        </p>
      </div>
      
      {/* Detected type with confidence */}
      {!isEditing && detectedType && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            Suggested: <strong>{detectedType.label}</strong>
          </span>
          <Badge 
            variant={confidence > 0.7 ? 'default' : 'secondary'}
            className="text-xs"
          >
            {Math.round(confidence * 100)}%
          </Badge>
        </div>
      )}
      
      {/* Content type selector */}
      {isEditing ? (
        <Select
          defaultValue={scene.detectedContentType || 'b-roll'}
          onValueChange={(value) => {
            onContentTypeChange(scene.id, value);
            setIsEditing(false);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CONTENT_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                <div>
                  <div className="font-medium">{type.label}</div>
                  <div className="text-xs text-gray-500">{type.description}</div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsEditing(true)}
        >
          <Edit2 className="w-3 h-3 mr-1" />
          Change
        </Button>
      )}
      
      {/* Quick accept button */}
      {!isEditing && detectedType && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onContentTypeChange(scene.id, scene.detectedContentType!)}
        >
          Accept
        </Button>
      )}
    </div>
  );
};

export default ContentTypeWarning;
```

### Update Generation Preview Panel

```tsx
// client/src/components/generation-preview/GenerationPreviewPanel.tsx

import { ContentTypeWarning } from './ContentTypeWarning';
import { useMutation, useQueryClient } from '@tanstack/react-query';

// In the component:

const GenerationPreviewPanel: React.FC<Props> = ({ project, scenes }) => {
  const queryClient = useQueryClient();
  
  // Mutation to update scene content type
  const updateContentTypeMutation = useMutation({
    mutationFn: async ({ sceneId, contentType }: { sceneId: string; contentType: string }) => {
      const response = await fetch(`/api/scenes/${sceneId}/content-type`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType }),
      });
      
      if (!response.ok) throw new Error('Failed to update');
      return response.json();
    },
    onSuccess: () => {
      // Refresh scenes and preview
      queryClient.invalidateQueries({ queryKey: ['scenes', project.id] });
      queryClient.invalidateQueries({ queryKey: ['generation-preview', project.id] });
    },
  });
  
  const handleContentTypeChange = (sceneId: string, contentType: string) => {
    updateContentTypeMutation.mutate({ sceneId, contentType });
  };
  
  return (
    <div className="generation-preview-panel">
      {/* ... existing sections (Video, Voiceover, Music, Sound FX) ... */}
      
      {/* ... existing sections (Image Generation, Intelligence, Quality Assurance) ... */}
      
      {/* Warnings Section - UPDATED */}
      <div className="space-y-2">
        {/* Content Type Warning - Now Actionable */}
        <ContentTypeWarning
          scenes={scenes}
          onContentTypeChange={handleContentTypeChange}
        />
        
        {/* Other warnings... */}
      </div>
      
      {/* ... rest of panel ... */}
    </div>
  );
};
```

### Backend: Add Content Type Update Endpoint

```typescript
// server/routes/scenes.ts

/**
 * PATCH /api/scenes/:sceneId/content-type
 * Update scene content type
 */
router.patch('/:sceneId/content-type', async (req, res) => {
  const { sceneId } = req.params;
  const { contentType } = req.body;
  
  const validTypes = [
    'b-roll', 'product-shot', 'lifestyle', 'talking-head',
    'testimonial', 'demo', 'cinematic', 'text-overlay'
  ];
  
  if (!validTypes.includes(contentType)) {
    return res.status(400).json({ error: 'Invalid content type' });
  }
  
  try {
    const [updated] = await db
      .update(scenes)
      .set({ 
        contentType,
        contentTypeSource: 'user', // Track that user explicitly set this
      })
      .where(eq(scenes.id, sceneId))
      .returning();
    
    if (!updated) {
      return res.status(404).json({ error: 'Scene not found' });
    }
    
    res.json({ success: true, scene: updated });
    
  } catch (error) {
    console.error('[API] Failed to update content type:', error);
    res.status(500).json({ error: 'Failed to update content type' });
  }
});
```

---

## Database Schema Additions

```typescript
// server/db/schema.ts - Add these columns to scenes table

export const scenes = pgTable('scenes', {
  // ... existing columns ...
  
  // Content type (explicit or auto-detected)
  contentType: text('content_type'), // 'b-roll' | 'product-shot' | 'lifestyle' | etc.
  contentTypeSource: text('content_type_source'), // 'auto' | 'user' | 'ai'
  contentTypeConfidence: decimal('content_type_confidence', { precision: 3, scale: 2 }),
  detectedContentType: text('detected_content_type'), // What auto-detection suggested
  
  // Reference configuration
  referenceConfig: text('reference_config'), // JSON string
  mediaSourceType: text('media_source_type'), // 'ai-generated' | 'reference-image' | etc.
  
  // ... existing columns ...
});
```

### Migration

```sql
-- migrations/add_content_type_and_reference_config.sql

ALTER TABLE scenes 
ADD COLUMN IF NOT EXISTS content_type TEXT,
ADD COLUMN IF NOT EXISTS content_type_source TEXT DEFAULT 'auto',
ADD COLUMN IF NOT EXISTS content_type_confidence DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS detected_content_type TEXT,
ADD COLUMN IF NOT EXISTS reference_config TEXT,
ADD COLUMN IF NOT EXISTS media_source_type TEXT DEFAULT 'ai-generated';

-- Add index for content type queries
CREATE INDEX IF NOT EXISTS idx_scenes_content_type ON scenes(content_type);
CREATE INDEX IF NOT EXISTS idx_scenes_content_type_source ON scenes(content_type_source);
```

---

## Verification Checklist

### Reference Image Persistence Fix
- [ ] API endpoint `PATCH /api/scenes/:sceneId/reference-config` created
- [ ] API endpoint `GET /api/scenes/:sceneId/reference-config` created
- [ ] Database schema includes `referenceConfig` column
- [ ] ReferenceImageSection fetches existing config on mount
- [ ] ReferenceImageSection saves to backend on "Apply Reference"
- [ ] Config persists when scene editor is reopened
- [ ] Toast shows accurate success/error messages
- [ ] Query invalidation refreshes warning count

### Content Type Warning Fix
- [ ] Warning is collapsible/expandable
- [ ] Clicking "Review" shows affected scenes
- [ ] Each scene shows detected content type with confidence
- [ ] User can change content type via dropdown
- [ ] "Accept" applies suggested type for single scene
- [ ] "Accept All Suggestions" applies to all scenes
- [ ] Warning count updates after changes
- [ ] Changes persist to database

---

## Summary

This addendum fixes two critical UX issues:

1. **Reference images now persist** - The ReferenceImageSection saves to the backend via API, not just local state. Reopening the scene will show the saved configuration.

2. **Content type warning is actionable** - Users can now:
   - See which scenes need attention
   - See what content type was auto-detected (with confidence %)
   - Change content type with a dropdown
   - Accept suggestions individually or all at once
   - Warning count updates in real-time
