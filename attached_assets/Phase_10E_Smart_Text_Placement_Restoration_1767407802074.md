# Phase 10E: Smart Text Placement Restoration

## Objective

Restore smart text placement so scenes that require text overlays (CTA scenes, explanation scenes with bullet points) actually display text in the final video.

## Current Problem

**Scene 17 (CTA Scene):**
- Visual Direction: "text overlay with the three actionable steps: Identify your top 3 sources of added sugar, Add one extra serving of vegetables, Replace one ultra-processed snack"
- Actual Output: Just an image with NO text overlay
- The text placement service is either not running or not being applied during composition

## Where Text Placement Should Happen

```
Asset Generation → Scene Analysis → [TEXT PLACEMENT HERE] → Composition → Render

Text placement happens AFTER asset generation but BEFORE final composition.
It's a Remotion composition layer, not burned into the source image.
```

## Implementation

### Step 1: Detect Scenes Requiring Text Overlays

```typescript
// server/services/text-overlay-detector.ts

export interface TextOverlayRequirement {
  sceneIndex: number;
  required: boolean;
  overlayType: 'bullet_list' | 'single_text' | 'title' | 'cta' | 'none';
  textContent: string[];
  source: 'visual_direction' | 'narration' | 'scene_type';
}

export function detectTextOverlayRequirements(scene: Scene): TextOverlayRequirement {
  const visualDirection = scene.visualDirection?.toLowerCase() || '';
  const narration = scene.narration || '';
  const sceneType = scene.type?.toLowerCase() || '';
  
  // Check for explicit text overlay mentions
  if (visualDirection.includes('text overlay') || 
      visualDirection.includes('text with') ||
      visualDirection.includes('overlay with') ||
      visualDirection.includes('showing text')) {
    
    // Extract the text content from visual direction
    const textContent = extractTextContent(scene.visualDirection, narration);
    
    return {
      sceneIndex: scene.sceneIndex,
      required: true,
      overlayType: textContent.length > 1 ? 'bullet_list' : 'single_text',
      textContent,
      source: 'visual_direction',
    };
  }
  
  // Check for CTA scenes - they typically need text
  if (sceneType === 'cta' || sceneType === 'call_to_action') {
    const ctaContent = extractCTAContent(narration);
    
    return {
      sceneIndex: scene.sceneIndex,
      required: true,
      overlayType: 'cta',
      textContent: ctaContent,
      source: 'scene_type',
    };
  }
  
  // Check for actionable steps in narration
  if (narration.includes('try this:') || 
      narration.includes('steps:') ||
      narration.includes('tips:')) {
    const actionItems = extractActionItems(narration);
    
    if (actionItems.length > 0) {
      return {
        sceneIndex: scene.sceneIndex,
        required: true,
        overlayType: 'bullet_list',
        textContent: actionItems,
        source: 'narration',
      };
    }
  }
  
  return {
    sceneIndex: scene.sceneIndex,
    required: false,
    overlayType: 'none',
    textContent: [],
    source: 'visual_direction',
  };
}

function extractTextContent(visualDirection: string, narration: string): string[] {
  const content: string[] = [];
  
  // Look for patterns like "three actionable steps: X, Y, Z"
  const stepsMatch = visualDirection.match(/(?:steps|points|items)[:\s]+([^.]+)/i);
  if (stepsMatch) {
    const steps = stepsMatch[1].split(/[•\-,]/).map(s => s.trim()).filter(s => s.length > 0);
    content.push(...steps);
  }
  
  // If no steps found in visual direction, extract from narration
  if (content.length === 0) {
    // Look for bullet-style items in narration
    const bulletPattern = /[•\-]\s*([^•\-\n]+)/g;
    let match;
    while ((match = bulletPattern.exec(narration)) !== null) {
      content.push(match[1].trim());
    }
    
    // Look for numbered items
    const numberPattern = /\d+[.)]\s*([^.\n]+)/g;
    while ((match = numberPattern.exec(narration)) !== null) {
      content.push(match[1].trim());
    }
  }
  
  // Final fallback: split by common patterns
  if (content.length === 0 && narration.includes('try this:')) {
    const afterTryThis = narration.split('try this:')[1];
    if (afterTryThis) {
      // Split by periods or common delimiters
      const items = afterTryThis
        .split(/[.•\-]/)
        .map(s => s.trim())
        .filter(s => s.length > 10 && s.length < 100);
      content.push(...items.slice(0, 5));
    }
  }
  
  return content;
}

function extractCTAContent(narration: string): string[] {
  // For CTA scenes, extract the main call to action
  const content: string[] = [];
  
  // Look for website/contact info
  if (narration.toLowerCase().includes('visit')) {
    const visitMatch = narration.match(/visit\s+(\S+)/i);
    if (visitMatch) content.push(visitMatch[0]);
  }
  
  // Look for phone numbers
  const phoneMatch = narration.match(/\d{3}[-.]?\d{3}[-.]?\d{4}/);
  if (phoneMatch) content.push(phoneMatch[0]);
  
  // Extract main CTA phrase
  const ctaPhrases = ['learn more', 'get started', 'schedule', 'book', 'call', 'contact'];
  for (const phrase of ctaPhrases) {
    if (narration.toLowerCase().includes(phrase)) {
      const phraseIndex = narration.toLowerCase().indexOf(phrase);
      const ctaText = narration.substring(phraseIndex, phraseIndex + 50).split(/[.!]/)[0];
      content.push(ctaText);
      break;
    }
  }
  
  return content;
}

function extractActionItems(narration: string): string[] {
  const items: string[] = [];
  
  // Common patterns for action items
  const patterns = [
    /Identify\s+([^.]+)/gi,
    /Add\s+([^.]+)/gi,
    /Replace\s+([^.]+)/gi,
    /Try\s+([^.]+)/gi,
    /Start\s+([^.]+)/gi,
    /Focus\s+on\s+([^.]+)/gi,
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(narration)) !== null) {
      const item = match[0].trim();
      if (item.length < 80) {
        items.push(item);
      }
    }
  }
  
  return items.slice(0, 5); // Max 5 items
}
```

