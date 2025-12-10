# Video Production Refinements - Phase 2

## Current Status: Good Progress, Needs Polish

Based on your screenshots, here's what's working and what needs improvement:

| Feature | Status | Notes |
|---------|--------|-------|
| B-roll video clips | ✅ Working | Woman meditating, hand touching ferns - real video! |
| AI backgrounds | ✅ Working | Soft product backgrounds look professional |
| Product overlay | ✅ Working | Pine Hill Farm bottle rendering well |
| Text overlays | ⚠️ Issues | Duplicate text, inconsistent styling |
| Lower third | ✅ Added | Yellow line with text looks good |
| Voiceover sync | ❌ Cuts off | Video ends before narration finishes |
| Scene images | ⚠️ Mismatch | Preview images not matching rendered scenes |
| CTA scene | ❌ Poor | Black screen, not branded |
| Brand consistency | ❌ Missing | Need logo, brand colors from pinehillfarm.co |

---

## ⚠️ CRITICAL ISSUE: Wrong Product Being Displayed

**Problem:** The video is showing an AI-generated amber dropper bottle instead of the REAL product (white capsule bottle with "Cultivating Wellness - Pine Hill Farm" branding).

**Root Cause:** The product overlay system is either:
1. Not using uploaded product images
2. Generating AI product images instead
3. The uploaded image URL is not being passed to Remotion
Please fix the product overlay system to:

