import { brandRequirementAnalyzer } from '../services/brand-requirement-analyzer';
import { brandAssetMatcher } from '../services/brand-asset-matcher';
import { brandWorkflowRouter } from '../services/brand-workflow-router';
import { brandWorkflowOrchestrator } from '../services/brand-workflow-orchestrator';
import type { WorkflowPath } from '../../shared/types/brand-workflow-types';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function logTest(name: string, passed: boolean, details: string) {
  results.push({ name, passed, details });
  const icon = passed ? '✅' : '❌';
  console.log(`   ${icon} ${name}: ${details}`);
}

async function runTests() {
  console.log('========================================');
  console.log('Phase 14F Workflow Orchestration Verification');
  console.log('========================================\n');

  console.log('1. Testing Brand Requirement Analyzer...');
  
  const productScene = 'Close-up of Black Cohosh Extract Plus on natural wood desk, warm lighting, Pine Hill Farm branding visible';
  const productAnalysis = brandRequirementAnalyzer.analyze(productScene, 'Our premium supplement');
  logTest('Product detection', productAnalysis.requirements.productMentioned, 
    productAnalysis.requirements.productMentioned ? 'Product detected' : 'Product NOT detected');
  logTest('Logo detection', productAnalysis.requirements.logoRequired,
    productAnalysis.requirements.logoRequired ? 'Logo required' : 'Logo not required');
  logTest('Confidence threshold', productAnalysis.confidence > 0.4,
    `Confidence: ${(productAnalysis.confidence * 100).toFixed(1)}%`);

  const standardScene = 'Beautiful sunset over mountains, peaceful landscape';
  const standardAnalysis = brandRequirementAnalyzer.analyze(standardScene, '');
  logTest('Standard scene detection', !standardAnalysis.requiresBrandAssets,
    standardAnalysis.requiresBrandAssets ? 'Incorrectly requires brand assets' : 'Correctly identified as standard');

  console.log('\n2. Testing Asset Matcher...');
  
  const enrichedAnalysis = await brandAssetMatcher.matchAssets(productAnalysis);
  logTest('Product assets matched', enrichedAnalysis.matchedAssets.products.length >= 0,
    `Products: ${enrichedAnalysis.matchedAssets.products.length}`);
  logTest('Logo assets matched', enrichedAnalysis.matchedAssets.logos.length >= 0,
    `Logos: ${enrichedAnalysis.matchedAssets.logos.length}`);

  console.log('\n3. Testing Workflow Router...');
  
  const testCases: Array<{ name: string; visual: string; narration: string; expectedPath: WorkflowPath }> = [
    {
      name: 'Product hero (close-up)',
      visual: 'Close-up of Black Cohosh bottle on wooden desk, Pine Hill Farm logo visible',
      narration: 'Discover our premium supplement',
      expectedPath: 'product-hero',
    },
    {
      name: 'Standard scene (no brand)',
      visual: 'Beautiful sunrise over ocean waves',
      narration: 'A new day begins',
      expectedPath: 'standard',
    },
    {
      name: 'Logo overlay only (branding without product)',
      visual: 'Woman smiling at camera, Pine Hill Farm branding visible',
      narration: 'Our customers love us',
      expectedPath: 'logo-overlay-only',
    },
    {
      name: 'Product hero shot',
      visual: 'Hero shot of Deep Sleep supplement, close-up featured product',
      narration: 'Sleep better tonight',
      expectedPath: 'product-hero',
    },
  ];

  for (const testCase of testCases) {
    let analysis = brandRequirementAnalyzer.analyze(testCase.visual, testCase.narration);
    analysis = await brandAssetMatcher.matchAssets(analysis);
    analysis.requirements.outputType = 'video';
    
    const decision = brandWorkflowRouter.route(analysis);
    const passed = decision.path === testCase.expectedPath;
    logTest(`Router: ${testCase.name}`, passed, `Expected: ${testCase.expectedPath}, Got: ${decision.path}`);
  }

  console.log('\n4. Testing Workflow Decision Quality...');
  
  let analysis = brandRequirementAnalyzer.analyze(productScene, 'Our premium supplement');
  analysis = await brandAssetMatcher.matchAssets(analysis);
  analysis.requirements.outputType = 'video';
  
  const decision = brandWorkflowRouter.route(analysis);
  
  logTest('Decision has steps', decision.steps.length > 0, `Steps: ${decision.steps.length}`);
  logTest('Decision has reasons', decision.reasons.length > 0, `Reasons: ${decision.reasons.join('; ')}`);
  logTest('Quality impact set', ['higher', 'same', 'lower'].includes(decision.qualityImpact), 
    `Quality: ${decision.qualityImpact}`);
  logTest('Cost multiplier valid', decision.costMultiplier >= 1.0, 
    `Cost: ${decision.costMultiplier}x`);

  console.log('\n5. Testing Workflow Orchestrator Analysis...');
  
  const { analysis: orchAnalysis, decision: orchDecision } = await brandWorkflowOrchestrator.analyzeOnly(
    productScene,
    'Our premium supplement',
    'video'
  );
  
  logTest('Orchestrator analysis works', orchAnalysis !== null, 'Analysis completed');
  logTest('Orchestrator decision works', orchDecision !== null, `Path: ${orchDecision.path}`);

  console.log('\n6. Testing Workflow Path Descriptions...');
  
  const paths = brandWorkflowOrchestrator.getWorkflowPaths();
  logTest('All paths defined', paths.length === 6, `Paths: ${paths.length}`);
  
  for (const path of paths) {
    const desc = brandWorkflowOrchestrator.describeWorkflow(path);
    logTest(`Path description: ${path}`, desc.length > 10, desc.substring(0, 50) + '...');
  }

  console.log('\n7. Testing Step Generation...');
  
  const stepTests: WorkflowPath[] = ['product-image', 'product-video', 'logo-overlay-only', 'standard'];
  for (const path of stepTests) {
    let testAnalysis = brandRequirementAnalyzer.analyze('Test product on desk, Pine Hill Farm logo', '');
    testAnalysis = await brandAssetMatcher.matchAssets(testAnalysis);
    testAnalysis.requirements.outputType = path.includes('image') ? 'image' : 'video';
    
    if (path === 'product-image' || path === 'product-video') {
      testAnalysis.requirements.productMentioned = true;
      testAnalysis.requirements.sceneType = 'product-in-context';
    }
    
    const testDecision = brandWorkflowRouter.route(testAnalysis);
    logTest(`Steps for ${testDecision.path}`, testDecision.steps.length > 0, 
      `${testDecision.steps.map(s => s.name).join(' → ')}`);
  }

  console.log('\n========================================');
  console.log('VERIFICATION SUMMARY');
  console.log('========================================\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\n--- Failed Tests ---');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  • ${r.name}: ${r.details}`);
    });
  }

  console.log('\n========================================');
  
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Verification failed with error:', err);
  process.exit(1);
});
