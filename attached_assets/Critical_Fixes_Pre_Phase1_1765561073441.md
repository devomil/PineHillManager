# Video Studio Critical Fixes (Pre-Phase 1)

## Overview

Before implementing the regeneration feature (Phase 1), these critical bugs must be fixed. They affect every video generated and will cause poor results if not addressed first.

**Priority Order:**
1. Wrong demographics in B-roll/images (shows children for menopause product)
2. Duplicate text overlays (same text appears twice)
3. Voiceover mispronunciation ("cohosh" and other health terms)
4. Product overlay positioning (blocks faces/subjects)

---

## Fix 1: Wrong Demographics in Search Queries

**Problem:** The video for Black Cohosh (target audience: women 40-65) showed a young girl (~8 years old) sleeping. The stock video/image search doesn't use the `targetAudience` field.

**File: `server/services/universal-video-service.ts`**

### Step 1A: Update `buildVideoSearchQuery` method

Find the `buildVideoSearchQuery` method and replace it with this version:

```typescript
private buildVideoSearchQuery(scene: Scene, targetAudience?: string): string {
  const narration = (scene.narration || '').toLowerCase();
  
  // Get demographic prefix based on target audience
  let demographicTerms = '';
  if (targetAudience) {
    const audience = targetAudience.toLowerCase();
    
    // Age-based keywords - CRITICAL for correct visuals
    if (audience.includes('40') || audience.includes('50') || audience.includes('60') || 
        audience.includes('mature') || audience.includes('middle') || audience.includes('menopause')) {
      demographicTerms = 'mature middle-aged adult ';
    } else if (audience.includes('senior') || audience.includes('elderly') || audience.includes('65+') || audience.includes('70')) {
      demographicTerms = 'senior elderly older adult ';
    } else if (audience.includes('young') || audience.includes('20') || audience.includes('millennial')) {
      demographicTerms = 'young adult ';
    }
    // Default to adult if no age specified (never show children for health products)
    if (!demographicTerms && (audience.includes('women') || audience.includes('men'))) {
      demographicTerms = 'adult ';
    }
    
    // Gender-based keywords
    if (audience.includes('women') || audience.includes('female') || audience.includes('woman')) {
      demographicTerms += 'woman female ';
    } else if (audience.includes('men') || audience.includes('male') || audience.includes('man')) {
      demographicTerms += 'man male ';
    }
  }
  
  // Health/wellness specific keywords WITH demographics
  if (narration.includes('menopause')) return `${demographicTerms}wellness relaxation health`;
  if (narration.includes('hot flash')) return `${demographicTerms}cooling relief comfort relaxed`;
  if (narration.includes('sleep') || narration.includes('restful')) return `${demographicTerms}peaceful sleep relaxation bedroom`;
  if (narration.includes('energy') || narration.includes('vitality')) return `${demographicTerms}active healthy lifestyle energetic`;
  if (narration.includes('hormone')) return `${demographicTerms}wellness nature botanical healthy`;
  if (narration.includes('natural') || narration.includes('herbal')) return `${demographicTerms}herbs botanical plants nature`;
  if (narration.includes('relief') || narration.includes('comfort')) return `${demographicTerms}relaxed peaceful happy comfortable`;
  if (narration.includes('stress') || narration.includes('anxiety')) return `${demographicTerms}calm meditation relaxation peaceful`;
  
  // Scene type defaults WITH demographics
  const defaults: Record<string, string> = {
    hook: `${demographicTerms}concerned thinking wellness health`,
    benefit: `${demographicTerms}happy smiling healthy lifestyle`,
    testimonial: `${demographicTerms}satisfied happy smiling portrait`,
    story: `${demographicTerms}transformation journey wellness`,
    intro: `${demographicTerms}wellness morning routine healthy`,
    cta: `${demographicTerms}confident smiling action positive`,
    feature: `${demographicTerms}healthy lifestyle wellness`,
    explanation: `${demographicTerms}learning understanding wellness`,
  };
  
  return defaults[scene.type] || `${demographicTerms}wellness healthy lifestyle`;
}
```

### Step 1B: Update `buildContentPrompt` method

Find the `buildContentPrompt` method and add demographic context at the beginning:

