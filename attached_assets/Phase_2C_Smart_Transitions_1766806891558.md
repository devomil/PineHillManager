# Phase 2C: Smart Transitions & Ken Burns Effects

## Objective
Add intelligent motion effects based on scene analysis:
- Ken Burns effect that follows the focal point (not random zoom)
- Transitions that match content mood (dramatic = slower, upbeat = faster)
- Smooth scene-to-scene flow based on content type

## Prerequisites
- Phase 2A complete (scene analysis)
- Phase 2B complete (intelligent text placement)

## What Success Looks Like
- Ken Burns zooms toward faces/focal points, not away
- Transitions feel natural and match content mood
- No jarring cuts between mismatched scenes
- Professional broadcast quality motion

---

## Step 1: Extend Composition Instructions Service

Update `server/services/composition-instructions-service.ts`:

### Add new interfaces at the top:
```typescript
export interface KenBurnsInstruction {
  enabled: boolean;
  startScale: number;
  endScale: number;
  startPosition: { x: number; y: number };
  endPosition: { x: number; y: number };
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

export interface TransitionInstruction {
  type: 'fade' | 'crossfade' | 'dissolve' | 'wipe-left' | 'wipe-right' | 'zoom' | 'slide-left' | 'slide-right' | 'none';
  duration: number;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

// Update SceneCompositionInstructions:
export interface SceneCompositionInstructions {
  sceneId: string;
  textOverlays: TextOverlayInstruction[];
  productOverlay?: ProductOverlayInstruction;
  lowerThird?: {
    enabled: boolean;
    position: { y: number };
    style: { accentColor: string; backgroundColor: string };
  };
  kenBurns: KenBurnsInstruction;
  transitionIn: TransitionInstruction;
  transitionOut: TransitionInstruction;
}
```

### Add methods to the class:

```typescript
private calculateKenBurns(
  analysis: SceneAnalysis,
  sceneDuration: number
): KenBurnsInstruction {
  const focalPoint = analysis.composition.focalPoint;
  const hasFaces = analysis.faces.detected;
  const mood = analysis.mood;
  
  let zoomAmount = 0.08;
  if (mood === 'dramatic') zoomAmount = 0.12;
  else if (mood === 'positive') zoomAmount = 0.06;
  else if (analysis.contentType === 'product') zoomAmount = 0.10;
  
  const shouldZoomIn = hasFaces || analysis.contentType === 'person';
  
  let startScale: number, endScale: number;
  let startPosition: { x: number; y: number };
  let endPosition: { x: number; y: number };
  
  if (shouldZoomIn) {
    startScale = 1.0;
    endScale = 1.0 + zoomAmount;
    startPosition = { x: 50, y: 50 };
    endPosition = { x: focalPoint.x, y: focalPoint.y };
  } else {
    startScale = 1.0 + zoomAmount;
    endScale = 1.0;
    startPosition = { x: focalPoint.x, y: focalPoint.y };
    endPosition = { x: 50, y: 50 };
  }
  
  if (analysis.faces.count > 1 && analysis.faces.positions.length >= 2) {
    const first = analysis.faces.positions[0];
    const last = analysis.faces.positions[analysis.faces.positions.length - 1];
    startScale = 1.05;
    endScale = 1.05;
    startPosition = { x: first.x + first.width / 2, y: first.y + first.height / 2 };
    endPosition = { x: last.x + last.width / 2, y: last.y + last.height / 2 };
  }
  
  let easing: KenBurnsInstruction['easing'] = 'ease-in-out';
  if (mood === 'dramatic') easing = 'ease-out';
  else if (mood === 'positive') easing = 'linear';
  
  return { enabled: true, startScale, endScale, startPosition, endPosition, easing };
}

private calculateTransitions(
  analysis: SceneAnalysis,
  sceneType: string,
  isFirstScene: boolean,
  isLastScene: boolean,
  previousSceneMood?: string
): { transitionIn: TransitionInstruction; transitionOut: TransitionInstruction } {
  const mood = analysis.mood;
  
  let transitionIn: TransitionInstruction = { type: 'fade', duration: 0.5, easing: 'ease-out' };
  let transitionOut: TransitionInstruction = { type: 'fade', duration: 0.5, easing: 'ease-in' };
  
  if (isFirstScene) {
    transitionIn = { type: 'fade', duration: 0.8, easing: 'ease-out' };
  } else if (sceneType === 'hook') {
    transitionIn = { type: 'fade', duration: 0.3, easing: 'ease-out' };
  } else if (sceneType === 'cta') {
    transitionIn = { type: 'zoom', duration: 0.6, easing: 'ease-out' };
  } else if (mood === 'dramatic') {
    transitionIn = { type: 'crossfade', duration: 0.8, easing: 'ease-in-out' };
  } else if (mood === 'positive' && previousSceneMood === 'positive') {
    transitionIn = { type: 'dissolve', duration: 0.4, easing: 'linear' };
  } else if (analysis.contentType === 'product') {
    transitionIn = { type: 'zoom', duration: 0.5, easing: 'ease-out' };
  }
  
  if (isLastScene) {
    transitionOut = { type: 'fade', duration: 1.0, easing: 'ease-in' };
  } else if (mood === 'dramatic') {
    transitionOut = { type: 'crossfade', duration: 0.6, easing: 'ease-in' };
  }
  
  return { transitionIn, transitionOut };
}
```

### Update generateInstructions:

