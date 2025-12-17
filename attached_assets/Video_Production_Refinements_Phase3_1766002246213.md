# Video Production Refinements - Phase 3

## Issues Identified from Latest Test

### 1. 🔴 CRITICAL: Wrong Demographics in B-Roll/Images
**Problem:** Image 3 shows a young girl (~8 years old) sleeping, but the target audience is "women between 40 and 65 years old" for a menopause product.

**Root Cause:** Stock video/image search queries don't incorporate the `targetAudience` field from the project.

**Fix:** Update search queries to include demographic context.

```typescript
// In universal-video-service.ts

private buildVideoSearchQuery(scene: Scene, targetAudience?: string): string {
  const narration = (scene.narration || '').toLowerCase();
  
  // Extract demographic hints from target audience
  let demographicTerms = '';
  if (targetAudience) {
    const audience = targetAudience.toLowerCase();
    
    // Age-based keywords
    if (audience.includes('40') || audience.includes('50') || audience.includes('60') || 
        audience.includes('mature') || audience.includes('middle') || audience.includes('menopause')) {
      demographicTerms = 'mature middle-aged ';
    } else if (audience.includes('senior') || audience.includes('elderly') || audience.includes('65+')) {
      demographicTerms = 'senior elderly ';
    } else if (audience.includes('young') || audience.includes('20') || audience.includes('30')) {
      demographicTerms = 'young adult ';
    }
    
    // Gender-based keywords
    if (audience.includes('women') || audience.includes('female') || audience.includes('woman')) {
      demographicTerms += 'woman female ';
    } else if (audience.includes('men') || audience.includes('male') || audience.includes('man')) {
      demographicTerms += 'man male ';
    }
  }
  
  // Health/wellness specific keywords with demographics
  if (narration.includes('menopause')) return `${demographicTerms}wellness relaxation health`;
  if (narration.includes('hot flash')) return `${demographicTerms}cooling relief comfort`;
  if (narration.includes('sleep')) return `${demographicTerms}peaceful sleep relaxation bedroom`;
  if (narration.includes('energy')) return `${demographicTerms}active healthy lifestyle`;
  if (narration.includes('hormone')) return `${demographicTerms}wellness nature botanical`;
  
  // Scene type defaults with demographics
  const defaults: Record<string, string> = {
    hook: `${demographicTerms}concerned thinking wellness`,
    benefit: `${demographicTerms}happy smiling healthy lifestyle`,
    testimonial: `${demographicTerms}satisfied customer smiling`,
    story: `${demographicTerms}transformation journey wellness`,
  };
  
  return defaults[scene.type] || `${demographicTerms}wellness healthy lifestyle`;
}

// Update buildContentPrompt to include demographics
private buildContentPrompt(scene: Scene, productName: string, targetAudience?: string): string {
  let demographicContext = '';
  
  if (targetAudience) {
    const audience = targetAudience.toLowerCase();
    if (audience.includes('40') || audience.includes('50') || audience.includes('menopause')) {
      demographicContext = 'mature woman in her 40s-60s, graceful aging, confident and healthy, ';
    }
    if (audience.includes('women') || audience.includes('female')) {
      demographicContext += 'female subject, ';
    }
  }
  
  // ... rest of prompt building with demographicContext prepended
}
```

**Also update the method signature in generateProjectAssets:**

```typescript
// Pass targetAudience to search methods
const searchQuery = this.buildVideoSearchQuery(scene, project.targetAudience);
```

---

### 2. 🔴 HIGH: Voiceover Mispronunciation ("Cohosh")

**Problem:** ElevenLabs mispronounces specialty words like "cohosh" (should be "ko-HOSH").

**Fix:** Add phonetic pronunciation hints using SSML or text preprocessing.