ALWAYS use uploaded product images from project.assets.productImages
NEVER generate AI product images - if no uploaded image exists, skip the product overlay entirely
When an uploaded product image exists, upload it to S3 before Lambda rendering (Lambda can't access local paths)
Add console.log statements showing which product image URL is being used for each scene

The real product image is uploaded by the user. The system should use that image, not generate a fake one."

### Fix: Force Use of Uploaded Product Images

In `universal-video-service.ts`, update the product overlay logic:

```typescript
// In generateProjectAssets(), when processing scenes with product overlay:

// PRIORITY 1: Always use uploaded product images if available
const uploadedProductImages = project.assets.productImages || [];
const primaryProductImage = uploadedProductImages.find(img => img.isPrimary) 
                           || uploadedProductImages[0];

if (primaryProductImage && primaryProductImage.url) {
  console.log(`[UniversalVideoService] Using UPLOADED product image: ${primaryProductImage.url}`);
  
  // Validate the URL is accessible
  const isValidUrl = primaryProductImage.url.startsWith('https://') || 
                     primaryProductImage.url.startsWith('http://') ||
                     primaryProductImage.url.startsWith('/');
  
  if (isValidUrl) {
    // For scenes that should show product
    for (let i = 0; i < updatedProject.scenes.length; i++) {
      const scene = updatedProject.scenes[i];
      const showProduct = ['intro', 'feature', 'cta', 'benefit'].includes(scene.type);
      
      if (showProduct) {
        if (!updatedProject.scenes[i].assets) {
          updatedProject.scenes[i].assets = {};
        }
        
        // SET THE UPLOADED PRODUCT IMAGE - NOT AI GENERATED
        updatedProject.scenes[i].assets!.productOverlayUrl = primaryProductImage.url;
        updatedProject.scenes[i].assets!.useProductOverlay = true;
        
        console.log(`[UniversalVideoService] Scene ${i} (${scene.type}): product overlay = ${primaryProductImage.url}`);
      }
    }
  }
} else {
  console.warn('[UniversalVideoService] NO uploaded product images - product overlay will be skipped');
  // DO NOT generate AI product images - better to have no product than wrong product
}
```

### Ensure Product Image is Uploaded to S3

The product image URL must be accessible from AWS Lambda. If it's a local path, upload to S3:

```typescript
// Before rendering, ensure product image is on S3
async prepareProductImageForLambda(imageUrl: string): Promise<string> {
  // If already an HTTPS URL, it's ready
  if (imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  
  // If it's a local path or data URL, upload to S3
  if (imageUrl.startsWith('/') || imageUrl.startsWith('data:')) {
    console.log('[UniversalVideoService] Uploading product image to S3...');
    
    // Fetch the local image
    const response = await fetch(`http://localhost:5000${imageUrl}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    
    // Upload to S3
    const fileName = `product-${Date.now()}.png`;
    const s3Url = await this.uploadToS3(buffer, fileName, 'image/png');
    
    if (s3Url) {
      console.log(`[UniversalVideoService] Product image uploaded: ${s3Url}`);
      return s3Url;
    }
  }
  
  return imageUrl;
}
```

### Update prepareAssetsForLambda to Handle Product Images

```typescript
async prepareAssetsForLambda(project: VideoProject): Promise<{...}> {
  // ... existing code ...
  
  // IMPORTANT: Prepare product overlay images for all scenes
  for (let i = 0; i < preparedProject.scenes.length; i++) {
    const scene = preparedProject.scenes[i];
    
    if (scene.assets?.productOverlayUrl) {
      const originalUrl = scene.assets.productOverlayUrl;
      
      // If not already HTTPS, upload to S3
      if (!originalUrl.startsWith('https://')) {
        console.log(`[UniversalVideoService] Scene ${i} product needs S3 upload: ${originalUrl}`);
        
        try {
          // Handle local paths
          let buffer: Buffer;
          if (originalUrl.startsWith('/objects/') || originalUrl.startsWith('/')) {
            const localUrl = `http://localhost:5000${originalUrl}`;
            const response = await fetch(localUrl);
            buffer = Buffer.from(await response.arrayBuffer());
          } else if (originalUrl.startsWith('data:')) {
            const base64Data = originalUrl.split(',')[1];
            buffer = Buffer.from(base64Data, 'base64');
          } else {
            continue; // Skip unknown formats
          }
          
          const fileName = `product-scene-${i}-${Date.now()}.png`;
          const s3Url = await this.uploadToS3(buffer, fileName, 'image/png');
          
          if (s3Url) {
            preparedProject.scenes[i].assets!.productOverlayUrl = s3Url;
            console.log(`[UniversalVideoService] Scene ${i} product uploaded: ${s3Url}`);
          } else {
            // If upload fails, disable product overlay for this scene
            preparedProject.scenes[i].assets!.useProductOverlay = false;
            issues.push(`Failed to upload product image for scene ${i}`);
          }
        } catch (e: any) {
          console.error(`[UniversalVideoService] Product upload error scene ${i}:`, e.message);
          preparedProject.scenes[i].assets!.useProductOverlay = false;
        }
      }
    }
  }
  
  // ... rest of existing code ...
}
```

---

## ISSUE 1: Duplicate/Inconsistent Text Overlays

**Problem:** Screenshot shows both center text AND lower-third text displaying simultaneously:
- Center: "Tired of Menopause Symptoms?"
- Lower-left: "Tired of Menopause Symptoms?" (under yellow line)

**Fix:** Choose ONE text style per scene - the lower-third looks more professional.

### In `UniversalVideoComposition.tsx`, update SceneRenderer:

```tsx
// Option A: Use ONLY Lower Third for main scene text (recommended)
// Remove the standard TextOverlayComponent for scenes that have LowerThird

