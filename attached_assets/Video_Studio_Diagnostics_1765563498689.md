# Video Studio Diagnostic & Targeted Fixes

## STOP - READ THIS FIRST

The previous fixes were not applied correctly. Before making more changes, we need to understand the actual code structure. Please follow this document step by step.

---

## Part 1: Diagnostic - Show Me The Code

Please run these commands and share the output. I need to see the actual code to provide correct fixes.

### Diagnostic 1: Find where stock videos are searched

```bash
grep -rn "pexels\|pixabay\|getStockVideo\|searchVideo" server/services/ --include="*.ts" | head -40
```

**Share the output and the relevant function code.**

### Diagnostic 2: Find where product overlay position is set

```bash
grep -rn "ProductOverlay\|productOverlay\|overlay.*position\|x.*y.*scale" remotion/ --include="*.tsx" | head -30
```

**Share the output and the ProductOverlay component code.**

### Diagnostic 3: Find the duplicate text rendering

```bash
grep -rn "LowerThird\|TextOverlay\|textOverlays" remotion/ --include="*.tsx" | head -30
```

**Share the section of SceneRenderer that renders text overlays.**

### Diagnostic 4: Find how background type is determined

```bash
grep -rn "background.*type\|preferVideo\|preferImage\|videoUrl\|imageUrl" remotion/ --include="*.tsx" | head -30
```

**Share how the composition decides to use video vs image.**

### Diagnostic 5: Check if fixes exist

```bash
# Check if demographic prefix function exists
grep -n "getDemographicPrefix\|demographicPrefix\|targetAudience" server/services/universal-video-service.ts | head -20

# Check if pronunciation preprocessing exists  
grep -n "preprocessNarration\|pronunciationMap\|cohosh" server/services/universal-video-service.ts | head -20
```

**Share the output - this tells me if the fixes were added at all.**

---

## Part 2: Current State Analysis

Based on the screenshots, here's what's happening:

### Issue A: Duplicate Text (Image 2 & 3)
The text "Supports Healthy LH Levels" and "Menopause Symptoms Got You Down?" appear TWICE:
- Once in white, centered in middle of frame
- Once in lower-third with yellow accent bar

**This means the fix for exclusive text rendering was NOT applied.**

### Issue B: Wrong Gender in B-roll (Image 3)
Shows an older **male** for a menopause product targeting women 40-65.

**This means either:**
1. The demographic prefix isn't being added to search queries, OR
2. The stock video API isn't filtering by gender, OR
3. The search results aren't being validated before use

### Issue C: Random Irrelevant Content (Image 2)
Shows a pomegranate for "LH Levels" - completely unrelated.

**This means:**
1. The search query is picking up random results (maybe "healthy" matched food content)
2. There's no content validation/relevance check

### Issue D: Product Blocking Face (Image 1)
Product bottle is centered, covering the person.

**This means either:**
1. The position values aren't being passed to Remotion
2. The Remotion ProductOverlay component ignores position props
3. The default position is overriding the scene-specific position

### Issue E: AI Images Not Used (Image 4 vs Rendered)
The preview shows nice AI-generated images of women, but the final video uses B-roll instead.

**This means:**
1. The Remotion composition has logic that prefers video over images
2. The `background.type` is being set to 'video' for all scenes
3. The AI images are generated but then ignored

---

## Part 3: Targeted Fixes (After Diagnostics)

Once you share the diagnostic output, I'll provide exact line-by-line fixes. For now, here are the conceptual fixes:

### Fix A: Duplicate Text - MUST BE EXCLUSIVE

Find the text rendering section in the scene renderer. It should look something like this:

**WRONG (current - renders both):**
```tsx
{/* Lower Third */}
<LowerThird title={scene.textOverlays?.[0]?.text} ... />

{/* Text Overlays */}
{scene.textOverlays?.map(overlay => (
  <TextOverlayComponent key={overlay.id} overlay={overlay} ... />
))}
```

**CORRECT (exclusive - renders only one):**
```tsx
{(() => {
  const primaryText = scene.textOverlays?.[0]?.text;
  if (!primaryText) return null;
  
  // Use LowerThird for content scenes
  if (['hook', 'benefit', 'feature', 'intro'].includes(scene.type)) {
    return <LowerThird title={primaryText} brand={brand} fps={fps} durationInFrames={durationInFrames} />;
  }
  
  // Use centered text ONLY for CTA/outro
  return scene.textOverlays?.map(overlay => (
    <TextOverlayComponent key={overlay.id} overlay={overlay} brand={brand} sceneFrame={frame} fps={fps} />
  ));
})()}
```

**Key point:** There should be NO other `<LowerThird>` or `<TextOverlayComponent>` outside this block.

### Fix B: Gender Filter for Stock Video

The stock video search function needs to REQUIRE "woman" in the query for menopause content:

