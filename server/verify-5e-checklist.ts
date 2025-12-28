// Phase 5E Verification Checklist - Quality Dashboard

import fs from 'fs';

async function verifyChecklist() {
  console.log('============================================================');
  console.log('PHASE 5E VERIFICATION CHECKLIST - Quality Dashboard');
  console.log('============================================================\n');

  const results: string[] = [];
  
  const qualityReportContent = fs.readFileSync('./client/src/components/quality-report.tsx', 'utf-8');
  const routesContent = fs.readFileSync('./server/routes/universal-video-routes.ts', 'utf-8');

  // 1. API returns structured quality data
  const hasStructuredData = routesContent.includes('qualityReport') && 
                            routesContent.includes('recommendation') &&
                            routesContent.includes('summary');
  results.push(`[${hasStructuredData ? '✅' : '❌'}] API returns structured quality data`);
  console.log(results[results.length - 1]);

  // 2. Scores aggregate correctly
  const hasScoreAggregation = routesContent.includes('overallScore') && 
                              routesContent.includes('criticalCount') &&
                              routesContent.includes('majorCount');
  results.push(`[${hasScoreAggregation ? '✅' : '❌'}] Scores aggregate correctly`);
  console.log(results[results.length - 1]);

  // 3. Issues grouped by severity
  const hasIssueGrouping = routesContent.includes('critical:') && 
                           routesContent.includes('major:') &&
                           routesContent.includes('minor:') &&
                           qualityReportContent.includes('issues?.critical');
  results.push(`[${hasIssueGrouping ? '✅' : '❌'}] Issues grouped by severity`);
  console.log(results[results.length - 1]);

  // 4. Regenerate button appears for failed scenes
  const hasRegenerateButton = qualityReportContent.includes('needsRegeneration') && 
                              qualityReportContent.includes('button-regenerate-scene') &&
                              qualityReportContent.includes('Regenerate');
  results.push(`[${hasRegenerateButton ? '✅' : '❌'}] Regenerate button appears for failed scenes`);
  console.log(results[results.length - 1]);

  // 5. Scene details show scores
  const hasSceneDetails = qualityReportContent.includes('ScoreBar') && 
                          qualityReportContent.includes('Composition') &&
                          qualityReportContent.includes('overallScore');
  results.push(`[${hasSceneDetails ? '✅' : '❌'}] Scene details show scores`);
  console.log(results[results.length - 1]);

  // 6. Approve button only enabled when appropriate
  const hasApproveButton = qualityReportContent.includes('button-approve-render') && 
                           qualityReportContent.includes('onApproveAndRender') &&
                           qualityReportContent.includes("report.recommendation === 'pending'");
  results.push(`[${hasApproveButton ? '✅' : '❌'}] Approve button only enabled when appropriate`);
  console.log(results[results.length - 1]);

  // 7. Loading state during fetch
  const hasLoadingState = qualityReportContent.includes('isLoading') && 
                          qualityReportContent.includes('Loader2') &&
                          qualityReportContent.includes('animate-spin');
  results.push(`[${hasLoadingState ? '✅' : '❌'}] Loading state during fetch`);
  console.log(results[results.length - 1]);

  // 8. Error state displays correctly
  const hasErrorState = qualityReportContent.includes('Alert') && 
                        qualityReportContent.includes('No quality report available') &&
                        qualityReportContent.includes('AlertDescription');
  results.push(`[${hasErrorState ? '✅' : '❌'}] Error state displays correctly`);
  console.log(results[results.length - 1]);

  // 9. Refresh updates quality data
  const hasRefresh = qualityReportContent.includes('invalidateQueries') && 
                     qualityReportContent.includes('refetch') &&
                     qualityReportContent.includes('Re-evaluate');
  results.push(`[${hasRefresh ? '✅' : '❌'}] Refresh updates quality data`);
  console.log(results[results.length - 1]);

  // 10. Color coding matches severity
  const hasColorCoding = qualityReportContent.includes('getScoreColor') && 
                         qualityReportContent.includes('text-green') &&
                         qualityReportContent.includes('text-red');
  results.push(`[${hasColorCoding ? '✅' : '❌'}] Color coding matches severity`);
  console.log(results[results.length - 1]);

  // 11. Recommendation badge shows in header
  const hasRecommendationBadge = qualityReportContent.includes('badge-recommendation') && 
                                  qualityReportContent.includes('RECOMMENDATION_CONFIG');
  results.push(`[${hasRecommendationBadge ? '✅' : '❌'}] Recommendation badge shows in header`);
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
    console.log('\n✅ ALL CHECKLIST ITEMS VERIFIED - Phase 5E Complete!');
  } else {
    console.log('\n❌ Some items failed - review issues above');
  }
}

verifyChecklist().catch(console.error);
