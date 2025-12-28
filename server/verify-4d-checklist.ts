// Phase 4D Verification Checklist - Pipeline Integration

import fs from 'fs';

async function verifyChecklist() {
  console.log('============================================================');
  console.log('PHASE 4D VERIFICATION CHECKLIST - Pipeline Integration');
  console.log('============================================================\n');

  const results: string[] = [];

  // 1. ai-video-service.ts imports promptEnhancementService
  const aiVideoContent = fs.readFileSync('./server/services/ai-video-service.ts', 'utf-8');
  const hasPromptEnhanceImport = aiVideoContent.includes("import { promptEnhancementService }");
  results.push(`[${hasPromptEnhanceImport ? '✅' : '❌'}] ai-video-service.ts imports promptEnhancementService`);
  console.log(results[results.length - 1]);

  // 2. ai-video-service.ts uses promptEnhancementService.enhanceVideoPrompt
  const usesEnhancePrompt = aiVideoContent.includes("promptEnhancementService.enhanceVideoPrompt");
  results.push(`[${usesEnhancePrompt ? '✅' : '❌'}] ai-video-service.ts uses enhanceVideoPrompt()`);
  console.log(results[results.length - 1]);

  // 3. ai-video-service.ts has narration and mood in interface
  const hasNarration = aiVideoContent.includes("narration?: string");
  const hasMood = aiVideoContent.includes("mood?: string");
  results.push(`[${hasNarration && hasMood ? '✅' : '❌'}] ai-video-service.ts interface has narration and mood fields`);
  console.log(results[results.length - 1]);

  // 4. runway-video-service.ts passes negativePromptText
  const runwayContent = fs.readFileSync('./server/services/runway-video-service.ts', 'utf-8');
  const hasNegativePromptText = runwayContent.includes("negativePromptText:");
  results.push(`[${hasNegativePromptText ? '✅' : '❌'}] runway-video-service.ts passes negativePromptText to API`);
  console.log(results[results.length - 1]);

  // 5. runway-video-service.ts logs negative prompt
  const logsNegativePrompt = runwayContent.includes('[Runway] Negative prompt applied');
  results.push(`[${logsNegativePrompt ? '✅' : '❌'}] runway-video-service.ts logs negative prompt application`);
  console.log(results[results.length - 1]);

  // 6. piapi-video-service.ts passes negative_prompt
  const piapiContent = fs.readFileSync('./server/services/piapi-video-service.ts', 'utf-8');
  const hasNegativePromptPiAPI = piapiContent.includes("negative_prompt:");
  results.push(`[${hasNegativePromptPiAPI ? '✅' : '❌'}] piapi-video-service.ts passes negative_prompt to API`);
  console.log(results[results.length - 1]);

  // 7. universal-video-service.ts imports brand services
  const universalContent = fs.readFileSync('./server/services/universal-video-service.ts', 'utf-8');
  const hasBrandBibleImport = universalContent.includes("import { brandBibleService }");
  const hasBrandInjectImport = universalContent.includes("import { brandInjectionService");
  results.push(`[${hasBrandBibleImport && hasBrandInjectImport ? '✅' : '❌'}] universal-video-service.ts imports brand services`);
  console.log(results[results.length - 1]);

  // 8. universal-video-service.ts loads brand bible at start
  const loadsBrandBible = universalContent.includes('[Assets] Loading brand bible...');
  results.push(`[${loadsBrandBible ? '✅' : '❌'}] universal-video-service.ts loads brand bible at start`);
  console.log(results[results.length - 1]);

  // 9. universal-video-service.ts generates brand instructions
  const generatesBrandInstructions = universalContent.includes('[Assets] Generating brand overlay instructions...');
  results.push(`[${generatesBrandInstructions ? '✅' : '❌'}] universal-video-service.ts generates brand instructions after assets`);
  console.log(results[results.length - 1]);

  // 10. universal-video-service.ts stores brand instructions in project
  const storesBrandInstructions = universalContent.includes('brandInstructions = {');
  results.push(`[${storesBrandInstructions ? '✅' : '❌'}] Brand instructions stored in project.brandInstructions`);
  console.log(results[results.length - 1]);

  // 11. universal-video-service.ts stores per-scene overlays
  const storesSceneOverlays = universalContent.includes('brandOverlays = overlays');
  results.push(`[${storesSceneOverlays ? '✅' : '❌'}] Per-scene overlays stored in scene.brandOverlays`);
  console.log(results[results.length - 1]);

  // 12. ai-video-service.ts passes negativePrompt to runway
  const passesToRunway = aiVideoContent.includes('negativePrompt: options.negativePrompt,') || 
                          aiVideoContent.includes('negativePrompt: options.negativePrompt');
  results.push(`[${passesToRunway ? '✅' : '❌'}] ai-video-service.ts passes negativePrompt to runway`);
  console.log(results[results.length - 1]);

  // 13. universal-video-service.ts passes narration to AI video
  const passesNarration = universalContent.includes('narration: scene.narration,');
  results.push(`[${passesNarration ? '✅' : '❌'}] universal-video-service.ts passes narration context to AI video`);
  console.log(results[results.length - 1]);

  // Summary
  console.log('\n============================================================');
  console.log('VERIFICATION SUMMARY');
  console.log('============================================================\n');
  
  const passed = results.filter(r => r.includes('✅')).length;
  const total = results.length;
  
  results.forEach(r => console.log(r));
  
  console.log(`\n${passed}/${total} checklist items passed`);
  
  if (passed === total) {
    console.log('\n✅ ALL CHECKLIST ITEMS VERIFIED - Phase 4D Complete!');
  } else {
    console.log('\n❌ Some items failed - review issues above');
  }
}

verifyChecklist().catch(console.error);
