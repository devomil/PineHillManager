# Phase 11A: AI Prompt Sanitization

## Objective

Prevent AI image/video generators from creating text, logos, buttons, or UI elements inside the generated assets. All text and branding should be added via Remotion overlays, not baked into the image.

## Current Problem

**Visual Direction sent to AI:**
```
"Welcoming wellness center entrance with natural landscaping, golden hour lighting, 
Pine Hill Farm logo, Book Now button"
```

**AI generates:** Image with garbled/wrong "Pine Hill Farm" text and fake "Book Now" button

**What we want:** Clean image of wellness center, then Remotion adds the real logo and button

## Solution: Prompt Sanitization

Before sending any prompt to AI providers (Flux.1, fal.ai, Kling, Runway, Luma, Hailuo), sanitize it to remove text/logo requests and add explicit "no text" instructions.

## Implementation

### Create Prompt Sanitizer Service

```typescript
// server/services/prompt-sanitizer.ts

export interface SanitizedPrompt {
  cleanPrompt: string;
  removedElements: string[];
  extractedText: string[];
  extractedLogos: string[];
  warnings: string[];
}

export function sanitizePromptForAI(
  visualDirection: string,
  sceneType: string
): SanitizedPrompt {
  let cleanPrompt = visualDirection;
  const removedElements: string[] = [];
  const extractedText: string[] = [];
  const extractedLogos: string[] = [];
  const warnings: string[] = [];

  // === STEP 1: Extract and remove text overlay requests ===
  
  // Pattern: "text overlay with X" or "text showing X"
  const textOverlayPattern = /(?:text\s+)?overlay\s+(?:with|showing|displaying)\s+["']?([^"',.]+)["']?/gi;
  let match;
  while ((match = textOverlayPattern.exec(visualDirection)) !== null) {
    extractedText.push(match[1].trim());
    removedElements.push(match[0]);
  }
  cleanPrompt = cleanPrompt.replace(textOverlayPattern, '');

  // Pattern: "text with X" or "showing text X"
  const textWithPattern = /(?:showing\s+)?text\s+(?:with|saying|reading)\s+["']?([^"',.]+)["']?/gi;
  while ((match = textWithPattern.exec(visualDirection)) !== null) {
    extractedText.push(match[1].trim());
    removedElements.push(match[0]);
  }
  cleanPrompt = cleanPrompt.replace(textWithPattern, '');

  // Pattern: quoted text that should be displayed
  const quotedTextPattern = /["']([^"']+)["']\s*(?:text|title|heading|caption)/gi;
  while ((match = quotedTextPattern.exec(visualDirection)) !== null) {
    extractedText.push(match[1].trim());
    removedElements.push(match[0]);
  }
  cleanPrompt = cleanPrompt.replace(quotedTextPattern, '');

  // === STEP 2: Extract and remove logo requests ===

  // Pattern: "X logo" or "logo of X"
  const logoPattern = /(?:(\w+(?:\s+\w+)?)\s+logo|logo\s+(?:of|for)\s+(\w+(?:\s+\w+)?))/gi;
  while ((match = logoPattern.exec(visualDirection)) !== null) {
    const logoName = (match[1] || match[2]).trim();
    extractedLogos.push(logoName);
    removedElements.push(match[0]);
  }
  cleanPrompt = cleanPrompt.replace(logoPattern, '');

  // Specific brand names that should never be in AI prompts
  const brandNames = ['pine hill farm', 'phf', 'pinehillfarm'];
  for (const brand of brandNames) {
    const brandRegex = new RegExp(brand, 'gi');
    if (brandRegex.test(cleanPrompt)) {
      extractedLogos.push(brand);
      cleanPrompt = cleanPrompt.replace(brandRegex, '');
      removedElements.push(brand);
    }
  }

  // === STEP 3: Remove button/CTA requests ===

  const buttonPattern = /(?:book\s+now|learn\s+more|get\s+started|contact\s+us|call\s+now)\s*(?:button|cta)?/gi;
  while ((match = buttonPattern.exec(visualDirection)) !== null) {
    extractedText.push(match[0].trim());
    removedElements.push(match[0]);
  }
  cleanPrompt = cleanPrompt.replace(buttonPattern, '');

  // === STEP 4: Remove generic text/title/headline requests ===

  const genericTextPattern = /(?:with\s+)?(?:title|headline|heading|caption|subtitle|text)\s*(?:overlay)?/gi;
  cleanPrompt = cleanPrompt.replace(genericTextPattern, '');

  // === STEP 5: Add explicit "no text" instruction ===

  const noTextSuffix = '. IMPORTANT: Do not include any text, words, letters, logos, watermarks, labels, buttons, or UI elements in the image. Generate only the visual scene without any overlaid text or graphics.';

  // === STEP 6: Clean up the prompt ===

  // Remove double spaces
  cleanPrompt = cleanPrompt.replace(/\s+/g, ' ').trim();
  
  // Remove orphaned punctuation
  cleanPrompt = cleanPrompt.replace(/,\s*,/g, ',');
  cleanPrompt = cleanPrompt.replace(/,\s*\./g, '.');
  cleanPrompt = cleanPrompt.replace(/^\s*,\s*/, '');
  cleanPrompt = cleanPrompt.replace(/\s*,\s*$/, '');

  // Add the no-text instruction
  cleanPrompt = cleanPrompt + noTextSuffix;

  // === STEP 7: Generate warnings ===

  if (extractedText.length > 0) {
    warnings.push(`Extracted ${extractedText.length} text element(s) for Remotion overlay`);
  }
  if (extractedLogos.length > 0) {
    warnings.push(`Extracted ${extractedLogos.length} logo request(s) - will use brand assets`);
  }

  return {
    cleanPrompt,
    removedElements,
    extractedText,
    extractedLogos,
    warnings,
  };
}

// Helper to check if a scene type typically needs text overlays
export function sceneTypicallyNeedsText(sceneType: string): boolean {
  const textSceneTypes = [
    'cta',
    'call_to_action',
    'intro',
    'outro',
    'title',
    'explanation',
    'benefits',
    'features',
    'pricing',
    'contact',
  ];
  return textSceneTypes.includes(sceneType.toLowerCase());
}
```