### Step 2: Generate Text Overlays for Remotion

```typescript
// server/services/text-overlay-generator.ts

import { TextPlacement, textPlacementService } from './text-placement-service';

export interface RemotionTextOverlay {
  id: string;
  text: string;
  type: 'title' | 'bullet' | 'cta' | 'caption';
  position: { x: number; y: number };
  style: {
    fontSize: number;
    color: string;
    backgroundColor?: string;
    fontWeight: string;
  };
  timing: {
    startFrame: number;
    endFrame: number;
    fadeInFrames: number;
    fadeOutFrames: number;
  };
  animation: 'fade' | 'slide-up' | 'pop';
}

export function generateTextOverlays(
  requirement: TextOverlayRequirement,
  sceneDuration: number,
  fps: number = 30,
  frameAnalysis?: any
): RemotionTextOverlay[] {
  const overlays: RemotionTextOverlay[] = [];
  const totalFrames = Math.round(sceneDuration * fps);
  
  if (!requirement.required || requirement.textContent.length === 0) {
    return overlays;
  }
  
  const startDelay = Math.round(fps * 0.5); // 0.5s delay before text appears
  
  if (requirement.overlayType === 'bullet_list') {
    // Stagger bullet points
    const itemDuration = Math.floor((totalFrames - startDelay - fps) / requirement.textContent.length);
    
    requirement.textContent.forEach((text, index) => {
      const startFrame = startDelay + (index * Math.round(itemDuration * 0.3));
      const endFrame = totalFrames - Math.round(fps * 0.3);
      
      overlays.push({
        id: `bullet-${index}`,
        text: `• ${text}`,
        type: 'bullet',
        position: { 
          x: 10, // 10% from left
          y: 60 + (index * 10), // Stack vertically
        },
        style: {
          fontSize: 28,
          color: '#FFFFFF',
          backgroundColor: 'rgba(45, 90, 39, 0.85)', // PHF Green
          fontWeight: '600',
        },
        timing: {
          startFrame,
          endFrame,
          fadeInFrames: Math.round(fps * 0.3),
          fadeOutFrames: Math.round(fps * 0.2),
        },
        animation: 'slide-up',
      });
    });
  } else if (requirement.overlayType === 'cta') {
    // CTA - larger, centered
    overlays.push({
      id: 'cta-main',
      text: requirement.textContent[0] || 'Learn More',
      type: 'cta',
      position: { x: 50, y: 75 },
      style: {
        fontSize: 36,
        color: '#FFFFFF',
        backgroundColor: '#D4A574', // PHF Gold
        fontWeight: 'bold',
      },
      timing: {
        startFrame: Math.round(totalFrames * 0.4),
        endFrame: totalFrames,
        fadeInFrames: Math.round(fps * 0.4),
        fadeOutFrames: Math.round(fps * 0.2),
      },
      animation: 'pop',
    });
  } else {
    // Single text
    overlays.push({
      id: 'text-main',
      text: requirement.textContent[0] || '',
      type: 'caption',
      position: { x: 50, y: 85 },
      style: {
        fontSize: 32,
        color: '#FFFFFF',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        fontWeight: '500',
      },
      timing: {
        startFrame: startDelay,
        endFrame: totalFrames - Math.round(fps * 0.3),
        fadeInFrames: Math.round(fps * 0.3),
        fadeOutFrames: Math.round(fps * 0.2),
      },
      animation: 'fade',
    });
  }
  
  return overlays;
}
```