const SceneRenderer: React.FC<{...}> = ({ scene, brand, ... }) => {
  // ...existing code...

  // Determine if this scene should use LowerThird style
  const useLowerThirdStyle = ['hook', 'benefit', 'feature', 'intro'].includes(scene.type);
  
  // Get the primary text overlay (first one)
  const primaryText = scene.textOverlays?.[0];
  
  return (
    <AbsoluteFill style={{ opacity }}>
      {/* Background Layer */}
      {/* ...existing background code... */}

      {/* Text Overlays - Choose ONE style */}
      {useLowerThirdStyle && primaryText ? (
        // Professional Lower Third style
        <LowerThird
          title={primaryText.text}
          subtitle={scene.textOverlays?.[1]?.text}
          brand={brand}
          fps={fps}
          durationInFrames={durationInFrames}
        />
      ) : (
        // Standard centered text for other scenes (CTA, outro, etc.)
        (scene.textOverlays || []).map((overlay) => (
          <TextOverlayComponent
            key={overlay.id}
            overlay={overlay}
            brand={brand}
            sceneFrame={frame}
            fps={fps}
          />
        ))
      )}
    </AbsoluteFill>
  );
};
```

---

## ISSUE 2: Video Ends Abruptly / Voiceover Cut Off

**Problem:** The video ends before the narrator finishes speaking.

**Root Cause:** Scene durations are fixed and don't match actual voiceover length.

### Fix: Calculate scene durations AFTER voiceover is generated

In `universal-video-service.ts`, in `generateProjectAssets()`:

```typescript
// After voiceover generation succeeds, update scene durations
if (voiceoverResult.success) {
  updatedProject.assets.voiceover.fullTrackUrl = voiceoverResult.url;
  updatedProject.assets.voiceover.duration = voiceoverResult.duration;
  
  // ===== ADD THIS: Sync scene durations with voiceover =====
  console.log('[UniversalVideoService] Syncing scene durations with voiceover...');
  
  let totalNarrationDuration = 0;
  const sceneDurations: number[] = [];
  
  for (const scene of updatedProject.scenes) {
    const narration = scene.narration || '';
    const wordCount = narration.trim().split(/\s+/).filter(Boolean).length;
    
    // Speaking rate: ~2.5 words/second (150 WPM)
    // Add 1 second buffer for transitions
    const speakingTime = wordCount / 2.5;
    const sceneDuration = Math.max(5, Math.ceil(speakingTime + 1.5));
    
    sceneDurations.push(sceneDuration);
    totalNarrationDuration += sceneDuration;
    
    console.log(`  Scene ${scene.type}: ${wordCount} words → ${sceneDuration}s`);
  }
  
  // Apply calculated durations
  for (let i = 0; i < updatedProject.scenes.length; i++) {
    updatedProject.scenes[i].duration = sceneDurations[i];
  }
  
  // Add 2 seconds to final scene for clean ending
  const lastIndex = updatedProject.scenes.length - 1;
  updatedProject.scenes[lastIndex].duration += 2;
  
  updatedProject.totalDuration = totalNarrationDuration + 2;
  console.log(`[UniversalVideoService] Total video duration: ${updatedProject.totalDuration}s`);
  // ===== END ADD =====
}
```

---

## ISSUE 3: Unprofessional CTA Scene (Black Screen)

**Problem:** Screenshot 3 shows a plain black screen with just "Black Cohosh Extract Plus" text.

**Fix:** CTA scenes should have branded background with product and clear call-to-action.

### Update CTA scene handling in `createSceneFromRaw()`:

```typescript
private createSceneFromRaw(raw: any, index: number): Scene {
  // ...existing code...
  
  // Special handling for CTA scenes
  if (raw.type === 'cta') {
    return {
      id,
      order: index + 1,
      type: 'cta',
      duration: raw.duration || 10,
      narration: raw.narration || '',
      textOverlays: [
        {
          id: `text_${id}_cta_main`,
          text: raw.textOverlays?.[0]?.text || 'Take Control Naturally',
          style: 'cta',
          position: { vertical: 'center', horizontal: 'center', padding: 60 },
          timing: { startAt: 0, duration: 4 },
          animation: { enter: 'scale', exit: 'fade', duration: 0.6 },
        },
        {
          id: `text_${id}_cta_url`,
          text: 'Visit PineHillFarm.co',
          style: 'subtitle',
          position: { vertical: 'lower-third', horizontal: 'center', padding: 60 },
          timing: { startAt: 3, duration: 6 },
          animation: { enter: 'fade', exit: 'fade', duration: 0.5 },
        },
      ],
      background: {
        type: 'image',
        source: 'Professional wellness product photography with soft lighting',
        effect: { type: 'ken-burns', intensity: 'subtle', direction: 'in' },
        overlay: {
          type: 'gradient',
          color: 'rgba(45, 90, 39, 0.4)', // Pine Hill Farm forest green tint (#2d5a27)
          opacity: 0.5,
        },
      },
      transitionIn: { type: 'crossfade', duration: 0.8, easing: 'ease-in-out' },
      transitionOut: { type: 'fade', duration: 1.0, easing: 'ease-out' },
      assets: {
        useProductOverlay: true, // Show product bottle in CTA
      },
    };
  }
  
  // ...rest of existing code...
}
```

---

## ISSUE 4: Scene Preview Mismatch

**Problem:** The images shown in "Scenes Preview" (Image 1) don't match what's rendered in the final video.

**Explanation:** This is because:
1. Preview shows the AI-generated images (fal.ai)
2. Final render uses B-roll videos (Pixabay) instead

**Fix Options:**

### Option A: Update preview to show video thumbnails
```typescript
// In the frontend component that displays scene preview:
const getPreviewImage = (scene: Scene) => {
  // If scene has video, try to get video thumbnail
  if (scene.background?.type === 'video' && scene.assets?.videoUrl) {
    // For Pixabay videos, you can get thumbnail by appending ?thumb
    // Or show a "Video" badge over the AI image
    return scene.assets.imageUrl; // Show AI image as fallback
  }
  return scene.assets?.imageUrl || scene.assets?.backgroundUrl;
};
```

### Option B: Add visual indicator that scene uses video
```tsx
// In scene preview component:
<div className="scene-preview">
  <img src={scene.assets?.imageUrl} />
  {scene.background?.type === 'video' && (
    <div className="video-badge">
      <PlayIcon /> Video
    </div>
  )}