### Integrate with Image/Video Generation

```typescript
// server/services/image-generation-service.ts

import { sanitizePromptForAI } from './prompt-sanitizer';

async function generateImage(scene: Scene, provider: string): Promise<string> {
  // Sanitize the prompt before sending to AI
  const sanitized = sanitizePromptForAI(scene.visualDirection, scene.type);
  
  console.log('[ImageGen] Original prompt:', scene.visualDirection);
  console.log('[ImageGen] Sanitized prompt:', sanitized.cleanPrompt);
  console.log('[ImageGen] Removed elements:', sanitized.removedElements);
  console.log('[ImageGen] Extracted text for overlays:', sanitized.extractedText);
  
  // Store extracted text for later overlay generation
  await updateScene(scene.id, {
    extractedOverlayText: sanitized.extractedText,
    extractedLogos: sanitized.extractedLogos,
  });
  
  // Send sanitized prompt to AI provider
  const imageUrl = await callProvider(provider, sanitized.cleanPrompt);
  
  return imageUrl;
}
```

### Update Video Generation Similarly

```typescript
// server/services/video-generation-service.ts

import { sanitizePromptForAI } from './prompt-sanitizer';

async function generateVideo(scene: Scene, provider: string): Promise<string> {
  const sanitized = sanitizePromptForAI(scene.visualDirection, scene.type);
  
  console.log('[VideoGen] Sanitized for', provider, ':', sanitized.cleanPrompt);
  
  // Different providers may need slightly different handling
  let finalPrompt = sanitized.cleanPrompt;
  
  if (provider === 'runway') {
    // Runway-specific prompt adjustments
    finalPrompt = `Cinematic shot: ${sanitized.cleanPrompt}`;
  } else if (provider === 'kling') {
    // Kling handles people well
    finalPrompt = `Natural, realistic: ${sanitized.cleanPrompt}`;
  }
  
  // Store extracted elements
  await updateScene(scene.id, {
    extractedOverlayText: sanitized.extractedText,
    extractedLogos: sanitized.extractedLogos,
  });
  
  const videoUrl = await callVideoProvider(provider, finalPrompt);
  
  return videoUrl;
}
```

## Example Transformations

### Example 1: CTA Scene
**Original:**
```
"Welcoming wellness center entrance with natural landscaping, golden hour lighting, 
Pine Hill Farm logo, Book Now button"
```

**Sanitized:**
```
"Welcoming wellness center entrance with natural landscaping, golden hour lighting. 
IMPORTANT: Do not include any text, words, letters, logos, watermarks, labels, 
buttons, or UI elements in the image. Generate only the visual scene without any 
overlaid text or graphics."
```

**Extracted for overlays:**
- Text: ["Book Now"]
- Logos: ["Pine Hill Farm"]

### Example 2: Benefits Scene
**Original:**
```
"Professional health coach in modern office, text overlay showing 'Personalized 
Wellness Plans', warm lighting"
```

**Sanitized:**
```
"Professional health coach in modern office, warm lighting. IMPORTANT: Do not 
include any text, words, letters, logos, watermarks, labels, buttons, or UI 
elements in the image."
```

**Extracted for overlays:**
- Text: ["Personalized Wellness Plans"]

### Example 3: Condition Scene
**Original:**
```
"Hands holding growing plant with glowing particles, Autoimmune and Mold/Mycotoxins 
text labels"
```

**Sanitized:**
```
"Hands holding growing plant with glowing particles. IMPORTANT: Do not include 
any text, words, letters, logos, watermarks, labels, buttons, or UI elements."
```

**Extracted for overlays:**
- Text: ["Autoimmune", "Mold/Mycotoxins"]

## Verification Checklist

- [ ] sanitizePromptForAI function created
- [ ] Text overlay requests extracted
- [ ] Logo requests extracted
- [ ] Brand names removed from prompts
- [ ] "No text" instruction appended
- [ ] Image generation uses sanitized prompts
- [ ] Video generation uses sanitized prompts
- [ ] Extracted text stored in scene for overlay generation
- [ ] Test: Generate image with text request → image has NO text
- [ ] Test: CTA scene generates clean background

## Database Schema Update

Add columns to store extracted overlay information:

```sql
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS extracted_overlay_text TEXT[];
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS extracted_logos TEXT[];
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS overlay_config JSONB;
```

## Next Phase

Once prompts are sanitized, proceed to **Phase 11B: Remotion Overlay System** to build the components that render text and logos on top of the clean AI-generated backgrounds.