```typescript
// In universal-video-service.ts

/**
 * Pre-process narration text to help TTS with difficult words
 * Uses phonetic hints that ElevenLabs can interpret
 */
private preprocessNarrationForTTS(text: string): string {
  // Pronunciation dictionary for health/wellness terms
  const pronunciationMap: Record<string, string> = {
    // Herbs and supplements
    'cohosh': 'ko-hosh',
    'Cohosh': 'Ko-hosh',
    'ashwagandha': 'ash-wah-gahn-dah',
    'Ashwagandha': 'Ash-wah-gahn-dah',
    'adaptogen': 'ah-dap-toh-jen',
    'chasteberry': 'chaste-berry',
    'dong quai': 'dong kway',
    'Dong Quai': 'Dong Kway',
    'isoflavone': 'eye-so-flay-vone',
    'isoflavones': 'eye-so-flay-vones',
    'phytoestrogen': 'fy-toe-es-tro-jen',
    'phytoestrogens': 'fy-toe-es-tro-jens',
    'formononet': 'for-mon-oh-net',
    'formononetin': 'for-mon-oh-net-in',
    
    // Medical/scientific terms
    'luteinizing': 'loo-tin-eye-zing',
    'hypothalamus': 'hy-po-thal-ah-mus',
    'endocrine': 'en-doe-krin',
    'bioavailable': 'by-oh-ah-vay-la-bul',
    'standardized': 'stan-der-dized',
    
    // Brand names (add as needed)
    'PineHillFarm': 'Pine Hill Farm',
    'pinehillfarm': 'Pine Hill Farm',
  };
  
  let processedText = text;
  
  for (const [word, phonetic] of Object.entries(pronunciationMap)) {
    // Use word boundaries to avoid partial matches
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    processedText = processedText.replace(regex, phonetic);
  }
  
  return processedText;
}

// Update generateVoiceover to use preprocessing
async generateVoiceover(text: string, voiceId?: string, options?: {...}): Promise<VoiceoverResult> {
  // ... existing setup code ...
  
  // Preprocess text for better pronunciation
  const processedText = this.preprocessNarrationForTTS(text);
  console.log(`[UniversalVideoService] Original: ${text.substring(0, 100)}...`);
  console.log(`[UniversalVideoService] Processed: ${processedText.substring(0, 100)}...`);
  
  // ... rest of voiceover generation using processedText ...
}
```

---

### 3. 🔴 HIGH: Duplicate Text Overlays

**Problem:** Image 2 shows "Targets Root Causes" appearing twice - once in center and once in lower-third.

**Root Cause:** The code in `SceneRenderer` is rendering BOTH the `LowerThird` component AND iterating through `textOverlays` for the same text.

**Current Code Issue (UniversalVideoComposition.tsx lines 730-755):**
The IIFE is supposed to choose one style, but there's a logic issue.

**Fix:** Ensure only ONE text style renders per scene.

```tsx
// In UniversalVideoComposition.tsx - SceneRenderer component

{/* Text Overlays - ONLY ONE STYLE per scene */}
{(() => {
  const useLowerThirdStyle = ['hook', 'benefit', 'feature', 'intro'].includes(scene.type);
  const primaryText = scene.textOverlays?.[0];
  
  if (!primaryText?.text) {
    return null; // No text to display
  }
  
  if (useLowerThirdStyle) {
    // ONLY render LowerThird - do NOT also render TextOverlayComponent
    return (
      <LowerThird
        title={primaryText.text.length > 60 ? primaryText.text.substring(0, 57) + '...' : primaryText.text}
        subtitle={scene.textOverlays?.[1]?.text}
        brand={brand}
        fps={fps}
        durationInFrames={durationInFrames}
      />
    );
  }
  
  // For CTA, outro, and other scenes - use centered text
  return (scene.textOverlays || []).map((overlay) => (
    <TextOverlayComponent
      key={overlay.id}
      overlay={overlay}
      brand={brand}
      sceneFrame={frame}
      fps={fps}
    />
  ));
})()}
```

**IMPORTANT:** Also check that `scene.textOverlays` doesn't contain duplicate entries. The script generation might be creating both a "title" style and "subtitle" style overlay with the same text.

---

### 4. 🔴 HIGH: Product Overlay Positioning Issues

**Problem:** Image 4 shows the product bottle awkwardly placed over the woman's face.

**Current System:** Fixed positions (left/center/right, top/center/bottom) that don't account for image content.

**Solution A: Smart Position Detection (Future)**
Use AI to detect faces/subjects and position product away from them.

**Solution B: User-Configurable Positions (Recommended for Now)**
Allow users to adjust product position after seeing the preview.

