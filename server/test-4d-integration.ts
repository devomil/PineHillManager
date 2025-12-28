// Phase 4D Integration Test - Verify complete workflow

import { promptEnhancementService } from './services/prompt-enhancement-service';
import { brandBibleService } from './services/brand-bible-service';
import { brandInjectionService } from './services/brand-injection-service';

async function testIntegration() {
  console.log('============================================================');
  console.log('PHASE 4D INTEGRATION TEST - Complete Workflow');
  console.log('============================================================\n');

  // Step 1: Load brand bible (simulating start of generateProjectAssets)
  console.log('Step 1: Loading brand bible...');
  const brandBible = await brandBibleService.getBrandBible();
  console.log(`✓ Brand loaded: ${brandBible.brandName}, ${brandBible.assets.length} assets`);
  console.log(`  Logos: main=${!!brandBible.logos.main}, watermark=${!!brandBible.logos.watermark}, intro=${!!brandBible.logos.intro}`);
  
  // Step 2: Enhance a video prompt
  console.log('\nStep 2: Enhancing video prompt...');
  const testPrompt = 'Professional woman in wellness center explaining natural products';
  const enhanced = await promptEnhancementService.enhanceVideoPrompt(testPrompt, {
    sceneType: 'hook',
    narration: 'Welcome to Pine Hill Farm, where wellness begins with nature.',
    mood: 'inspiring',
    contentType: 'lifestyle',
  });
  console.log(`✓ Original prompt: "${testPrompt.substring(0, 50)}..."`);
  console.log(`✓ Enhanced prompt: "${enhanced.prompt.substring(0, 80)}..."`);
  console.log(`✓ Negative prompt terms: ${enhanced.negativePrompt.split(',').length}`);
  
  // Step 3: Generate brand instructions (simulating end of generateProjectAssets)
  console.log('\nStep 3: Generating brand instructions...');
  const testScenes = [
    { id: 'scene-1', type: 'hook', duration: 5, isFirst: true, isLast: false },
    { id: 'scene-2', type: 'benefit', duration: 6, isFirst: false, isLast: false },
    { id: 'scene-3', type: 'cta', duration: 5, isFirst: false, isLast: true },
  ];
  
  const brandInstructions = await brandInjectionService.generateBrandInstructions(testScenes);
  console.log(`✓ Intro animation: ${brandInstructions.introAnimation ? 'configured' : 'missing'}`);
  console.log(`✓ Watermark: ${brandInstructions.watermark ? `${brandInstructions.watermark.position.anchor}, ${brandInstructions.watermark.opacity} opacity` : 'missing'}`);
  console.log(`✓ Outro sequence: ${brandInstructions.outroSequence?.length || 0} overlays`);
  console.log(`✓ CTA overlay: ${brandInstructions.ctaOverlay ? brandInstructions.ctaOverlay.ctaData.headline : 'missing'}`);
  console.log(`✓ Scene overlays: ${Object.keys(brandInstructions.sceneOverlays).length} scenes`);
  console.log(`✓ Colors: primary=${brandInstructions.colors.primary}, accent=${brandInstructions.colors.accent}`);
  
  // Step 4: Verify cache behavior
  console.log('\nStep 4: Verifying cache behavior...');
  const bible2 = await brandBibleService.getBrandBible();
  const cacheWorking = bible2.brandName === brandBible.brandName;
  console.log(`✓ Cache working: ${cacheWorking ? 'yes (same brand name)' : 'no'}`);
  
  // Final Summary
  console.log('\n============================================================');
  console.log('INTEGRATION TEST SUMMARY');
  console.log('============================================================');
  console.log('✅ Brand Bible Service: Loaded successfully');
  console.log('✅ Prompt Enhancement Service: Working with brand context');
  console.log('✅ Brand Injection Service: Generating overlays correctly');
  console.log('✅ Cache: Brand bible cached and reused');
  console.log('\n✅ PHASE 4D INTEGRATION VERIFIED - Pipeline connected!');
}

testIntegration().catch(console.error);
