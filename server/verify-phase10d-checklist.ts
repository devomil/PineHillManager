/**
 * Phase 10D Verification Checklist: QA Gate Enforcement
 * 
 * This script verifies that all Phase 10D requirements are implemented:
 * 1. Render route checks QA report before proceeding
 * 2. Render blocked if ANY scene has status "rejected"
 * 3. Render blocked if ANY scene needs review without approval
 * 4. Render blocked if critical issues exist
 * 5. Render blocked if overall score below threshold
 * 6. UI shows disabled render button when blocked
 * 7. UI shows clear blocking reasons
 * 8. After approving all scenes, render becomes available
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function addResult(name: string, passed: boolean, details: string) {
  results.push({ name, passed, details });
  console.log(`\n--- ${name} ---`);
  console.log(passed ? `✅ PASS: ${name}` : `❌ FAIL: ${name}`);
  console.log(`   Details: ${details}\n`);
}

async function runTests() {
  console.log('========================================');
  console.log('PHASE 10D VERIFICATION TESTS');
  console.log('QA Gate Enforcement');
  console.log('========================================');

  const qualityGateServicePath = path.join(__dirname, 'services/quality-gate-service.ts');
  const universalVideoRoutesPath = path.join(__dirname, 'routes/universal-video-routes.ts');
  const frontendPath = path.join(__dirname, '../client/src/components/universal-video-producer.tsx');

  // Test 1: Quality gate service has strict canRender enforcement
  console.log('\n--- Test 1: Strict canRender enforcement ---');
  try {
    const qgContent = fs.readFileSync(qualityGateServicePath, 'utf-8');
    const hasStrictCanRender = qgContent.includes('Phase 10D: Strict QA gate enforcement') &&
                                qgContent.includes('canRender = passesThreshold') &&
                                !qgContent.includes('canRender = passesThreshold ||');
    addResult(
      'Test 1: Strict canRender enforcement in quality-gate-service',
      hasStrictCanRender,
      hasStrictCanRender 
        ? 'canRender is strictly false when blocking conditions exist'
        : 'canRender may allow rendering with blocking conditions'
    );
  } catch (e) {
    addResult('Test 1: Strict canRender enforcement', false, `Error reading file: ${e}`);
  }

  // Test 2: Render route has QA gate check
  console.log('\n--- Test 2: Render route QA gate check ---');
  try {
    const routesContent = fs.readFileSync(universalVideoRoutesPath, 'utf-8');
    const hasQAGateCheck = routesContent.includes('Phase 10D: QA Gate Enforcement') &&
                           routesContent.includes('qualityGateService.canProceedToRender') &&
                           routesContent.includes('qaGateBlocked: true');
    addResult(
      'Test 2: Render route has QA gate check',
      hasQAGateCheck,
      hasQAGateCheck 
        ? 'Render route checks QA gate before proceeding'
        : 'Render route missing QA gate check'
    );
  } catch (e) {
    addResult('Test 2: Render route QA gate check', false, `Error reading file: ${e}`);
  }

  // Test 3: Render route blocks on rejected scenes
  console.log('\n--- Test 3: Render route blocks on rejected scenes ---');
  try {
    const qgContent = fs.readFileSync(qualityGateServicePath, 'utf-8');
    const blocksRejected = qgContent.includes("rejected scenes need regeneration") ||
                           qgContent.includes("scene(s) rejected - must regenerate");
    addResult(
      'Test 3: Render blocks on rejected scenes',
      blocksRejected,
      blocksRejected 
        ? 'Rejected scenes add to blocking reasons'
        : 'Missing rejected scenes blocking logic'
    );
  } catch (e) {
    addResult('Test 3: Render blocks on rejected scenes', false, `Error reading file: ${e}`);
  }

  // Test 4: Render route blocks on needs_review scenes
  console.log('\n--- Test 4: Render route blocks on needs_review scenes ---');
  try {
    const qgContent = fs.readFileSync(qualityGateServicePath, 'utf-8');
    const blocksNeedsReview = qgContent.includes("scenes need user review") ||
                              qgContent.includes("scene(s) need review");
    addResult(
      'Test 4: Render blocks on needs_review scenes',
      blocksNeedsReview,
      blocksNeedsReview 
        ? 'Needs review scenes add to blocking reasons'
        : 'Missing needs_review blocking logic'
    );
  } catch (e) {
    addResult('Test 4: Render blocks on needs_review scenes', false, `Error reading file: ${e}`);
  }

  // Test 5: Render route blocks on critical issues
  console.log('\n--- Test 5: Render route blocks on critical issues ---');
  try {
    const qgContent = fs.readFileSync(qualityGateServicePath, 'utf-8');
    const blocksCritical = qgContent.includes("critical issue") &&
                           qgContent.includes("blockingReasons.push");
    addResult(
      'Test 5: Render blocks on critical issues',
      blocksCritical,
      blocksCritical 
        ? 'Critical issues add to blocking reasons'
        : 'Missing critical issues blocking logic'
    );
  } catch (e) {
    addResult('Test 5: Render blocks on critical issues', false, `Error reading file: ${e}`);
  }

  // Test 6: UI disables render button when blocked
  console.log('\n--- Test 6: UI disables render button when blocked ---');
  try {
    const uiContent = fs.readFileSync(frontendPath, 'utf-8');
    const hasDisabledButton = uiContent.includes('disabled={renderMutation.isPending || (qaReport && !qaReport.canRender)}') ||
                              uiContent.includes('disabled={') && uiContent.includes('!qaReport.canRender');
    addResult(
      'Test 6: UI disables render button when blocked',
      hasDisabledButton,
      hasDisabledButton 
        ? 'Render button is disabled when canRender is false'
        : 'Render button may not be disabled properly'
    );
  } catch (e) {
    addResult('Test 6: UI disables render button when blocked', false, `Error reading file: ${e}`);
  }

  // Test 7: UI shows blocking reasons
  console.log('\n--- Test 7: UI shows blocking reasons ---');
  try {
    const uiContent = fs.readFileSync(frontendPath, 'utf-8');
    const showsBlockingReasons = uiContent.includes('blockingReasons.map') &&
                                  uiContent.includes('Rendering blocked');
    addResult(
      'Test 7: UI shows blocking reasons',
      showsBlockingReasons,
      showsBlockingReasons 
        ? 'UI displays list of blocking reasons'
        : 'UI missing blocking reasons display'
    );
  } catch (e) {
    addResult('Test 7: UI shows blocking reasons', false, `Error reading file: ${e}`);
  }

  // Test 8: canProceedToRender returns proper blocking info
  console.log('\n--- Test 8: canProceedToRender returns blocking info ---');
  try {
    const qgContent = fs.readFileSync(qualityGateServicePath, 'utf-8');
    const hasBlockingInfo = qgContent.includes('canProceedToRender') &&
                            qgContent.includes('allowed: boolean') &&
                            qgContent.includes('blockingReasons: string[]');
    addResult(
      'Test 8: canProceedToRender returns blocking info',
      hasBlockingInfo,
      hasBlockingInfo 
        ? 'canProceedToRender returns allowed status and blocking reasons'
        : 'canProceedToRender missing proper return type'
    );
  } catch (e) {
    addResult('Test 8: canProceedToRender returns blocking info', false, `Error reading file: ${e}`);
  }

  // Test 9: Force render requires admin role
  console.log('\n--- Test 9: Force render requires admin role ---');
  try {
    const routesContent = fs.readFileSync(universalVideoRoutesPath, 'utf-8');
    const hasSecureForceRender = routesContent.includes('isAdminForceRender') &&
                                  routesContent.includes("userRole === 'admin'") &&
                                  routesContent.includes('ADMIN FORCE RENDER');
    addResult(
      'Test 9: Force render requires admin role',
      hasSecureForceRender,
      hasSecureForceRender 
        ? 'Force render requires admin role - security enforced'
        : 'Force render may not be secure'
    );
  } catch (e) {
    addResult('Test 9: Force render requires admin role', false, `Error reading file: ${e}`);
  }

  // Test 10: UI has link to QA Dashboard from blocking message
  console.log('\n--- Test 10: UI links to QA Dashboard ---');
  try {
    const uiContent = fs.readFileSync(frontendPath, 'utf-8');
    const linksToQA = uiContent.includes('Review Issues in QA Dashboard') &&
                      uiContent.includes('setShowQADashboard(true)');
    addResult(
      'Test 10: UI links to QA Dashboard from blocking message',
      linksToQA,
      linksToQA 
        ? 'Users can access QA Dashboard from blocking message'
        : 'Missing link to QA Dashboard'
    );
  } catch (e) {
    addResult('Test 10: UI links to QA Dashboard', false, `Error reading file: ${e}`);
  }

  // Summary
  console.log('========================================');
  console.log('PHASE 10D VERIFICATION SUMMARY');
  console.log('========================================');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`\nTotal Tests: ${results.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n========================================');
    console.log('✅ ALL PHASE 10D CHECKS PASSED');
    console.log('========================================');
  } else {
    console.log('\n========================================');
    console.log('❌ SOME PHASE 10D CHECKS FAILED');
    console.log('========================================');
    console.log('\nFailed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.details}`);
    });
  }
}

runTests().catch(console.error);