</div>
```

---

## ISSUE 5: Brand Consistency - Logo & Custom Product Images

**Problem:** Need to use Pine Hill Farm logo and uploaded product images instead of AI-generated.

### 5a. Add Logo Upload and Display

```typescript
// In video-types.ts, update BrandSettings:
interface BrandSettings {
  name: string;
  logoUrl: string;           // ✅ Already exists
  logoPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  logoSize?: number;         // Percentage of video width (e.g., 0.08 = 8%)
  // ... other brand settings
}
```

### 5b. Priority for Product Images

Update `generateProjectAssets()` to prioritize uploaded images:

```typescript
// When processing scenes, check for uploaded product images FIRST
for (let i = 0; i < project.scenes.length; i++) {
  const scene = project.scenes[i];
  
  // Check if user uploaded specific image for this scene
  if (scene.assets?.assignedProductImageId) {
    const uploadedImage = project.assets.productImages?.find(
      img => img.id === scene.assets?.assignedProductImageId
    );
    if (uploadedImage) {
      updatedProject.scenes[i].assets!.imageUrl = uploadedImage.url;
      updatedProject.scenes[i].assets!.productOverlayUrl = uploadedImage.url;
      console.log(`[UniversalVideoService] Using uploaded image for scene ${i}`);
      continue; // Skip AI generation for this scene
    }
  }
  
  // Check if user wants to use primary product image
  if (scene.assets?.useUploadedProduct && project.assets.productImages?.length > 0) {
    const primaryImage = project.assets.productImages.find(img => img.isPrimary) 
                        || project.assets.productImages[0];
    updatedProject.scenes[i].assets!.productOverlayUrl = primaryImage.url;
  }
  
  // Otherwise, generate AI background (existing code)
}
```

### 5c. Transparent Product Image Support

For product overlays, support transparent PNG:

```tsx
// In ProductOverlay component (UniversalVideoComposition.tsx):
const ProductOverlay: React.FC<{...}> = ({ productUrl, ... }) => {
  // Validate URL
  if (!isValidHttpUrl(productUrl)) return null;
  
  return (
    <div style={{
      position: 'absolute',
      // ... positioning code
      // Important: no background, allowing transparency
      background: 'transparent',
    }}>
      <Img
        src={productUrl}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
          // Preserve transparency
          mixBlendMode: 'normal',
        }}
      />
    </div>
  );
};
```

---

## ISSUE 6: Missing TV-Quality Attributes

### 6a. Product Reveals with Professional Animation

Add a dedicated "ProductReveal" component:

```tsx
const ProductReveal: React.FC<{
  productUrl: string;
  brand: BrandSettings;
  fps: number;
  durationInFrames: number;
}> = ({ productUrl, brand, fps, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  
  // Dramatic zoom-in with glow effect
  const revealDuration = fps * 1.5; // 1.5 seconds
  
  let scale = 0.3;
  let opacity = 0;
  let glowIntensity = 0;
  let blur = 20;
  
  if (frame < revealDuration) {
    const progress = frame / revealDuration;
    const eased = easeOutBack(progress);
    
    scale = interpolate(eased, [0, 1], [0.3, 1]);
    opacity = interpolate(progress, [0, 0.3, 1], [0, 1, 1]);
    glowIntensity = interpolate(progress, [0, 0.5, 1], [0, 30, 15]);
    blur = interpolate(progress, [0, 0.5, 1], [20, 0, 0]);
  } else {
    scale = 1;
    opacity = 1;
    glowIntensity = 15;
    blur = 0;
    
    // Subtle floating animation after reveal
    const floatFrame = frame - revealDuration;
    const floatY = Math.sin(floatFrame / 30) * 5;
    // Apply floating via transform
  }
  
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: `translate(-50%, -50%) scale(${scale})`,
        opacity,
        filter: `blur(${blur}px) drop-shadow(0 0 ${glowIntensity}px ${brand.colors.accent})`,
        transition: 'filter 0.3s ease',
      }}
    >
      <Img
        src={productUrl}
        style={{
          maxWidth: width * 0.5,
          maxHeight: height * 0.6,
          objectFit: 'contain',
        }}
      />
    </div>
  );
};
```

### 6b. Smooth Scene Transitions

Update transition handling:

```tsx
// In SceneRenderer, add more transition types:
const getTransitionStyle = (
  transitionType: string,
  progress: number,
  direction: 'in' | 'out'
): React.CSSProperties => {
  const eased = direction === 'in' ? easeOutCubic(progress) : easeInCubic(progress);
  
  switch (transitionType) {
    case 'fade':
      return { opacity: direction === 'in' ? eased : 1 - eased };
      
    case 'slide-left':
      const slideX = direction === 'in' 
        ? interpolate(eased, [0, 1], [100, 0])
        : interpolate(eased, [0, 1], [0, -100]);
      return { 
        opacity: direction === 'in' ? eased : 1 - eased,
        transform: `translateX(${slideX}%)` 
      };
      
    case 'zoom':
      const zoomScale = direction === 'in'
        ? interpolate(eased, [0, 1], [1.2, 1])
        : interpolate(eased, [0, 1], [1, 0.9]);
      return {
        opacity: direction === 'in' ? eased : 1 - eased,
        transform: `scale(${zoomScale})`,
      };
      
    case 'blur':
      const blurAmount = direction === 'in'
        ? interpolate(eased, [0, 1], [20, 0])
        : interpolate(eased, [0, 1], [0, 15]);
      return {
        opacity: direction === 'in' ? eased : 1 - eased,
        filter: `blur(${blurAmount}px)`,
      };
      
    default:
      return { opacity: direction === 'in' ? eased : 1 - eased };
  }
};
```

### 6c. Dynamic Pacing

Vary scene durations based on content type:

```typescript
// Scene duration multipliers based on type
const SCENE_PACING: Record<string, number> = {
  hook: 1.0,       // Standard - grab attention quickly
  intro: 1.2,      // Slightly longer - establish context
  benefit: 1.1,    // Key selling points - give time to absorb
  feature: 1.0,    // Technical details - keep moving
  testimonial: 1.3, // Social proof - let it breathe
  cta: 1.4,        // Call to action - give time to act
};

