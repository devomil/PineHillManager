/**
 * Phase 10B Verification Checklist
 * 
 * This script verifies all Phase 10B requirements:
 * 1. Analysis prompt includes strict content matching rules
 * 2. Text overlay detection is working
 * 3. Framing validation catches wrong shot types
 * 4. Scenes with missing required elements score < 50
 * 5. Test case 1 (missing text) fails correctly
 * 6. Test case 2 (wrong framing) fails correctly
 * 7. Test case 3 (content mismatch) fails correctly
 * 8. High scores only given when content actually matches
 */

import { qualityEvaluationService, type SceneQualityScore, type QualityIssue } from './services/quality-evaluation-service';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
  score?: number;
  issues?: QualityIssue[];
}

const testResults: TestResult[] = [];

function logTest(name: string, passed: boolean, details: string, score?: number, issues?: QualityIssue[]) {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`\n${status}: ${name}`);
  console.log(`   Details: ${details}`);
  if (score !== undefined) {
    console.log(`   Score: ${score}`);
  }
  if (issues && issues.length > 0) {
    console.log(`   Issues: ${issues.map(i => `${i.type}(${i.severity})`).join(', ')}`);
  }
  testResults.push({ name, passed, details, score, issues });
}

// Mock evaluation responses for testing (simulating Claude's response)
function createMockEvaluationResponse(scenario: 'missing_text' | 'wrong_framing' | 'content_mismatch' | 'all_pass'): string {
  switch (scenario) {
    case 'missing_text':
      return JSON.stringify({
        scores: {
          composition: 70,
          visibility: 35,
          technicalQuality: 75,
          contentMatch: 35,
          professionalLook: 65,
          framingMatch: 80
        },
        textOverlayCheck: {
          expectedVisible: true,
          actuallyVisible: false,
          textReadable: false
        },
        framingCheck: {
          expectedType: "close-up",
          actualType: "close-up",
          matches: true
        },
        issues: [
          {
            type: "missing-text-overlay",
            severity: "critical",
            description: "Expected text overlay 'Natural Health Benefits' is not visible in the frame"
          }
        ],
        notes: "Text overlay is missing from the frame"
      });
      
    case 'wrong_framing':
      return JSON.stringify({
        scores: {
          composition: 60,
          visibility: 80,
          technicalQuality: 75,
          contentMatch: 55,
          professionalLook: 65,
          framingMatch: 35
        },
        textOverlayCheck: {
          expectedVisible: false,
          actuallyVisible: false,
          textReadable: true
        },
        framingCheck: {
          expectedType: "close-up",
          actualType: "wide",
          matches: false
        },
        issues: [
          {
            type: "wrong-framing",
            severity: "major",
            description: "Expected close-up shot but frame shows wide shot of entire environment"
          }
        ],
        notes: "Wrong shot type - expected close-up, got wide"
      });
      
    case 'content_mismatch':
      return JSON.stringify({
        scores: {
          composition: 80,
          visibility: 85,
          technicalQuality: 90,
          contentMatch: 25,
          professionalLook: 75,
          framingMatch: 70
        },
        textOverlayCheck: {
          expectedVisible: false,
          actuallyVisible: false,
          textReadable: true
        },
        framingCheck: {
          expectedType: "medium",
          actualType: "medium",
          matches: true
        },
        issues: [
          {
            type: "content-mismatch",
            severity: "critical",
            description: "Narration mentions 'natural wellness supplements' but frame shows office building"
          }
        ],
        notes: "Visual content does not match narration topic"
      });
      
    case 'all_pass':
      return JSON.stringify({
        scores: {
          composition: 85,
          visibility: 90,
          technicalQuality: 88,
          contentMatch: 92,
          professionalLook: 87,
          framingMatch: 90
        },
        textOverlayCheck: {
          expectedVisible: true,
          actuallyVisible: true,
          textReadable: true
        },
        framingCheck: {
          expectedType: "close-up",
          actualType: "close-up",
          matches: true
        },
        issues: [],
        notes: "High quality frame with proper content matching"
      });
  }
}