### Step 3: Integrate with Remotion Composition

```tsx
// remotion/compositions/SceneWithTextOverlays.tsx

import React from 'react';
import { AbsoluteFill, Sequence, Img, Video, interpolate, useCurrentFrame } from 'remotion';

interface TextOverlay {
  id: string;
  text: string;
  type: string;
  position: { x: number; y: number };
  style: any;
  timing: { startFrame: number; endFrame: number; fadeInFrames: number; fadeOutFrames: number };
  animation: string;
}

interface Props {
  scene: {
    mediaUrl: string;
    mediaType: 'image' | 'video';
    duration: number;
  };
  textOverlays: TextOverlay[];
  fps: number;
}

export const SceneWithTextOverlays: React.FC<Props> = ({ scene, textOverlays, fps }) => {
  return (
    <AbsoluteFill>
      {/* Background Media */}
      {scene.mediaType === 'video' ? (
        <Video src={scene.mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <Img src={scene.mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      )}
      
      {/* Text Overlays */}
      {textOverlays.map(overlay => (
        <Sequence
          key={overlay.id}
          from={overlay.timing.startFrame}
          durationInFrames={overlay.timing.endFrame - overlay.timing.startFrame}
        >
          <TextOverlayComponent overlay={overlay} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

const TextOverlayComponent: React.FC<{ overlay: TextOverlay }> = ({ overlay }) => {
  const frame = useCurrentFrame();
  const { timing, style, position, animation, text } = overlay;
  
  const duration = timing.endFrame - timing.startFrame;
  
  // Opacity animation
  const opacity = interpolate(
    frame,
    [0, timing.fadeInFrames, duration - timing.fadeOutFrames, duration],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Transform animation
  let transform = '';
  if (animation === 'slide-up') {
    const translateY = interpolate(frame, [0, timing.fadeInFrames], [30, 0], { extrapolateRight: 'clamp' });
    transform = `translateY(${translateY}px)`;
  } else if (animation === 'pop') {
    const scale = interpolate(frame, [0, timing.fadeInFrames], [0.8, 1], { extrapolateRight: 'clamp' });
    transform = `scale(${scale})`;
  }
  
  return (
    <div
      style={{
        position: 'absolute',
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: `translate(-50%, -50%) ${transform}`,
        opacity,
        fontSize: style.fontSize,
        color: style.color,
        backgroundColor: style.backgroundColor,
        fontWeight: style.fontWeight,
        padding: '12px 24px',
        borderRadius: 8,
        maxWidth: '80%',
        textAlign: 'center',
        fontFamily: 'Inter, sans-serif',
        textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
      }}
    >
      {text}
    </div>
  );
};
```