```typescript
// In video-types.ts - Update ProductOverlayPosition

export interface ProductOverlayPosition {
  x: 'left' | 'center' | 'right';
  y: 'top' | 'center' | 'bottom';
  scale: number;              // 0.1 to 1.0
  animation?: 'fade' | 'zoom' | 'slide' | 'bounce' | 'none';
  offsetX?: number;           // Pixel offset from base position
  offsetY?: number;           // Pixel offset from base position
  rotation?: number;          // Degrees (-45 to 45)
}

// Default positions that work better with typical B-roll
private getSmartProductPosition(sceneType: string): ProductOverlayPosition {
  switch (sceneType) {
    case 'hook':
      // Bottom-right corner, smaller, out of the way
      return { x: 'right', y: 'bottom', scale: 0.3, animation: 'fade', offsetY: -40 };
    case 'intro':
      // Center but smaller, with room for text below
      return { x: 'center', y: 'center', scale: 0.45, animation: 'zoom', offsetY: -60 };
    case 'feature':
      // Left side, medium size
      return { x: 'left', y: 'center', scale: 0.4, animation: 'slide', offsetX: 80 };
    case 'benefit':
      // Bottom-right corner, subtle presence
      return { x: 'right', y: 'bottom', scale: 0.28, animation: 'fade', offsetY: -60, offsetX: -40 };
    case 'cta':
      // Center, larger for call to action
      return { x: 'center', y: 'center', scale: 0.5, animation: 'zoom' };
    default:
      return { x: 'right', y: 'bottom', scale: 0.3, animation: 'fade' };
  }
}
```

**Update ProductOverlay component to use offsets:**

```tsx
// In UniversalVideoComposition.tsx - ProductOverlay component

const ProductOverlay: React.FC<{
  productUrl: string;
  position: ProductOverlayPosition;
  fps: number;
  width: number;
  height: number;
}> = ({ productUrl, position, fps, width, height }) => {
  // ... existing validation ...
  
  const productSize = Math.min(width, height) * (position.scale || 0.4);
  const offsetX = position.offsetX || 0;
  const offsetY = position.offsetY || 0;

  let posX = width * 0.5;
  let posY = height * 0.5;

  // Calculate base position
  switch (position.x) {
    case 'left': posX = width * 0.18; break;
    case 'center': posX = width * 0.5; break;
    case 'right': posX = width * 0.82; break;
  }
  switch (position.y) {
    case 'top': posY = height * 0.22; break;
    case 'center': posY = height * 0.5; break;
    case 'bottom': posY = height * 0.78; break;
  }

  // Apply custom offsets
  posX += offsetX;
  posY += offsetY;

  // ... rest of animation and rendering code ...
};
```

---

### 5. 🟡 MEDIUM: Unused Images in UI

**Problem:** Images 5-7 show the UI with many AI-generated images that weren't used in the final video (because B-roll video was used instead).

**Root Cause:** AI images are generated for ALL scenes, then B-roll videos replace some of them. The unused images still show in the UI.

**Solutions:**

#### Option A: Show which asset is actually used
```tsx
// In the scene preview component
const ScenePreviewCard = ({ scene }) => {
  const usesVideo = scene.background?.type === 'video' && scene.assets?.videoUrl;
  const usesAIImage = scene.assets?.imageUrl && !usesVideo;
  
  return (
    <div className="scene-card">
      <div className="preview-image">
        {usesVideo ? (
          <>
            <video src={scene.assets.videoUrl} muted />
            <span className="badge video">🎬 B-Roll Video</span>
          </>
        ) : usesAIImage ? (
          <>
            <img src={scene.assets.imageUrl} />
            <span className="badge ai">🎨 AI Background</span>
          </>
        ) : (
          <div className="gradient-placeholder" />
        )}
      </div>
    </div>
  );
};
```

#### Option B: Don't generate AI images for scenes that will use video
```typescript
// In generateProjectAssets, skip AI image generation for video-prioritized scenes
const videoSceneTypes = ['hook', 'benefit', 'story', 'testimonial'];

for (let i = 0; i < project.scenes.length; i++) {
  const scene = project.scenes[i];
  
  // For scenes that will likely get B-roll, skip AI image generation
  if (videoSceneTypes.includes(scene.type)) {
    console.log(`[UniversalVideoService] Scene ${i} (${scene.type}) - skipping AI image, will use B-roll`);
    continue;
  }
  
  // Generate AI images only for non-video scenes
  // ...
}
```

