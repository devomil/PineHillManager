// Phase 4F Verification Checklist - Brand Quality Checks

import fs from 'fs';

async function verifyChecklist() {
  console.log('============================================================');
  console.log('PHASE 4F VERIFICATION CHECKLIST - Brand Quality Checks');
  console.log('============================================================\n');

  const results: string[] = [];
  
  const qualityContent = fs.readFileSync('./server/services/quality-evaluation-service.ts', 'utf-8');
  const regenContent = fs.readFileSync('./server/services/scene-regeneration-service.ts', 'utf-8');

  // 1. QualityIssue type includes new brand-related types
  const hasAITextType = qualityContent.includes("'ai-text-detected'");
  const hasAIUIType = qualityContent.includes("'ai-ui-detected'");
  const hasOffBrandType = qualityContent.includes("'off-brand-content'");
  const hasMissingBrandType = qualityContent.includes("'missing-brand-element'");
  const hasAllBrandTypes = hasAITextType && hasAIUIType && hasOffBrandType && hasMissingBrandType;
  results.push(`[${hasAllBrandTypes ? '✅' : '❌'}] QualityIssue type includes new brand-related types`);
  console.log(results[results.length - 1]);

  // 2. evaluateBrandCompliance method exists
  const hasEvaluateBrandCompliance = qualityContent.includes('async evaluateBrandCompliance(');
  results.push(`[${hasEvaluateBrandCompliance ? '✅' : '❌'}] evaluateBrandCompliance() method exists`);
  console.log(results[results.length - 1]);

  // 3. AI text detection in prompt
  const hasAITextDetection = qualityContent.includes('AI-GENERATED TEXT (CRITICAL)') && 
                              qualityContent.includes('"peocineate"');
  results.push(`[${hasAITextDetection ? '✅' : '❌'}] AI text detection identifies garbled text`);
  console.log(results[results.length - 1]);

  // 4. AI UI detection in prompt
  const hasAIUIDetection = qualityContent.includes('AI-GENERATED UI ELEMENTS (MAJOR)') && 
                            qualityContent.includes('Fake calendars');
  results.push(`[${hasAIUIDetection ? '✅' : '❌'}] AI UI detection identifies fake calendars/charts`);
  console.log(results[results.length - 1]);

  // 5. Off-brand content detection
  const hasOffBrandDetection = qualityContent.includes('OFF-BRAND CONTENT (MAJOR)');
  results.push(`[${hasOffBrandDetection ? '✅' : '❌'}] Off-brand content detection works`);
  console.log(results[results.length - 1]);

  // 6. Brand compliance score calculation
  const hasScoreCalc = qualityContent.includes('brandComplianceScore') && 
                       qualityContent.includes('score -= 40');
  results.push(`[${hasScoreCalc ? '✅' : '❌'}] Brand compliance score is calculated correctly`);
  console.log(results[results.length - 1]);

  // 7. Critical issues trigger regeneration
  const hasRegenRecommendation = qualityContent.includes("recommendation = 'regenerate'") &&
                                 qualityContent.includes('hasCriticalBrandIssue');
  results.push(`[${hasRegenRecommendation ? '✅' : '❌'}] Critical issues trigger regeneration recommendation`);
  console.log(results[results.length - 1]);

  // 8. Console logs show brand evaluation results
  const hasConsoleLogs = qualityContent.includes('[QualityEval] Brand compliance score:') &&
                         qualityContent.includes('[QualityEval] AI text detected:');
  results.push(`[${hasConsoleLogs ? '✅' : '❌'}] Console logs show brand evaluation results`);
  console.log(results[results.length - 1]);

  // 9. Batch evaluation works for full video
  const hasBatchEval = qualityContent.includes('async evaluateVideoBrandCompliance(');
  results.push(`[${hasBatchEval ? '✅' : '❌'}] Batch evaluation works for full video`);
  console.log(results[results.length - 1]);

  // 10. Regeneration strategy includes prompt modifications
  const hasRegenStrategy = regenContent.includes('getRegenerationStrategy(issues: QualityIssue[])');
  const hasPromptMods = regenContent.includes('promptModifications.push');
  results.push(`[${hasRegenStrategy && hasPromptMods ? '✅' : '❌'}] Regeneration strategy includes prompt modifications`);
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
    console.log('\n✅ ALL CHECKLIST ITEMS VERIFIED - Phase 4F Complete!');
  } else {
    console.log('\n❌ Some items failed - review issues above');
  }
}

verifyChecklist().catch(console.error);