### Step 4: Apply Text Overlays During Composition

```typescript
// server/services/composition-service.ts

import { detectTextOverlayRequirements, generateTextOverlays } from './text-overlay-generator';

async function composeScene(scene: Scene, project: Project): Promise<ComposedScene> {
  console.log(`[Composition] Composing scene ${scene.sceneIndex}`);
  
  // Step 1: Detect if text overlays are needed
  const textRequirement = detectTextOverlayRequirements(scene);
  console.log(`[Composition] Text overlay required:`, textRequirement.required);
  
  // Step 2: Generate text overlays if needed
  let textOverlays: RemotionTextOverlay[] = [];
  
  if (textRequirement.required) {
    console.log(`[Composition] Generating ${textRequirement.textContent.length} text overlays`);
    textOverlays = generateTextOverlays(
      textRequirement,
      scene.duration,
      project.fps || 30,
      scene.analysisResult?.frameAnalysis
    );
    console.log(`[Composition] Generated overlays:`, textOverlays.map(o => o.text));
  }
  
  // Step 3: Return composed scene with overlays
  return {
    sceneIndex: scene.sceneIndex,
    mediaUrl: scene.videoUrl || scene.imageUrl,
    mediaType: scene.videoUrl ? 'video' : 'image',
    duration: scene.duration,
    textOverlays,
    transitions: scene.transitions,
    // ... other composition data
  };
}
```

## Specific Fix for Scene 17

For the CTA scene with actionable steps:

**Input:**
```
Narration: "This week, try this: Identify your top 3 sources of added sugar and find one healthier alternative. Add one extra serving of vegetables to your daily meals. Replace one ultra-processed snack with a whole food option."

Visual Direction: "Welcoming wellness center entrance with natural landscaping, golden hour lighting, text overlay with the three actionable steps"
```

**Expected Output Text Overlays:**
```typescript
[
  {
    text: "• Identify your top 3 sources of added sugar",
    position: { x: 10, y: 60 },
    animation: 'slide-up',
    startFrame: 15,
  },
  {
    text: "• Add one extra serving of vegetables",
    position: { x: 10, y: 70 },
    animation: 'slide-up',
    startFrame: 30,
  },
  {
    text: "• Replace one ultra-processed snack with whole food",
    position: { x: 10, y: 80 },
    animation: 'slide-up',
    startFrame: 45,
  },
]
```

## Verification Checklist

- [ ] Text overlay detector identifies CTA scenes
- [ ] Text overlay detector extracts actionable steps from narration
- [ ] Text overlays generated with correct content
- [ ] Text overlays passed to Remotion composition
- [ ] Scene 17 renders with three bullet points visible
- [ ] Text is readable (contrast, size)
- [ ] Text animation works (staggered slide-up)
- [ ] Text doesn't cover important visual elements

## Testing

After implementation, test Scene 17:

1. Go to Scene 17 (CTA scene)
2. Check if `textOverlays` array is populated in composition data
3. Preview the scene - three bullet points should appear
4. Verify text is readable and properly positioned
5. Verify text animates in (staggered appearance)

## Next Steps

After Phase 10E, the intelligence loop should be fully restored:
- Claude Vision analyzes content match ✅
- Real scores reflect actual quality ✅
- QA gate blocks bad renders ✅
- Text overlays appear where needed ✅

The system should now produce videos that match their visual directions.