---

## 6. 🟢 NEW FEATURE: Scene/Asset Regeneration

**User Request:** Allow regenerating individual scenes, images, videos, and music after seeing results.

### API Endpoints Needed

```typescript
// In your routes file

// Regenerate just the image for one scene
POST /api/video-projects/:projectId/scenes/:sceneId/regenerate-image
Body: { prompt?: string }  // Optional custom prompt

// Regenerate B-roll video for one scene  
POST /api/video-projects/:projectId/scenes/:sceneId/regenerate-video
Body: { searchQuery?: string }  // Optional custom search

// Regenerate voiceover for entire project or single scene
POST /api/video-projects/:projectId/regenerate-voiceover
Body: { 
  sceneId?: string,  // If provided, regenerate only this scene
  voiceId?: string   // Optional different voice
}

// Regenerate background music
POST /api/video-projects/:projectId/regenerate-music
Body: { 
  style?: string,
  duration?: number 
}

// Update product overlay position for a scene
PATCH /api/video-projects/:projectId/scenes/:sceneId/product-overlay
Body: {
  position: { x, y, scale, animation, offsetX, offsetY }
}
```

### Service Methods

```typescript
// In universal-video-service.ts

async regenerateSceneImage(
  project: VideoProject, 
  sceneId: string, 
  customPrompt?: string
): Promise<{ success: boolean; newImageUrl?: string; error?: string }> {
  const sceneIndex = project.scenes.findIndex(s => s.id === sceneId);
  if (sceneIndex < 0) {
    return { success: false, error: 'Scene not found' };
  }
  
  const scene = project.scenes[sceneIndex];
  const prompt = customPrompt || scene.visualDirection || scene.background.source;
  
  console.log(`[UniversalVideoService] Regenerating image for scene ${sceneId}: ${prompt}`);
  
  const result = await this.generateImage(prompt, sceneId);
  
  if (result.success) {
    return { success: true, newImageUrl: result.url };
  }
  
  return { success: false, error: result.error };
}

async regenerateSceneVideo(
  project: VideoProject,
  sceneId: string,
  customQuery?: string
): Promise<{ success: boolean; newVideoUrl?: string; error?: string }> {
  const sceneIndex = project.scenes.findIndex(s => s.id === sceneId);
  if (sceneIndex < 0) {
    return { success: false, error: 'Scene not found' };
  }
  
  const scene = project.scenes[sceneIndex];
  const query = customQuery || this.buildVideoSearchQuery(scene, project.targetAudience);
  
  console.log(`[UniversalVideoService] Regenerating video for scene ${sceneId}: ${query}`);
  
  const result = await this.getStockVideo(query);
  
  if (result) {
    return { success: true, newVideoUrl: result.url };
  }
  
  return { success: false, error: 'No suitable video found' };
}

async updateProductOverlayPosition(
  project: VideoProject,
  sceneId: string,
  position: ProductOverlayPosition
): Promise<{ success: boolean }> {
  const sceneIndex = project.scenes.findIndex(s => s.id === sceneId);
  if (sceneIndex < 0) {
    return { success: false };
  }
  
  if (!project.scenes[sceneIndex].assets) {
    project.scenes[sceneIndex].assets = {};
  }
  
  project.scenes[sceneIndex].assets!.productOverlayPosition = position;
  
  return { success: true };
}
```

### Frontend UI Components