// Apply pacing multiplier
const baseDuration = calculateSceneDuration(scene.narration);
const pacingMultiplier = SCENE_PACING[scene.type] || 1.0;
scene.duration = Math.ceil(baseDuration * pacingMultiplier);
```

---

## Pine Hill Farm Brand Colors (Official Palette)

Based on the official brand color palette:

```typescript
const PINE_HILL_FARM_BRAND: BrandSettings = {
  name: 'Pine Hill Farm',
  logoUrl: '', // Add your logo URL here
  colors: {
    // Primary brand colors
    primary: '#2d5a27',      // Forest green (main brand color)
    secondary: '#607e66',    // Sage green (softer green)
    accent: '#c9a227',       // Gold/amber (CTAs, highlights)
    
    // Blues (for trust, calm, wellness)
    blue1: '#5e637a',        // Slate blue
    blue2: '#5b7c99',        // Steel blue
    blue3: '#8c93ad',        // Soft periwinkle
    blue4: '#6c97ab',        // Teal blue
    
    // Neutrals
    gray: '#a9a9a9',         // Medium gray
    textLight: '#ffffff',    // White
    textDark: '#5e637a',     // Slate blue (for dark text)
    
    // Backgrounds
    background: '#f5f0e8',   // Warm cream
    backgroundLight: '#f8f8f3', // Off-white
  },
  fonts: {
    heading: 'Playfair Display, Georgia, serif',
    body: 'Open Sans, Helvetica, sans-serif',
    weight: { heading: 700, body: 400 },
  },
  watermarkPosition: 'bottom-right',
  watermarkOpacity: 0.7,
};

