# Phase 11: Overlay System & Brand Asset Integration

## Purpose

AI image/video generators are creating text and logos INSIDE the generated assets, which results in:
- Unreadable, garbled text
- Fake "mock" logos instead of real brand assets
- Duplicate text (AI text + Remotion overlay)
- No control over text styling or positioning

This phase implements a proper overlay system where:
- AI generates ONLY the background visual (no text, no logos)
- Text overlays are added via Remotion (controllable, editable)
- Real brand logos are injected from the asset library
- Watermarks are applied consistently

Additionally, this phase addresses how Brand Media and Asset Library sources work with animation.

## Current Problems

### Problem 1: AI-Generated Text is Broken
**Screenshot showing "Autoimmune / Mold/Mycotoxins":**
- Text is baked into the AI image
- Overlapping, hard to read
- Wrong font, wrong styling
- Cannot be edited after generation

**Solution:** Tell AI providers to NOT include text, add text via Remotion overlays.

### Problem 2: Mock Logos in AI Images
**Screenshot showing "Pine Hill Farm / Book Now":**
- AI generated a fake logo
- Doesn't match real Pine Hill Farm branding
- "Book Now" button is part of the image (not clickable, not real)

**Solution:** Tell AI to generate scene WITHOUT logo, inject real logo via brand asset system.

### Problem 3: No Overlay Controls in UI
Currently missing:
- Text overlay editor (add/edit/remove text)
- Logo position/size controls
- Watermark toggle and settings
- Lower-third configuration

### Problem 4: Brand Media Animation
When user selects "Brand Media" or "Asset Library":
- Static images need animation (Ken Burns, zoom, pan)
- Videos may need trimming/looping
- Need smooth transitions

## Phase 11 Sub-Phases

### Phase 11A: AI Prompt Sanitization
- Strip text/logo requests from AI prompts
- Add "no text, no logos, no overlays" to all generation prompts
- Ensure clean background visuals

### Phase 11B: Remotion Overlay System
- Text overlay component with positioning
- Logo injection at configurable positions
- Watermark layer (corner, opacity, size)
- Lower-third graphics for names/titles

### Phase 11C: Overlay UI Controls
- Scene editor gets "Overlays" tab
- Add/edit/remove text overlays
- Configure logo appearance
- Toggle watermark on/off
- Preview overlays in real-time

### Phase 11D: Brand Media Animation
- Ken Burns effect for static images
- Zoom, pan, parallax options
- Video trimming/looping
- Transition integration

### Phase 11E: Asset Library Integration
- Browse previously generated assets
- Re-use successful scenes
- Favorite/organize assets
- Quick insert into new projects

## Expected Results

### Before (Current):
```
AI generates: Image with garbled "Autoimmune" text baked in
Result: Uneditable, unprofessional text
```

### After (Phase 11):
```
AI generates: Clean background image (no text)
Remotion adds: Properly styled "Autoimmune" text overlay
Result: Editable, professional, consistent branding
```

## Files to Create/Modify

```
server/services/
├── prompt-sanitizer.ts           # 11A - Remove text/logo from prompts
├── overlay-generator.ts          # 11B - Generate overlay configurations
└── brand-asset-animator.ts       # 11D - Animate static assets

client/src/components/
├── overlay-editor.tsx            # 11C - UI for editing overlays
├── text-overlay-controls.tsx     # 11C - Text overlay settings
├── logo-controls.tsx             # 11C - Logo position/size
├── watermark-controls.tsx        # 11C - Watermark settings
└── asset-browser.tsx             # 11E - Browse asset library

remotion/components/
├── TextOverlay.tsx               # 11B - Remotion text component
├── LogoOverlay.tsx               # 11B - Remotion logo component
├── WatermarkOverlay.tsx          # 11B - Remotion watermark component
├── LowerThird.tsx                # 11B - Name/title graphics
└── KenBurnsImage.tsx             # 11D - Animated static images
```

## Implementation Priority

1. **Phase 11A** (Critical) - Stop AI from generating text/logos
2. **Phase 11B** (Critical) - Build Remotion overlay components
3. **Phase 11C** (High) - Add UI controls for overlays
4. **Phase 11D** (Medium) - Animate brand media
5. **Phase 11E** (Medium) - Asset library improvements

## Success Criteria

- [ ] AI-generated images contain NO text or logos
- [ ] Text overlays added via Remotion are readable and editable
- [ ] Real Pine Hill Farm logo appears (not AI-generated mock)
- [ ] Watermark appears in corner with correct opacity
- [ ] Brand media images have Ken Burns animation
- [ ] Asset library allows re-using previous assets
- [ ] Scene preview shows overlays in real-time