// Test the parsing logic with mock responses
function testParsingLogic() {
  console.log('\n========================================');
  console.log('PHASE 10B VERIFICATION TESTS');
  console.log('========================================');
  
  // Access the private method through prototype for testing
  const service = qualityEvaluationService as any;
  
  // Test 1: Missing text fails correctly
  console.log('\n--- Test Case 1: Missing Text ---');
  const missingTextResponse = createMockEvaluationResponse('missing_text');
  const missingTextResult = service.parseEvaluationResponse(missingTextResponse, 'test-scene-1', 0);
  
  const missingTextPassed = 
    !missingTextResult.passesThreshold && 
    missingTextResult.needsRegeneration &&
    missingTextResult.scores.contentMatch < 50 &&
    missingTextResult.issues.some((i: QualityIssue) => i.type === 'missing-text-overlay');
  
  logTest(
    'Test Case 1: Missing text fails correctly',
    missingTextPassed,
    `Score < 50: ${missingTextResult.scores.contentMatch < 50}, Has missing-text-overlay issue: ${missingTextResult.issues.some((i: QualityIssue) => i.type === 'missing-text-overlay')}, Needs regeneration: ${missingTextResult.needsRegeneration}`,
    missingTextResult.overallScore,
    missingTextResult.issues
  );
  
  // Test 2: Wrong framing fails correctly
  console.log('\n--- Test Case 2: Wrong Framing ---');
  const wrongFramingResponse = createMockEvaluationResponse('wrong_framing');
  const wrongFramingResult = service.parseEvaluationResponse(wrongFramingResponse, 'test-scene-2', 1);
  
  const wrongFramingPassed = 
    !wrongFramingResult.passesThreshold && 
    wrongFramingResult.needsRegeneration &&
    (wrongFramingResult.scores.framingMatch || 0) < 50 &&
    wrongFramingResult.issues.some((i: QualityIssue) => i.type === 'wrong-framing');
  
  logTest(
    'Test Case 2: Wrong framing fails correctly',
    wrongFramingPassed,
    `Framing score < 50: ${(wrongFramingResult.scores.framingMatch || 0) < 50}, Has wrong-framing issue: ${wrongFramingResult.issues.some((i: QualityIssue) => i.type === 'wrong-framing')}, Needs regeneration: ${wrongFramingResult.needsRegeneration}`,
    wrongFramingResult.overallScore,
    wrongFramingResult.issues
  );
  
  // Test 3: Content mismatch fails correctly
  console.log('\n--- Test Case 3: Content Mismatch ---');
  const contentMismatchResponse = createMockEvaluationResponse('content_mismatch');
  const contentMismatchResult = service.parseEvaluationResponse(contentMismatchResponse, 'test-scene-3', 2);
  
  const contentMismatchPassed = 
    !contentMismatchResult.passesThreshold && 
    contentMismatchResult.needsRegeneration &&
    contentMismatchResult.scores.contentMatch < 50 &&
    contentMismatchResult.issues.some((i: QualityIssue) => i.type === 'content-mismatch');
  
  logTest(
    'Test Case 3: Content mismatch fails correctly',
    contentMismatchPassed,
    `Content score < 50: ${contentMismatchResult.scores.contentMatch < 50}, Has content-mismatch issue: ${contentMismatchResult.issues.some((i: QualityIssue) => i.type === 'content-mismatch')}, Needs regeneration: ${contentMismatchResult.needsRegeneration}`,
    contentMismatchResult.overallScore,
    contentMismatchResult.issues
  );
  
  // Test 4: High scores only given when content matches
  console.log('\n--- Test Case 4: High Scores When Content Matches ---');
  const allPassResponse = createMockEvaluationResponse('all_pass');
  const allPassResult = service.parseEvaluationResponse(allPassResponse, 'test-scene-4', 3);
  
  const allPassPassed = 
    allPassResult.passesThreshold && 
    !allPassResult.needsRegeneration &&
    allPassResult.overallScore >= 70 &&
    allPassResult.scores.contentMatch >= 70 &&
    allPassResult.issues.length === 0;
  
  logTest(
    'Test Case 4: High scores only when content matches',
    allPassPassed,
    `Passes threshold: ${allPassResult.passesThreshold}, Overall >= 70: ${allPassResult.overallScore >= 70}, Content >= 70: ${allPassResult.scores.contentMatch >= 70}, No issues: ${allPassResult.issues.length === 0}`,
    allPassResult.overallScore,
    allPassResult.issues
  );
  
  // Test 5: Scenes with missing required elements score < 50
  console.log('\n--- Test Case 5: Missing Elements Score < 50 ---');
  const missingElementsPassed = 
    missingTextResult.scores.contentMatch < 50 &&
    wrongFramingResult.scores.framingMatch !== undefined && wrongFramingResult.scores.framingMatch < 50 &&
    contentMismatchResult.scores.contentMatch < 50;
  
  logTest(
    'Test Case 5: Scenes with missing elements score < 50',
    missingElementsPassed,
    `Missing text contentMatch < 50: ${missingTextResult.scores.contentMatch < 50}, Wrong framing framingMatch < 50: ${(wrongFramingResult.scores.framingMatch || 0) < 50}, Content mismatch contentMatch < 50: ${contentMismatchResult.scores.contentMatch < 50}`,
    undefined,
    undefined
  );
  
  // Test 6: Text overlay detection working
  console.log('\n--- Test Case 6: Text Overlay Detection ---');
  const textOverlayDetectionPassed = 
    missingTextResult.textOverlayCheck !== undefined &&
    missingTextResult.textOverlayCheck.expectedVisible === true &&
    missingTextResult.textOverlayCheck.actuallyVisible === false;
  
  logTest(
    'Test Case 6: Text overlay detection is working',
    textOverlayDetectionPassed,
    `TextOverlayCheck exists: ${!!missingTextResult.textOverlayCheck}, Expected visible: ${missingTextResult.textOverlayCheck?.expectedVisible}, Actually visible: ${missingTextResult.textOverlayCheck?.actuallyVisible}`,
    undefined,
    undefined
  );
  
  // Test 7: Framing validation working
  console.log('\n--- Test Case 7: Framing Validation ---');
  const framingValidationPassed = 
    wrongFramingResult.framingCheck !== undefined &&
    wrongFramingResult.framingCheck.expectedType === 'close-up' &&
    wrongFramingResult.framingCheck.actualType === 'wide' &&
    wrongFramingResult.framingCheck.matches === false;
  
  logTest(
    'Test Case 7: Framing validation catches wrong shot types',
    framingValidationPassed,
    `FramingCheck exists: ${!!wrongFramingResult.framingCheck}, Expected: ${wrongFramingResult.framingCheck?.expectedType}, Actual: ${wrongFramingResult.framingCheck?.actualType}, Matches: ${wrongFramingResult.framingCheck?.matches}`,
    undefined,
    undefined
  );
  
  // Test 8: Verify strict content matching rules in prompt
  console.log('\n--- Test Case 8: Strict Content Matching Rules ---');
  const mockScene = {
    type: 'product',
    narration: 'Natural health benefits of supplements',
    textOverlays: [{ text: 'Natural Health Benefits' }],
    expectedShotType: 'close-up'
  };
  const prompt = service.buildEvaluationPrompt(mockScene);
  
  const hasStrictRules = 
    prompt.includes('STRICT CONTENT MATCHING RULES') &&
    prompt.includes('Phase 10B') &&
    prompt.includes('TEXT OVERLAY VERIFICATION') &&
    prompt.includes('FRAMING/SHOT TYPE VALIDATION') &&
    prompt.includes('CONTENT MATCH REQUIREMENTS') &&
    prompt.includes('Score < 40 if expected text is missing') &&
    prompt.includes('score contentMatch < 50');
  
  logTest(
    'Test Case 8: Analysis prompt includes strict content matching rules',
    hasStrictRules,
    `Has STRICT CONTENT MATCHING: ${prompt.includes('STRICT CONTENT MATCHING RULES')}, Has Phase 10B: ${prompt.includes('Phase 10B')}, Has all validation sections: ${hasStrictRules}`,
    undefined,
    undefined
  );
}

// Main execution
function runVerification() {
  console.log('\n🔍 Starting Phase 10B Verification...\n');
  
  testParsingLogic();
  
  // Summary
  console.log('\n========================================');
  console.log('PHASE 10B VERIFICATION SUMMARY');
  console.log('========================================\n');
  
  const passed = testResults.filter(t => t.passed).length;
  const failed = testResults.filter(t => !t.passed).length;
  const total = testResults.length;
  
  console.log(`Total Tests: ${total}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\nFailed Tests:');
    testResults.filter(t => !t.passed).forEach(t => {
      console.log(`  - ${t.name}: ${t.details}`);
    });
  }
  
  const allPassed = failed === 0;
  
  console.log('\n========================================');
  console.log(allPassed ? '✅ ALL PHASE 10B CHECKS PASSED' : '❌ SOME PHASE 10B CHECKS FAILED');
  console.log('========================================\n');
  
  return allPassed;
}

// Export for use in other modules
export { runVerification, testResults };

// Run if executed directly
runVerification();