```typescript
async getStockVideo(query: string, targetAudience?: string): Promise<VideoResult | null> {
  let searchQuery = query;
  
  // FORCE gender for women's health products
  if (targetAudience) {
    const audience = targetAudience.toLowerCase();
    if (audience.includes('women') || audience.includes('female')) {
      // Prepend "woman" to EVERY search
      if (!searchQuery.toLowerCase().includes('woman')) {
        searchQuery = `woman ${searchQuery}`;
      }
    }
  }
  
  console.log(`[StockVideo] Searching: "${searchQuery}"`);
  
  // ... rest of search logic
}
```

### Fix C: Relevance Validation

After getting stock video results, validate they're relevant:

```typescript
// REJECT results that don't match demographics
const validateVideoResult = (result: any, targetAudience: string): boolean => {
  const tags = (result.tags || '').toLowerCase();
  const description = (result.description || '').toLowerCase();
  
  if (targetAudience.toLowerCase().includes('women')) {
    // Reject if clearly male content
    if (tags.includes('man') || tags.includes('male') || tags.includes('boy')) {
      console.log(`[StockVideo] Rejected - male content for women's product`);
      return false;
    }
    // Reject if no human content for lifestyle videos
    if (!tags.includes('woman') && !tags.includes('female') && !tags.includes('person')) {
      console.log(`[StockVideo] Rejected - no woman in video`);
      return false;
    }
  }
  
  return true;
};
```

### Fix D: Product Overlay Position

The ProductOverlay component must accept and USE position props:

```tsx
interface ProductOverlayProps {
  imageUrl: string;
  position: {
    x: 'left' | 'center' | 'right';
    y: 'top' | 'center' | 'bottom';
    scale: number;
  };
  // ...
}

const ProductOverlay: React.FC<ProductOverlayProps> = ({ imageUrl, position, ... }) => {
  // Calculate actual pixel positions
  const getXPosition = () => {
    switch (position.x) {
      case 'left': return '10%';
      case 'right': return '70%';  // Right side, not center
      default: return '50%';
    }
  };
  
  const getYPosition = () => {
    switch (position.y) {
      case 'top': return '10%';
      case 'bottom': return '60%';  // Lower portion
      default: return '50%';
    }
  };
  
  return (
    <Img
      src={imageUrl}
      style={{
        position: 'absolute',
        left: getXPosition(),
        top: getYPosition(),
        width: `${position.scale * 100}%`,
        transform: position.x === 'center' ? 'translateX(-50%)' : 'none',
        // ...
      }}
    />
  );
};
```

### Fix E: Use AI Images When Available

The scene rendering logic should prefer AI images over random B-roll:

```tsx
// In SceneRenderer, determine background source
const getBackgroundSource = (scene: Scene) => {
  // Priority 1: If scene explicitly prefers image
  if (scene.assets?.preferImage && scene.assets?.imageUrl) {
    return { type: 'image', url: scene.assets.imageUrl };
  }
  
  // Priority 2: If video exists AND is validated as relevant
  if (scene.assets?.videoUrl && scene.assets?.videoValidated) {
    return { type: 'video', url: scene.assets.videoUrl };
  }
  
  // Priority 3: Use AI-generated image
  if (scene.assets?.imageUrl || scene.assets?.backgroundUrl) {
    return { type: 'image', url: scene.assets.imageUrl || scene.assets.backgroundUrl };
  }
  
  // Priority 4: Fallback to video even if not validated
  if (scene.assets?.videoUrl) {
    return { type: 'video', url: scene.assets.videoUrl };
  }
  
  return { type: 'none', url: null };
};
```

---

## Part 4: Music Mood Fix

The music is "extremely sad and slow" - this is an ElevenLabs Music API parameter issue:

```typescript
// When generating music, specify uplifting parameters
const musicParams = {
  prompt: `uplifting hopeful wellness commercial, positive energy, inspirational, 
           light and airy, modern corporate, ${productName}`,
  duration_seconds: totalDuration,
  // If the API supports mood parameters:
  mood: 'positive',
  tempo: 'medium',
  energy: 'medium-high'
};
```

---

## Part 5: Voiceover Pronunciation

If pronunciation got WORSE, the preprocessing might be malformed. Check:

1. Is the `preprocessNarrationForTTS` function being called?
2. Are the replacements creating invalid text?

**Add logging to verify:**
```typescript
const processedText = this.preprocessNarrationForTTS(text);
console.log('[TTS] Original:', text.substring(0, 100));
console.log('[TTS] Processed:', processedText.substring(0, 100));
```

---

## Next Steps

1. **Run the 5 diagnostic commands** and share the output
2. **Share the relevant code sections** so I can see the actual structure
3. I'll provide exact line-number fixes based on your actual code

**Do NOT attempt to apply more fixes until we understand why the previous ones didn't work.**