```typescript
private buildContentPrompt(scene: Scene, productName: string): string {
  const sceneType = scene.type;
  const visualDirection = scene.visualDirection || '';
  const narration = scene.narration || '';
  
  // ADDED: Get demographic context from scene or infer from product
  let demographicContext = '';
  const lowerNarration = narration.toLowerCase();
  const lowerProduct = productName.toLowerCase();
  
  // Infer demographics from product/narration content
  if (lowerProduct.includes('menopause') || lowerNarration.includes('menopause') ||
      lowerProduct.includes('hormone') || lowerNarration.includes('hot flash')) {
    demographicContext = 'mature woman in her 40s-60s, graceful confident, healthy glowing, ';
  } else if (lowerProduct.includes('senior') || lowerNarration.includes('elderly')) {
    demographicContext = 'senior woman, dignified healthy, active lifestyle, ';
  } else if (lowerNarration.includes('woman') || lowerNarration.includes('female') || lowerNarration.includes('women')) {
    demographicContext = 'adult woman, healthy natural, ';
  }
  
  let baseContext = '';
  
  switch (sceneType) {
    case 'hook':
      baseContext = `${demographicContext}Emotional cinematic scene showing the problem or challenge. Person experiencing discomfort or frustration. Realistic lifestyle photography, dramatic lighting, evocative mood.`;
      break;
    case 'benefit':
      baseContext = `${demographicContext}Positive transformation scene showing wellness and relief. Person feeling happy, healthy, and vibrant. Bright natural lighting, optimistic mood, lifestyle photography.`;
      break;
    case 'story':
      baseContext = `${demographicContext}Authentic storytelling scene with emotional depth. Real-life moment captured naturally. Documentary style, warm tones, genuine expression.`;
      break;
    case 'explanation':
    case 'process':
      baseContext = `${demographicContext}Educational visual showing scientific or natural process. Clean informational style, subtle medical/botanical elements, professional presentation.`;
      break;
    case 'testimonial':
    case 'social_proof':
      baseContext = `${demographicContext}Happy satisfied person in natural home or lifestyle setting. Genuine smile, warm inviting atmosphere, trustworthy and relatable.`;
      break;
    case 'problem':
      baseContext = `${demographicContext}Person dealing with challenge or discomfort. Empathetic perspective, muted colors, realistic portrayal of struggle before solution.`;
      break;
    default:
      baseContext = `${demographicContext}Professional lifestyle photography with natural lighting.`;
  }
  
  const extractedConcepts = this.extractVisualConcepts(visualDirection, narration);
  
  const fullPrompt = `${baseContext} ${extractedConcepts}. High quality, 4K, photorealistic, professional commercial photography. NO text, NO logos, NO product shots, NO bottles, NO packaging. IMPORTANT: Show ADULTS only, no children or teenagers.`;
  
  return fullPrompt;
}
```

### Step 1C: Update `extractVisualConcepts` method

Find the `extractVisualConcepts` method and update the age-related concepts:

```typescript
private extractVisualConcepts(visualDirection: string, narration: string): string {
  const combined = `${visualDirection} ${narration}`.toLowerCase();
  
  const concepts: string[] = [];
  
  // UPDATED: Specify adult/mature for menopause content
  if (combined.includes('menopause') || combined.includes('hot flash') || combined.includes('hormonal')) {
    concepts.push('mature woman in her 50s, wellness journey, natural health, serene confident expression');
  }
  // UPDATED: Specify adult for sleep content
  if (combined.includes('sleep') || combined.includes('restful') || combined.includes('night')) {
    concepts.push('adult peaceful sleep, comfortable bedroom, restful atmosphere');
  }
  if (combined.includes('energy') || combined.includes('vitality') || combined.includes('active')) {
    concepts.push('energetic adult, active lifestyle, vibrant health');
  }
  if (combined.includes('stress') || combined.includes('anxiety') || combined.includes('mood')) {
    concepts.push('calm relaxed adult, peaceful moment, stress relief');
  }
  if (combined.includes('natural') || combined.includes('herb') || combined.includes('botanical')) {
    concepts.push('natural herbs, botanical elements, organic wellness');
  }
  // UPDATED: Ensure woman means adult woman
  if (combined.includes('woman') || combined.includes('female') || combined.includes('her')) {
    concepts.push('adult woman in natural setting, feminine wellness');
  }
  if (combined.includes('science') || combined.includes('study') || combined.includes('research') || combined.includes('clinical')) {
    concepts.push('scientific visualization, research imagery, medical illustration style');
  }
  
  if (concepts.length === 0) {
    concepts.push('adult wellness lifestyle, healthy living, natural setting');
  }
  
  return concepts.join(', ');
}
```

---

## Fix 2: Duplicate Text Overlays

**Problem:** Text like "Targets Root Causes" appears twice - once centered and once in the lower-third position.

**File: `remotion/UniversalVideoComposition.tsx`**

Find the text overlay section in the `SceneRenderer` component (around line 730-760) and replace it with:

```tsx
{/* Text Overlays - ONLY ONE STYLE per scene to prevent duplicates */}
{(() => {
  // Determine which style to use based on scene type
  const useLowerThirdStyle = ['hook', 'benefit', 'feature', 'intro'].includes(scene.type);
  const primaryText = scene.textOverlays?.[0];
  
  // No text to display
  if (!primaryText?.text) {
    return null;
  }
  
  if (useLowerThirdStyle) {
    // Use ONLY LowerThird component for content scenes
    // DO NOT also render TextOverlayComponent - that causes duplicates
    return (
      <LowerThird
        title={primaryText.text.length > 50 ? primaryText.text.substring(0, 47) + '...' : primaryText.text}
        subtitle={scene.textOverlays?.[1]?.text}
        brand={brand}
        fps={fps}
        durationInFrames={durationInFrames}
      />
    );
  }
  
  // Use centered TextOverlayComponent ONLY for CTA, outro, and other scene types
  return (
    <>
      {(scene.textOverlays || []).map((overlay) => (
        <TextOverlayComponent
          key={overlay.id}
          overlay={overlay}
          brand={brand}
          sceneFrame={frame}
          fps={fps}
        />
      ))}
    </>
  );
})()}
```

**Important:** Make sure there are no other places in `SceneRenderer` that render `LowerThird` or `TextOverlayComponent`. Search the file for these component names and ensure they only appear in the section above.

---

## Fix 3: Voiceover Mispronunciation

**Problem:** ElevenLabs mispronounces specialty health terms like "cohosh" (should be "ko-HOSH").

**File: `server/services/universal-video-service.ts`**

### Step 3A: Add the pronunciation preprocessing method

Add this new method to the `UniversalVideoService` class:

```typescript
/**
 * Pre-process narration text to help TTS pronounce specialty words correctly
 * Uses phonetic hints that ElevenLabs can interpret better
 */
private preprocessNarrationForTTS(text: string): string {
  // Pronunciation dictionary for health/wellness terms
  // Format: exact word -> phonetic pronunciation
  const pronunciationMap: Record<string, string> = {
    // Herbs and supplements (case-sensitive entries)
    'cohosh': 'koh-hosh',
    'Cohosh': 'Koh-hosh',
    'ashwagandha': 'ahsh-wah-gahn-dah',
    'Ashwagandha': 'Ahsh-wah-gahn-dah',
    'chasteberry': 'chayst-berry',
    'Chasteberry': 'Chayst-berry',
    'dong quai': 'dong kway',
    'Dong Quai': 'Dong Kway',
    'Dong quai': 'Dong kway',
    
    // Scientific terms
    'isoflavone': 'eye-so-flay-vone',
    'isoflavones': 'eye-so-flay-vones',
    'Isoflavone': 'Eye-so-flay-vone',
    'Isoflavones': 'Eye-so-flay-vones',
    'phytoestrogen': 'fy-toe-ess-tro-jen',
    'phytoestrogens': 'fy-toe-ess-tro-jens',
    'Phytoestrogen': 'Fy-toe-ess-tro-jen',
    'formononetin': 'for-mon-oh-neh-tin',
    'Formononetin': 'For-mon-oh-neh-tin',
    
    // Medical terms
    'luteinizing': 'loo-tee-nize-ing',
    'Luteinizing': 'Loo-tee-nize-ing',
    'hypothalamus': 'hy-poh-thal-ah-mus',
    'Hypothalamus': 'Hy-poh-thal-ah-mus',
    'endocrine': 'en-doh-krin',
    'Endocrine': 'En-doh-krin',
    'bioavailable': 'by-oh-ah-vay-lah-bul',
    'Bioavailable': 'By-oh-ah-vay-lah-bul',
    'adaptogen': 'ah-dap-toh-jen',
    'Adaptogen': 'Ah-dap-toh-jen',
    'adaptogens': 'ah-dap-toh-jens',
    'Adaptogens': 'Ah-dap-toh-jens',
    
    // Brand/product names
    'PineHillFarm': 'Pine Hill Farm',
    'pinehillfarm': 'Pine Hill Farm',
    'Pinehillfarm': 'Pine Hill Farm',
  };
  
  let processedText = text;
  
  // Replace each word with its phonetic version
  // Process longer phrases first to avoid partial replacements
  const sortedKeys = Object.keys(pronunciationMap).sort((a, b) => b.length - a.length);
  
  for (const word of sortedKeys) {
    const phonetic = pronunciationMap[word];
    // Use word boundary matching to avoid partial replacements
    const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
    processedText = processedText.replace(regex, phonetic);
  }
  
  return processedText;
}
```

### Step 3B: Update the `generateVoiceover` method

Find the `generateVoiceover` method and add the preprocessing call near the beginning:

```typescript
async generateVoiceover(
  text: string, 
  voiceId?: string,
  options?: {
    stability?: number;
    similarityBoost?: number;
    style?: number;
  }
): Promise<VoiceoverResult> {
  const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
  if (!elevenLabsKey) {
    // ... existing error handling ...
  }

  // ADD THIS: Preprocess text for better pronunciation
  const processedText = this.preprocessNarrationForTTS(text);
  console.log(`[UniversalVideoService] Original text length: ${text.length}`);
  console.log(`[UniversalVideoService] Processed text sample: ${processedText.substring(0, 150)}...`);

  const selectedVoiceId = voiceId || '21m00Tcm4TlvDq8ikWAM';
  
  // ... rest of existing code, but use processedText instead of text ...
  
  // CHANGE THIS LINE (around line where fetch body is created):
  // FROM: text,
  // TO: text: processedText,
  
  body: JSON.stringify({
    text: processedText,  // <-- Use processedText here instead of text
    model_id: "eleven_multilingual_v2",
    voice_settings: voiceSettings,
  }),
```

---

## Fix 4: Product Overlay Positioning

**Problem:** Product bottle overlays can appear over people's faces because the default positions are centered.

**File: `server/services/universal-video-service.ts`**

Find the `getProductOverlayPosition` method and replace it with:

```typescript
private getProductOverlayPosition(sceneType: string): { 
  x: 'left' | 'center' | 'right'; 
  y: 'top' | 'center' | 'bottom'; 
  scale: number; 
  animation: 'fade' | 'zoom' | 'slide' | 'none' 
} {
  // UPDATED: Position products in corners/edges to avoid blocking faces
  switch (sceneType) {
    case 'hook':
      // Bottom-right corner, smaller, unobtrusive
      return { x: 'right', y: 'bottom', scale: 0.28, animation: 'fade' };
    case 'intro':
      // Center but with empty background (AI generates product-free bg)
      return { x: 'center', y: 'center', scale: 0.45, animation: 'zoom' };
    case 'feature':
      // Left side, medium size, away from typical subject position
      return { x: 'left', y: 'bottom', scale: 0.35, animation: 'slide' };
    case 'benefit':
      // Bottom-right corner, subtle presence
      return { x: 'right', y: 'bottom', scale: 0.25, animation: 'fade' };
    case 'cta':
      // Center for call-to-action (background should be product-focused anyway)
      return { x: 'center', y: 'center', scale: 0.5, animation: 'zoom' };
    case 'testimonial':
      // Bottom-left, very small, doesn't distract from person
      return { x: 'left', y: 'bottom', scale: 0.22, animation: 'fade' };
    default:
      // Default to bottom-right corner
      return { x: 'right', y: 'bottom', scale: 0.28, animation: 'fade' };
  }
}
```

---

## Testing Checklist

After applying all fixes, test with a new video generation:

### Demographics Fix
- [ ] Generate a video for Black Cohosh (target: women 40-65)
- [ ] All B-roll videos show mature adult women (no children/teens)
- [ ] AI-generated images show age-appropriate subjects
- [ ] Check server logs for demographic prefixes in search queries

### Duplicate Text Fix
- [ ] Watch rendered video - each scene has ONE text element (not two)
- [ ] Lower-third style appears for hook/benefit/feature/intro scenes
- [ ] Centered text appears only for CTA/outro scenes

### Pronunciation Fix
- [ ] Listen to voiceover - "cohosh" pronounced as "ko-HOSH"
- [ ] Other health terms pronounced correctly
- [ ] Check server logs for "Processed text sample" to verify substitutions

### Product Positioning Fix
- [ ] Product overlays appear in corners (not center of frame)
- [ ] Products don't block faces or main subjects in B-roll
- [ ] CTA scene still has centered product (acceptable for that scene type)

---

## Summary of Changes

| File | Changes |
|------|---------|
| `universal-video-service.ts` | Updated `buildVideoSearchQuery()` to include demographics |
| `universal-video-service.ts` | Updated `buildContentPrompt()` to include demographics |
| `universal-video-service.ts` | Updated `extractVisualConcepts()` for adult context |
| `universal-video-service.ts` | Added `preprocessNarrationForTTS()` method |
| `universal-video-service.ts` | Updated `generateVoiceover()` to use preprocessing |
| `universal-video-service.ts` | Updated `getProductOverlayPosition()` for corner placement |
| `UniversalVideoComposition.tsx` | Fixed text overlay section to prevent duplicates |

---

## Next Steps

Once these critical fixes are verified:
1. ✅ Critical fixes complete
2. → Proceed to **Phase 1: Core Regeneration** (separate document)
3. → Then Phase 2, 3, 4...

**Please confirm when these fixes are implemented and tested, then I will proceed with Phase 1.**
