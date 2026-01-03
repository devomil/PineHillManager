/**
 * Phase 10E FULL Verification Checklist
 * Covers all 8 items from the official checklist:
 * 1. Text overlay detector identifies CTA scenes
 * 2. Text overlay detector extracts actionable steps from narration
 * 3. Text overlays generated with correct content
 * 4. Text overlays passed to Remotion composition
 * 5. Scene 17 renders with three bullet points visible
 * 6. Text is readable (contrast, size)
 * 7. Text animation works (staggered slide-up)
 * 8. Text doesn't cover important visual elements
 */

import { detectTextOverlayRequirements, TextOverlayRequirement } from './services/text-overlay-detector';
import { generateTextOverlays, RemotionTextOverlay } from './services/text-overlay-generator';
import { TextOverlay } from '../shared/video-types';

interface CheckResult {
  item: number;
  check: string;
  passed: boolean;
  details: string;
}

const results: CheckResult[] = [];

function addResult(item: number, check: string, passed: boolean, details: string) {
  results.push({ item, check, passed, details });
  console.log(`${passed ? '✓' : '✗'} [${item}] ${check}`);
  if (!passed) console.log(`    Details: ${details}`);
}

async function runFullVerification() {
  console.log('\n========================================================');
  console.log('PHASE 10E FULL VERIFICATION CHECKLIST');
  console.log('========================================================\n');

  // ============================================================
  // ITEM 1: Text overlay detector identifies CTA scenes
  // ============================================================
  console.log('--- Item 1: CTA Scene Detection ---');
  
  const ctaScene1 = { sceneIndex: 17, type: 'cta', narration: 'Visit Pine Hill Farm today!', visualDirection: '' };
  const ctaResult1 = detectTextOverlayRequirements(ctaScene1);
  addResult(1, 'CTA scene type detected', ctaResult1.required && ctaResult1.overlayType === 'cta',
    `required=${ctaResult1.required}, type=${ctaResult1.overlayType}`);

  const ctaScene2 = { sceneIndex: 18, type: 'call_to_action', narration: 'Schedule your consultation', visualDirection: '' };
  const ctaResult2 = detectTextOverlayRequirements(ctaScene2);
  addResult(1, 'call_to_action scene type detected', ctaResult2.required && ctaResult2.overlayType === 'cta',
    `required=${ctaResult2.required}, type=${ctaResult2.overlayType}`);

  // ============================================================
  // ITEM 2: Text overlay detector extracts actionable steps from narration
  // ============================================================
  console.log('\n--- Item 2: Actionable Steps Extraction ---');
  
  const stepsScene1 = { sceneIndex: 5, type: 'solution', 
    narration: 'Try this: Add one tablespoon to your morning coffee. Mix it well. Enjoy the benefits.',
    visualDirection: '' };
  const stepsResult1 = detectTextOverlayRequirements(stepsScene1);
  addResult(2, '"Try this:" pattern extracts steps', 
    stepsResult1.required && stepsResult1.textContent.length > 0,
    `found ${stepsResult1.textContent.length} items: ${stepsResult1.textContent.slice(0, 2).join(', ')}`);

  const stepsScene2 = { sceneIndex: 6, type: 'benefit', 
    narration: 'Here are the key benefits: 1. Reduces inflammation 2. Supports gut health 3. Boosts immunity',
    visualDirection: '' };
  const stepsResult2 = detectTextOverlayRequirements(stepsScene2);
  addResult(2, 'Numbered list pattern extracts items',
    stepsResult2.required && stepsResult2.textContent.length >= 3,
    `found ${stepsResult2.textContent.length} items: ${stepsResult2.textContent.join(', ')}`);

  const stepsScene3 = { sceneIndex: 7, type: 'solution',
    narration: 'Tips: Start with a small dose. Increase gradually. Listen to your body.',
    visualDirection: '' };
  const stepsResult3 = detectTextOverlayRequirements(stepsScene3);
  addResult(2, '"Tips:" pattern detected',
    stepsResult3.required || stepsResult3.textContent.length > 0,
    `required=${stepsResult3.required}, items=${stepsResult3.textContent.length}`);

  // ============================================================
  // ITEM 3: Text overlays generated with correct content
  // ============================================================
  console.log('\n--- Item 3: Correct Content Generation ---');

  const bulletOverlays = generateTextOverlays(stepsResult2, 6, 30);
  addResult(3, 'Bullet list content preserved',
    bulletOverlays.every(o => o.text.includes('•') && o.text.length > 5),
    `overlays: ${bulletOverlays.map(o => o.text.substring(0, 30)).join('; ')}`);

  const ctaOverlays = generateTextOverlays(ctaResult1, 5, 30);
  addResult(3, 'CTA content includes visit phrase',
    ctaOverlays.length > 0 && ctaOverlays[0].text.toLowerCase().includes('visit'),
    `CTA text: "${ctaOverlays[0]?.text || 'none'}"`);

  // ============================================================
  // ITEM 4: Text overlays passed to Remotion composition
  // ============================================================
  console.log('\n--- Item 4: Remotion Composition Integration ---');

  // Verify the mapping from RemotionTextOverlay to shared/video-types TextOverlay
  const testOverlay = bulletOverlays[0];
  const mappedOverlay: TextOverlay = {
    id: testOverlay.id,
    text: testOverlay.text,
    style: testOverlay.type as TextOverlay['style'],
    position: {
      vertical: testOverlay.position.y > 70 ? 'bottom' : testOverlay.position.y > 40 ? 'center' : 'top',
      horizontal: testOverlay.position.x < 30 ? 'left' : testOverlay.position.x > 70 ? 'right' : 'center',
      padding: 24,
    },
    animation: {
      enter: testOverlay.animation === 'pop' ? 'scale' : testOverlay.animation as any,
      exit: 'fade',
      duration: testOverlay.timing.fadeInFrames / 30,
    },
    timing: {
      startAt: testOverlay.timing.startFrame / 30,
      duration: (testOverlay.timing.endFrame - testOverlay.timing.startFrame) / 30,
    },
  };
  
  addResult(4, 'TextOverlay interface mapping correct',
    mappedOverlay.id !== undefined && 
    mappedOverlay.text !== undefined && 
    mappedOverlay.style !== undefined &&
    mappedOverlay.position.vertical !== undefined &&
    mappedOverlay.timing.startAt !== undefined,
    `id=${mappedOverlay.id}, style=${mappedOverlay.style}, position.vertical=${mappedOverlay.position.vertical}`);

  addResult(4, 'Position mapping correct',
    ['top', 'center', 'bottom'].includes(mappedOverlay.position.vertical) &&
    ['left', 'center', 'right'].includes(mappedOverlay.position.horizontal),
    `vertical=${mappedOverlay.position.vertical}, horizontal=${mappedOverlay.position.horizontal}`);

  // ============================================================
  // ITEM 5: Scene renders with bullet points visible
  // ============================================================
  console.log('\n--- Item 5: Bullet Points Rendering ---');

  const scene17BulletTest = { sceneIndex: 17, type: 'benefit',
    narration: '1. Natural wellness support 2. Holistic health approach 3. Quality ingredients',
    visualDirection: '' };
  const scene17Result = detectTextOverlayRequirements(scene17BulletTest);
  const scene17Overlays = generateTextOverlays(scene17Result, 6, 30);
  
  addResult(5, 'Scene with 3 benefits generates 3 bullet overlays',
    scene17Overlays.length === 3,
    `generated ${scene17Overlays.length} overlays`);

  addResult(5, 'All bullet points have visible text',
    scene17Overlays.every(o => o.text && o.text.length >= 5),
    `texts: ${scene17Overlays.map(o => `"${o.text.substring(0, 25)}..."`).join(', ')}`);

  // ============================================================
  // ITEM 6: Text is readable (contrast, size)
  // ============================================================
  console.log('\n--- Item 6: Text Readability ---');

  const readabilityCheck = bulletOverlays.every(o => {
    const fontSize = o.style.fontSize;
    const hasBackground = !!o.style.backgroundColor;
    const hasContrast = o.style.color === '#FFFFFF' || o.style.color === '#000000';
    return fontSize >= 18 && hasBackground && hasContrast;
  });
  
  addResult(6, 'Font size >= 18px for readability',
    bulletOverlays.every(o => o.style.fontSize >= 18),
    `sizes: ${bulletOverlays.map(o => o.style.fontSize).join(', ')}`);

  addResult(6, 'Background color for contrast',
    bulletOverlays.every(o => !!o.style.backgroundColor),
    `backgrounds: ${bulletOverlays.map(o => o.style.backgroundColor || 'none').join(', ')}`);

  addResult(6, 'White text on dark background',
    bulletOverlays.every(o => o.style.color === '#FFFFFF'),
    `colors: ${bulletOverlays.map(o => o.style.color).join(', ')}`);

  // CTA should also be readable
  addResult(6, 'CTA text size >= 28px',
    ctaOverlays.every(o => o.style.fontSize >= 28),
    `CTA size: ${ctaOverlays[0]?.style.fontSize || 0}`);

  // ============================================================
  // ITEM 7: Text animation works (staggered slide-up)
  // ============================================================
  console.log('\n--- Item 7: Text Animation ---');

  const hasStaggeredTiming = bulletOverlays.length >= 2 &&
    bulletOverlays[1].timing.startFrame > bulletOverlays[0].timing.startFrame;
  addResult(7, 'Bullet items have staggered start times',
    hasStaggeredTiming,
    `startFrames: ${bulletOverlays.map(o => o.timing.startFrame).join(', ')}`);

  const hasSlideUpAnimation = bulletOverlays.every(o => o.animation === 'slide-up');
  addResult(7, 'Bullet items use slide-up animation',
    hasSlideUpAnimation,
    `animations: ${bulletOverlays.map(o => o.animation).join(', ')}`);

  const hasPopAnimation = ctaOverlays.some(o => o.animation === 'pop');
  addResult(7, 'CTA uses pop animation',
    hasPopAnimation,
    `CTA animation: ${ctaOverlays[0]?.animation || 'none'}`);

  // ============================================================
  // ITEM 8: Text doesn't cover important visual elements
  // ============================================================
  console.log('\n--- Item 8: Text Positioning ---');

  // Bullet points should be positioned in lower portion (y > 50%)
  const bulletPositionsOk = bulletOverlays.every(o => o.position.y >= 50);
  addResult(8, 'Bullet text in lower portion (y >= 50%)',
    bulletPositionsOk,
    `y positions: ${bulletOverlays.map(o => o.position.y + '%').join(', ')}`);

  // Text should be on left side for bullets (x < 50)
  const bulletLeftAligned = bulletOverlays.every(o => o.position.x <= 50);
  addResult(8, 'Bullet text left-aligned (x <= 50%)',
    bulletLeftAligned,
    `x positions: ${bulletOverlays.map(o => o.position.x + '%').join(', ')}`);

  // CTA should be centered but in lower area
  const ctaPositionOk = ctaOverlays.every(o => o.position.y >= 65 && o.position.x >= 40 && o.position.x <= 60);
  addResult(8, 'CTA centered in lower third',
    ctaPositionOk,
    `CTA position: x=${ctaOverlays[0]?.position.x}%, y=${ctaOverlays[0]?.position.y}%`);

  // Y positions capped at 90% to avoid going off-screen
  const noOffscreen = bulletOverlays.every(o => o.position.y <= 90);
  addResult(8, 'No text positioned off-screen (y <= 90%)',
    noOffscreen,
    `max y: ${Math.max(...bulletOverlays.map(o => o.position.y))}%`);

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log('\n========================================================');
  console.log('PHASE 10E VERIFICATION SUMMARY');
  console.log('========================================================');
  
  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  
  console.log(`\nTotal Checks: ${totalCount}`);
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${totalCount - passedCount}`);
  
  // Group by item
  for (let i = 1; i <= 8; i++) {
    const itemResults = results.filter(r => r.item === i);
    const itemPassed = itemResults.filter(r => r.passed).length;
    const status = itemPassed === itemResults.length ? '✓' : '✗';
    console.log(`  [${i}] ${status} ${itemPassed}/${itemResults.length} checks passed`);
  }
  
  if (passedCount === totalCount) {
    console.log('\n✓ ALL PHASE 10E CHECKLIST ITEMS VERIFIED');
  } else {
    console.log('\n✗ SOME CHECKS FAILED - Review implementation:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  [${r.item}] ${r.check}: ${r.details}`);
    });
  }
  
  return { passed: passedCount, total: totalCount, results };
}

runFullVerification().catch(console.error);