```tsx
// SceneEditor component for regeneration controls

const SceneEditor: React.FC<{ scene: Scene; onUpdate: (scene: Scene) => void }> = ({ scene, onUpdate }) => {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  
  const handleRegenerateImage = async () => {
    setIsRegenerating(true);
    const result = await api.regenerateSceneImage(projectId, scene.id, customPrompt || undefined);
    if (result.success) {
      onUpdate({ ...scene, assets: { ...scene.assets, imageUrl: result.newImageUrl } });
    }
    setIsRegenerating(false);
  };
  
  const handleRegenerateVideo = async () => {
    setIsRegenerating(true);
    const result = await api.regenerateSceneVideo(projectId, scene.id);
    if (result.success) {
      onUpdate({ 
        ...scene, 
        assets: { ...scene.assets, videoUrl: result.newVideoUrl },
        background: { ...scene.background, type: 'video' }
      });
    }
    setIsRegenerating(false);
  };
  
  return (
    <div className="scene-editor">
      <div className="regenerate-controls">
        <button onClick={handleRegenerateImage} disabled={isRegenerating}>
          🔄 Regenerate Image
        </button>
        <button onClick={handleRegenerateVideo} disabled={isRegenerating}>
          🎬 Find Different Video
        </button>
      </div>
      
      <input 
        type="text"
        placeholder="Custom prompt (optional)"
        value={customPrompt}
        onChange={(e) => setCustomPrompt(e.target.value)}
      />
      
      {/* Product overlay position controls */}
      {scene.assets?.useProductOverlay && (
        <ProductPositionEditor 
          position={scene.assets.productOverlayPosition}
          onUpdate={(pos) => onUpdate({ 
            ...scene, 
            assets: { ...scene.assets, productOverlayPosition: pos } 
          })}
        />
      )}
    </div>
  );
};

// Product position editor with visual controls
const ProductPositionEditor: React.FC<{
  position: ProductOverlayPosition;
  onUpdate: (position: ProductOverlayPosition) => void;
}> = ({ position, onUpdate }) => {
  return (
    <div className="product-position-editor">
      <h4>Product Position</h4>
      
      <div className="position-grid">
        {/* 3x3 grid for position selection */}
        {['top', 'center', 'bottom'].map(y => (
          <div key={y} className="position-row">
            {['left', 'center', 'right'].map(x => (
              <button
                key={`${x}-${y}`}
                className={position.x === x && position.y === y ? 'active' : ''}
                onClick={() => onUpdate({ ...position, x, y })}
              >
                {x === 'center' && y === 'center' ? '●' : '○'}
              </button>
            ))}
          </div>
        ))}
      </div>
      
      <div className="sliders">
        <label>
          Size: {Math.round(position.scale * 100)}%
          <input 
            type="range" 
            min="10" max="80" 
            value={position.scale * 100}
            onChange={(e) => onUpdate({ ...position, scale: Number(e.target.value) / 100 })}
          />
        </label>
        
        <label>
          Animation:
          <select 
            value={position.animation || 'fade'}
            onChange={(e) => onUpdate({ ...position, animation: e.target.value as any })}
          >
            <option value="fade">Fade In</option>
            <option value="zoom">Zoom In</option>
            <option value="slide">Slide In</option>
            <option value="bounce">Bounce</option>
            <option value="none">None</option>
          </select>
        </label>
      </div>
    </div>
  );
};
```

---

## Implementation Priority

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| 1 | Wrong demographics in visuals | Medium | Critical - brand damage |
| 2 | Voiceover pronunciation | Low | High - professionalism |
| 3 | Duplicate text overlays | Low | High - visual quality |
| 4 | Product overlay positioning | Medium | High - visual quality |
| 5 | Unused images in UI | Low | Medium - UX clarity |
| 6 | Regeneration feature | High | High - user control |

---

## Quick Fix Prompt for Replit Agent

> "Please make these fixes to the video production tool:
> 
> **1. Fix demographics in B-roll search:**
> Update `buildVideoSearchQuery()` and `buildContentPrompt()` to include `targetAudience` parameter. For Black Cohosh (target: women 40-65), add 'mature middle-aged woman' to all search queries. Never show children or young people for menopause products.
> 
> **2. Fix voiceover pronunciation:**
> Add a `preprocessNarrationForTTS()` method that replaces difficult words with phonetic versions:
> - 'cohosh' → 'ko-hosh'
> - 'dong quai' → 'dong kway'
> - 'isoflavone' → 'eye-so-flay-vone'
> - 'formononetin' → 'for-mon-oh-net-in'
> 
> **3. Fix duplicate text overlays:**
> In UniversalVideoComposition.tsx SceneRenderer, ensure only ONE text component renders - either LowerThird OR TextOverlayComponent, never both for the same scene.
> 
> **4. Fix product overlay positions:**
> Update default positions to avoid center of frame:
> - hook/benefit scenes: bottom-right corner, scale 0.28
> - intro/cta scenes: center, scale 0.45
> - feature scenes: left side, scale 0.4
> 
> See the Phase 3 refinements document for detailed code."
