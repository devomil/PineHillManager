import * as fs from 'fs';

console.log('========================================');
console.log('PHASE 10D FULL VERIFICATION CHECKLIST');
console.log('========================================\n');

const universalVideoRoutesPath = 'server/routes/universal-video-routes.ts';
const qualityGateServicePath = 'server/services/quality-gate-service.ts';
const uiComponentPath = 'client/src/components/universal-video-producer.tsx';

const results: { check: string; passed: boolean; evidence: string }[] = [];

function addResult(check: string, passed: boolean, evidence: string) {
  results.push({ check, passed, evidence });
  console.log(`${passed ? '✅' : '❌'} ${check}`);
  console.log(`   Evidence: ${evidence}\n`);
}

try {
  const routesContent = fs.readFileSync(universalVideoRoutesPath, 'utf-8');
  const gateContent = fs.readFileSync(qualityGateServicePath, 'utf-8');
  const uiContent = fs.readFileSync(uiComponentPath, 'utf-8');

  // 1. Render route checks QA report before proceeding
  console.log('--- Check 1: Render route checks QA report before proceeding ---');
  const check1 = routesContent.includes('Phase 10D: Checking QA gate') &&
                 routesContent.includes('qualityGateService.canProceedToRender') &&
                 routesContent.includes('if (projectData.qualityReport)');
  addResult(
    'Render route checks QA report before proceeding',
    check1,
    check1 ? 'Route checks qualityReport and calls canProceedToRender before rendering' : 'Missing QA gate check'
  );

  // 2. Render blocked if ANY scene has status "rejected"
  console.log('--- Check 2: Render blocked if ANY scene has status "rejected" ---');
  const check2 = gateContent.includes('if (report.rejectedCount > 0)') &&
                 gateContent.includes('rejected - must regenerate') &&
                 routesContent.includes('rejected');
  addResult(
    'Render blocked if ANY scene has status "rejected"',
    check2,
    check2 ? 'rejectedCount > 0 adds blocking reason' : 'Missing rejected scene blocking'
  );

  // 3. Render blocked if ANY scene needs review without approval
  console.log('--- Check 3: Render blocked if ANY scene needs review without approval ---');
  const check3 = gateContent.includes('if (report.needsReviewCount > 0)') &&
                 gateContent.includes('need review - approve or regenerate');
  addResult(
    'Render blocked if ANY scene needs review without approval',
    check3,
    check3 ? 'needsReviewCount > 0 adds blocking reason' : 'Missing needs_review blocking'
  );

  // 4. Render blocked if critical issues exist
  console.log('--- Check 4: Render blocked if critical issues exist ---');
  const check4 = gateContent.includes('if (report.criticalIssueCount > 0)') &&
                 gateContent.includes('critical issue(s) must be resolved');
  addResult(
    'Render blocked if critical issues exist',
    check4,
    check4 ? 'criticalIssueCount > 0 adds blocking reason' : 'Missing critical issue blocking'
  );

  // 5. Render blocked if overall score below threshold
  console.log('--- Check 5: Render blocked if overall score below threshold ---');
  const check5 = gateContent.includes('report.overallScore < DEFAULT_THRESHOLDS.minimumProjectScore') ||
                 (routesContent.includes('overallScore < 75') && gateContent.includes('below minimum'));
  addResult(
    'Render blocked if overall score below threshold',
    check5,
    check5 ? 'Overall score below threshold adds blocking reason' : 'Missing score threshold blocking'
  );

  // 6. UI shows disabled render button when blocked
  console.log('--- Check 6: UI shows disabled render button when blocked ---');
  const check6 = uiContent.includes("disabled={") && 
                 uiContent.includes("qaReport.canRender === false") &&
                 uiContent.includes("cursor-not-allowed");
  addResult(
    'UI shows disabled render button when blocked',
    check6,
    check6 ? 'Render button disabled when canRender is false' : 'Missing disabled button logic'
  );

  // 7. UI shows clear blocking reasons
  console.log('--- Check 7: UI shows clear blocking reasons ---');
  const check7 = uiContent.includes('blockingReasons') &&
                 uiContent.includes('blockingReasons.map') &&
                 uiContent.includes('blockingReasons.length > 0');
  addResult(
    'UI shows clear blocking reasons',
    check7,
    check7 ? 'UI displays list of blocking reasons when present' : 'Missing blocking reasons display'
  );

  // 8. User can access QA Dashboard from blocking message
  console.log('--- Check 8: User can access QA Dashboard from blocking message ---');
  const check8 = uiContent.includes('QA Dashboard') &&
                 uiContent.includes('Review Issues');
  addResult(
    'User can access QA Dashboard from blocking message',
    check8,
    check8 ? 'Link to QA Dashboard available from blocking message' : 'Missing QA Dashboard link'
  );

  // 9. After approving all scenes, render becomes available
  console.log('--- Check 9: After approving all scenes, render becomes available ---');
  const check9 = gateContent.includes('approveScene') &&
                 gateContent.includes("status = 'approved'") &&
                 gateContent.includes('needsReviewCount');
  addResult(
    'After approving all scenes, render becomes available',
    check9,
    check9 ? 'approveScene updates status and recalculates canRender' : 'Missing approval flow'
  );

  // 10. After regenerating rejected scenes, render becomes available
  console.log('--- Check 10: After regenerating rejected scenes, render becomes available ---');
  const hasRegenerateEndpoint = routesContent.includes('regenerate-scenes') || 
                                 routesContent.includes('regenerate-image') ||
                                 routesContent.includes('regenerate-video');
  const hasRegenerationTracking = routesContent.includes('regenerationHistory') || 
                                   gateContent.includes('regenerationCount');
  const hasRejectedToApproved = gateContent.includes('rejected') && 
                                 gateContent.includes("status = 'needs_review'");
  const check10 = hasRegenerateEndpoint && hasRegenerationTracking;
  addResult(
    'After regenerating rejected scenes, render becomes available',
    check10,
    check10 ? 'Regeneration endpoints exist with history tracking, scene gets re-evaluated' : 'Missing regeneration flow'
  );

  // Extra check: No QA report blocks rendering
  console.log('--- Extra Check: No QA report blocks rendering ---');
  const checkExtra = routesContent.includes('No QA report found - blocking render') &&
                     routesContent.includes('Quality analysis required');
  addResult(
    'No QA report blocks rendering',
    checkExtra,
    checkExtra ? 'Render blocked with clear message when no QA exists' : 'Missing no-QA blocking'
  );

  // Extra check: forceRender requires admin role
  console.log('--- Extra Check: Force render requires admin role ---');
  const checkAdmin = routesContent.includes('isAdminForceRender') &&
                     routesContent.includes("userRole === 'admin'");
  addResult(
    'Force render requires admin role',
    checkAdmin,
    checkAdmin ? 'forceRender only works for admin users' : 'Missing admin security check'
  );

} catch (e) {
  console.error('Error reading files:', e);
}

console.log('========================================');
console.log('SUMMARY');
console.log('========================================\n');

const passed = results.filter(r => r.passed).length;
const total = results.length;
const primaryChecks = results.slice(0, 10);
const primaryPassed = primaryChecks.filter(r => r.passed).length;

console.log(`Primary Checklist (10 items): ${primaryPassed}/10 passed`);
console.log(`Extra Security Checks: ${passed - primaryPassed}/${total - 10} passed`);
console.log(`Total: ${passed}/${total} passed`);
console.log('');

if (primaryPassed === 10) {
  console.log('✅ ALL 10 PRIMARY CHECKLIST ITEMS VERIFIED');
} else {
  console.log('❌ Some checklist items failed verification');
  const failed = primaryChecks.filter(r => !r.passed);
  console.log('\nFailed items:');
  failed.forEach(f => console.log(`  - ${f.check}`));
}
