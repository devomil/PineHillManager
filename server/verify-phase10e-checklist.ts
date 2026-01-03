/**
 * Phase 10E Verification Checklist: Smart Text Overlay Restoration
 * 
 * This script verifies that Phase 10E text overlay detection and generation
 * is properly integrated into the video production pipeline.
 */

import { detectTextOverlayRequirements, TextOverlayRequirement } from './services/text-overlay-detector';
import { generateTextOverlays, RemotionTextOverlay } from './services/text-overlay-generator';

interface CheckResult {
  check: string;
  passed: boolean;
  details: string;
}

const results: CheckResult[] = [];

function addResult(check: string, passed: boolean, details: string) {
  results.push({ check, passed, details });
  console.log(`${passed ? '✓' : '✗'} ${check}`);
  if (!passed) console.log(`  Details: ${details}`);
}

async function runVerification() {
  console.log('\n=== PHASE 10E VERIFICATION: Smart Text Overlay Restoration ===\n');

  // 1. Test CTA scene detection - must have full visit phrase (not truncated)
  const ctaScene = {
    sceneIndex: 5,
    visualDirection: 'Show the product with "Visit pinehillfarm.co" call to action',
    narration: 'Visit Pine Hill Farm today for your wellness journey',
    type: 'cta' as const,
  };
  const ctaResult = detectTextOverlayRequirements(ctaScene);
  const ctaHasFullPhrase = ctaResult.textContent.some(t => t.toLowerCase().includes('pine hill farm'));
  addResult(
    '1. CTA scene detection with full Visit phrase',
    ctaResult.required && ctaResult.overlayType === 'cta' && ctaHasFullPhrase,
    `required=${ctaResult.required}, type=${ctaResult.overlayType}, content="${ctaResult.textContent[0] || 'none'}"`
  );

  // 2. Test bullet list detection from narration
  const bulletScene = {
    sceneIndex: 2,
    visualDirection: 'Professional wellness imagery',
    narration: 'Here are the key benefits: 1. Reduces inflammation 2. Supports gut health 3. Boosts immunity',
    type: 'benefit' as const,
  };
  const bulletResult = detectTextOverlayRequirements(bulletScene);
  addResult(
    '2. Bullet list detection from numbered items',
    bulletResult.required && bulletResult.overlayType === 'bullet_list' && bulletResult.textContent.length >= 3,
    `required=${bulletResult.required}, type=${bulletResult.overlayType}, items=${bulletResult.textContent.length}`
  );

  // 3. Test "try this" pattern detection
  const tryThisScene = {
    sceneIndex: 3,
    visualDirection: 'Morning routine',
    narration: 'Try this: Add one tablespoon to your morning coffee for sustained energy',
    type: 'solution' as const,
  };
  const tryResult = detectTextOverlayRequirements(tryThisScene);
  addResult(
    '3. "Try this:" pattern detection',
    tryResult.required && tryResult.textContent.length > 0,
    `required=${tryResult.required}, source=${tryResult.source}, content="${tryResult.textContent[0] || 'none'}"`
  );

  // 4. Test visual direction with "text overlay" pattern - MUST have non-empty textContent
  const showTextScene = {
    sceneIndex: 4,
    visualDirection: 'Text overlay with "30 Day Money Back Guarantee" prominently displayed',
    narration: 'We stand behind our products with a full satisfaction guarantee',
    type: 'proof' as const,
  };
  const showResult = detectTextOverlayRequirements(showTextScene);
  addResult(
    '4. "Text overlay" visual direction detection with quoted content',
    showResult.required && showResult.source === 'visual_direction' && showResult.textContent.length > 0,
    `required=${showResult.required}, source=${showResult.source}, content="${showResult.textContent[0] || 'EMPTY - FAIL'}"`
  );

  // 5. Test text overlay generation from CTA requirement
  const ctaOverlays = generateTextOverlays(ctaResult, 5, 30);
  addResult(
    '5. CTA overlay generation',
    ctaOverlays.length > 0,
    `Generated ${ctaOverlays.length} overlays, first type: ${ctaOverlays[0]?.type || 'none'}`
  );

  // 6. Test bullet list overlay generation with staggered timing
  const bulletOverlays = generateTextOverlays(bulletResult, 6, 30);
  const hasStaggeredTiming = bulletOverlays.length > 1 && 
    bulletOverlays[1].timing.startFrame > bulletOverlays[0].timing.startFrame;
  addResult(
    '6. Bullet list staggered animation',
    bulletOverlays.length >= 3 && hasStaggeredTiming,
    `Overlays=${bulletOverlays.length}, staggered=${hasStaggeredTiming}`
  );

  // 7. Test overlay positioning
  const hasCorrectPositioning = ctaOverlays.every(o => 
    o.position.x >= 0 && o.position.x <= 100 && 
    o.position.y >= 0 && o.position.y <= 100
  );
  addResult(
    '7. Overlay positioning within bounds (0-100%)',
    hasCorrectPositioning,
    `All overlays have valid positioning`
  );

  // 8. Test animation types
  const validAnimations = ['fade', 'slide-up', 'pop'];
  const hasValidAnimations = ctaOverlays.every(o => validAnimations.includes(o.animation));
  addResult(
    '8. Valid animation types',
    hasValidAnimations,
    `Animations: ${ctaOverlays.map(o => o.animation).join(', ')}`
  );

  // 9. Test scene with no overlay requirement
  const noOverlayScene = {
    sceneIndex: 1,
    visualDirection: 'Beautiful nature landscape',
    narration: 'The serene beauty of nature.',
    type: 'hook' as const,
  };
  const noOverlayResult = detectTextOverlayRequirements(noOverlayScene);
  addResult(
    '9. Non-overlay scene correctly skipped',
    !noOverlayResult.required,
    `required=${noOverlayResult.required}`
  );

  // 10. Test overlay style consistency
  const hasConsistentStyles = bulletOverlays.every(o => 
    o.style.fontSize > 0 && 
    o.style.color &&
    o.style.fontWeight
  );
  addResult(
    '10. Consistent overlay styling',
    hasConsistentStyles,
    `All overlays have fontFamily, fontSize, and color`
  );

  // Summary
  console.log('\n=== PHASE 10E VERIFICATION SUMMARY ===');
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  console.log(`Passed: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('\n✓ ALL PHASE 10E CHECKS PASSED - Smart Text Overlay Restoration Complete');
  } else {
    console.log('\n✗ SOME CHECKS FAILED - Review implementation');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.check}: ${r.details}`);
    });
  }
  
  return { passed, total, results };
}

runVerification().catch(console.error);