// Color usage guide:
// - Headers/Titles: #2d5a27 (forest green) or #5e637a (slate blue)
// - Body text: #5e637a (slate blue) on light backgrounds
// - CTAs/Buttons: #c9a227 (gold) with #ffffff text
// - Backgrounds: #f5f0e8 (cream) or #f8f8f3 (off-white)
// - Accents/Highlights: #607e66 (sage) or #6c97ab (teal)
// - Overlays: rgba(45, 90, 39, 0.4) (green tint) or rgba(94, 99, 122, 0.3) (blue tint)
```

---

## Implementation Priority

1. **CRITICAL:** Fix product overlay - use UPLOADED product image, not AI-generated
2. **CRITICAL:** Fix voiceover cutoff (sync durations)
3. **HIGH:** Fix duplicate text overlays (use LowerThird only)
4. **HIGH:** Improve CTA scene (branded background, not black)
5. **MEDIUM:** Add logo/uploaded product image support
6. **MEDIUM:** Add ProductReveal animation
7. **LOW:** Fix scene preview mismatch (cosmetic)

---

## Quick Prompt for Replit Agent

> "Please make these improvements to the video production tool:
> 
> 1. **CRITICAL - Wrong product showing:** The video is displaying an AI-generated amber dropper bottle instead of our REAL product (white capsule bottle). The product overlay system must:
>    - ALWAYS use uploaded product images from `project.assets.productImages`
>    - NEVER generate AI product images
>    - Upload local product image paths to S3 before Lambda rendering
>    - Log which product image URL is being used for each scene
> 
> 2. **Fix voiceover cutoff:** After generating voiceover, calculate each scene's duration based on word count (2.5 words/second + 1.5s buffer). Add 2 extra seconds to the final scene.
> 
> 3. **Fix duplicate text:** In SceneRenderer, for hook/benefit/intro/feature scenes, ONLY render the LowerThird component (the yellow line style). Don't also render TextOverlayComponent for the same text.
> 
> 4. **Fix CTA scene:** The CTA scene should NOT be a black screen. Use a branded gradient background (forest green #2d5a27 to gold #c9a227) with the product overlay visible.
> 
> 5. **Use Pine Hill Farm brand colors:**
>    - Primary: #2d5a27 (forest green)
>    - Secondary: #607e66 (sage green)
>    - Accent/CTA: #c9a227 (gold)
>    - Blues: #5e637a (slate), #5b7c99 (steel), #6c97ab (teal)
>    - Backgrounds: #f5f0e8 (cream), #f8f8f3 (off-white)
>    - Text dark: #5e637a (slate blue)
> 
> See the attached refinement document for code examples."