```typescript
generateInstructions(
  sceneId: string,
  textOverlays: Array<{ text: string; style?: string }>,
  analysis: SceneAnalysis | undefined,
  options: {
    useProductOverlay?: boolean;
    brandColor?: string;
    sceneType?: string;
    sceneDuration?: number;
    isFirstScene?: boolean;
    isLastScene?: boolean;
    previousSceneMood?: string;
  } = {}
): SceneCompositionInstructions {
  const safeAnalysis = analysis || this.getDefaultAnalysis();
  const sceneDuration = options.sceneDuration || 5;
  
  const kenBurns = this.calculateKenBurns(safeAnalysis, sceneDuration);
  const { transitionIn, transitionOut } = this.calculateTransitions(
    safeAnalysis,
    options.sceneType || 'explanation',
    options.isFirstScene || false,
    options.isLastScene || false,
    options.previousSceneMood
  );
  
  return {
    sceneId,
    textOverlays: this.positionTextOverlays(textOverlays, safeAnalysis, options),
    productOverlay: options.useProductOverlay ? this.positionProductOverlay(safeAnalysis) : undefined,
    kenBurns,
    transitionIn,
    transitionOut,
  };
}
```

---

## Step 2: Update Universal Video Service

In `server/services/universal-video-service.ts`, update the instruction generation:

```typescript
let previousSceneMood: string | undefined;

for (let i = 0; i < updatedProject.scenes.length; i++) {
  const scene = updatedProject.scenes[i];
  
  const instructions = compositionInstructionsService.generateInstructions(
    scene.id,
    scene.textOverlays || [],
    scene.analysis,
    {
      useProductOverlay: scene.assets?.useProductOverlay || false,
      brandColor: project.branding?.primaryColor || '#2D5A27',
      sceneType: scene.type,
      sceneDuration: scene.duration,
      isFirstScene: i === 0,
      isLastScene: i === updatedProject.scenes.length - 1,
      previousSceneMood,
    }
  );
  
  previousSceneMood = scene.analysis?.mood;
  updatedProject.scenes[i].compositionInstructions = instructions;
  
  console.log(`[Assets] Scene ${i + 1} motion:`, {
    kenBurns: `${instructions.kenBurns.startScale.toFixed(2)} → ${instructions.kenBurns.endScale.toFixed(2)}`,
    transitionIn: instructions.transitionIn.type,
    transitionOut: instructions.transitionOut.type,
  });
}
```

---

## Step 3: Update Remotion Components

In `remotion/UniversalVideoComposition.tsx`:

### Ken Burns component:
```tsx
const KenBurnsBackground: React.FC<{
  src: string;
  isVideo: boolean;
  instruction: KenBurnsInstruction;
  sceneDuration: number;
  fps: number;
}> = ({ src, isVideo, instruction, sceneDuration, fps }) => {
  const frame = useCurrentFrame();
  const totalFrames = sceneDuration * fps;
  
  let progress = frame / totalFrames;
  progress = applyEasing(progress, instruction.easing);
  
  const scale = interpolate(progress, [0, 1], [instruction.startScale, instruction.endScale], { extrapolateRight: 'clamp' });
  const translateX = interpolate(progress, [0, 1], [instruction.startPosition.x - 50, instruction.endPosition.x - 50], { extrapolateRight: 'clamp' });
  const translateY = interpolate(progress, [0, 1], [instruction.startPosition.y - 50, instruction.endPosition.y - 50], { extrapolateRight: 'clamp' });
  
  const style: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: `scale(${scale}) translate(${-translateX}%, ${-translateY}%)`,
    transformOrigin: 'center center',
  };
  
  return isVideo ? <OffthreadVideo src={src} style={style} /> : <Img src={src} style={style} />;
};

function applyEasing(t: number, easing: string): number {
  switch (easing) {
    case 'ease-in': return t * t;
    case 'ease-out': return t * (2 - t);
    case 'ease-in-out': return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    default: return t;
  }
}
```

### Transition wrapper:
```tsx
const SceneTransition: React.FC<{
  children: React.ReactNode;
  transitionIn: TransitionInstruction;
  transitionOut: TransitionInstruction;
  sceneDuration: number;
  fps: number;
}> = ({ children, transitionIn, transitionOut, sceneDuration, fps }) => {
  const frame = useCurrentFrame();
  const totalFrames = sceneDuration * fps;
  const inFrames = transitionIn.duration * fps;
  const outFrames = transitionOut.duration * fps;
  
  let opacity = 1;
  let transform = '';
  
  if (['fade', 'crossfade', 'dissolve'].includes(transitionIn.type) && frame < inFrames) {
    opacity = frame / inFrames;
  }
  if (['fade', 'crossfade', 'dissolve'].includes(transitionOut.type) && frame > totalFrames - outFrames) {
    opacity = Math.min(opacity, (totalFrames - frame) / outFrames);
  }
  
  if (transitionIn.type === 'zoom' && frame < inFrames) {
    const p = applyEasing(frame / inFrames, transitionIn.easing);
    transform = `scale(${1.2 - p * 0.2})`;
  }
  
  return <AbsoluteFill style={{ opacity, transform: transform || undefined }}>{children}</AbsoluteFill>;
};
```

---

## Verification Checklist

- [ ] Ken Burns instructions generated with focal point data
- [ ] Transitions match mood (dramatic = slower)
- [ ] First scene fades from black
- [ ] Last scene fades to black
- [ ] Face scenes zoom toward faces
- [ ] Easing functions applied correctly
- [ ] No jarring cuts between scenes

---

## Troubleshooting

**Ken Burns wrong direction:** Check shouldZoomIn logic and focalPoint values
**Transitions too fast:** Increase duration values
**Scale looks wrong:** Verify transform-origin is center

---

## Next Phase

Proceed to **Phase 3: Quality Evaluation Loop** for automated output review.
