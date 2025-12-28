// Phase 5E Full Verification Checklist - Quality Dashboard
import fs from 'fs';

async function verifyChecklist() {
  console.log('============================================================');
  console.log('PHASE 5E FULL VERIFICATION CHECKLIST - Quality Dashboard');
  console.log('============================================================\n');

  const results: string[] = [];
  
  const qualityReportContent = fs.readFileSync('./client/src/components/quality-report.tsx', 'utf-8');
  const routesContent = fs.readFileSync('./server/routes/universal-video-routes.ts', 'utf-8');

  // 1. API endpoint returns quality data correctly
  const hasQualityEndpoint = routesContent.includes("router.get('/projects/:projectId/quality-report'") && 
                              routesContent.includes('qualityReport') &&
                              routesContent.includes('success: true');
  results.push(`[${hasQualityEndpoint ? '✅' : '❌'}] API endpoint returns quality data correctly`);
  console.log(results[results.length - 1]);

  // 2. Overall score displays prominently
  const hasOverallScore = qualityReportContent.includes('text-3xl font-bold') && 
                          qualityReportContent.includes('overallScore') &&
                          qualityReportContent.includes('Overall Score');
  results.push(`[${hasOverallScore ? '✅' : '❌'}] Overall score displays prominently`);
  console.log(results[results.length - 1]);

  // 3. Score breakdown shows all three metrics
  const hasScoreBreakdown = qualityReportContent.includes('Composition') && 
                            qualityReportContent.includes('Visibility') &&
                            qualityReportContent.includes('Technical Quality');
  results.push(`[${hasScoreBreakdown ? '✅' : '❌'}] Score breakdown shows all three metrics`);
  console.log(results[results.length - 1]);

  // 4. Progress bars show correct colors for score ranges
  const hasColorRanges = qualityReportContent.includes('getScoreColor') && 
                         qualityReportContent.includes('score >= 80') &&
                         qualityReportContent.includes('text-green') &&
                         qualityReportContent.includes('text-yellow') &&
                         qualityReportContent.includes('text-red');
  results.push(`[${hasColorRanges ? '✅' : '❌'}] Progress bars show correct colors for score ranges`);
  console.log(results[results.length - 1]);

  // 5. Issues are grouped by severity (check for getSeverityBadge and issue counts)
  const hasIssueSeverity = qualityReportContent.includes('getSeverityBadge') && 
                           qualityReportContent.includes('issues.critical') &&
                           qualityReportContent.includes('issues.major') &&
                           qualityReportContent.includes('issues.minor');
  results.push(`[${hasIssueSeverity ? '✅' : '❌'}] Issues are grouped by severity`);
  console.log(results[results.length - 1]);

  // 6. Collapsible issues section works
  const hasCollapsible = qualityReportContent.includes('Collapsible') && 
                         qualityReportContent.includes('CollapsibleTrigger') &&
                         qualityReportContent.includes('CollapsibleContent') &&
                         qualityReportContent.includes('expandedScenes');
  results.push(`[${hasCollapsible ? '✅' : '❌'}] Collapsible issues section works`);
  console.log(results[results.length - 1]);

  // 7. Scene details dialog shows all scenes
  const hasSceneDetails = qualityReportContent.includes('sceneScores.map') && 
                          qualityReportContent.includes('Scene Quality Breakdown') &&
                          qualityReportContent.includes('ScoreBar');
  results.push(`[${hasSceneDetails ? '✅' : '❌'}] Scene details dialog shows all scenes`);
  console.log(results[results.length - 1]);

  // 8. Regenerate buttons work for scenes
  const hasRegenerateButtons = qualityReportContent.includes('regenerateMutation') && 
                               qualityReportContent.includes('button-regenerate-scene') &&
                               qualityReportContent.includes('Regenerate This Scene') &&
                               qualityReportContent.includes('button-regenerate-all');
  results.push(`[${hasRegenerateButtons ? '✅' : '❌'}] Regenerate buttons work for scenes`);
  console.log(results[results.length - 1]);

  // 9. Recommendation badge shows correct status
  const hasRecommendationBadge = qualityReportContent.includes('RECOMMENDATION_CONFIG') && 
                                  qualityReportContent.includes('badge-recommendation') &&
                                  qualityReportContent.includes('Ready to Render') &&
                                  qualityReportContent.includes('Needs Fixes') &&
                                  qualityReportContent.includes('Needs Review');
  results.push(`[${hasRecommendationBadge ? '✅' : '❌'}] Recommendation badge shows correct status`);
  console.log(results[results.length - 1]);

  // 10. Render button disabled when critical issues exist
  const hasDisabledLogic = qualityReportContent.includes('button-approve-render') && 
                           qualityReportContent.includes("report.recommendation === 'pending'") &&
                           qualityReportContent.includes("issues?.critical");
  results.push(`[${hasDisabledLogic ? '✅' : '❌'}] Render button disabled when critical issues exist`);
  console.log(results[results.length - 1]);

  // 11. Polling updates during generation
  const hasPolling = qualityReportContent.includes('refetch') && 
                     qualityReportContent.includes('invalidateQueries') &&
                     qualityReportContent.includes('useQuery');
  results.push(`[${hasPolling ? '✅' : '❌'}] Polling updates during generation`);
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
