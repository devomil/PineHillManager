/**
 * Phase 11A Verification: AI Prompt Sanitization
 * 
 * Verifies that prompt sanitizer correctly:
 * 1. Removes text/logo requests from prompts
 * 2. Extracts text content for Remotion overlays
 * 3. Adds "no text" instruction to all prompts
 * 4. Handles brand name removal
 * 5. Handles CTA/button text extraction
 */

import { sanitizePromptForAI, sceneTypicallyNeedsText, enhancePromptForProvider } from './services/prompt-sanitizer';

interface TestCase {
  name: string;
  input: string;
  sceneType: string;
  expected: {
    shouldContainNoTextInstruction: boolean;
    shouldNotContain: string[];
    shouldExtractText?: string[];
    shouldExtractLogos?: string[];
    shouldRemoveElements?: boolean;
  };
}

const testCases: TestCase[] = [
  {
    name: 'CTA Scene with Logo and Button',
    input: 'Welcoming wellness center entrance with natural landscaping, golden hour lighting, Pine Hill Farm logo, Book Now button',
    sceneType: 'cta',
    expected: {
      shouldContainNoTextInstruction: true,
      shouldNotContain: ['Pine Hill Farm logo', 'Book Now button', 'pine hill farm'],
      shouldExtractText: ['Book Now'],
      shouldExtractLogos: ['Pine Hill Farm'],
      shouldRemoveElements: true,
    },
  },
  {
    name: 'Benefits Scene with Text Overlay',
    input: 'Professional health coach in modern office, text overlay showing "Personalized Wellness Plans", warm lighting',
    sceneType: 'benefit',
    expected: {
      shouldContainNoTextInstruction: true,
      shouldNotContain: ['text overlay showing', '"Personalized Wellness Plans"'],
      shouldExtractText: ['Personalized Wellness Plans'],
      shouldRemoveElements: true,
    },
  },
  {
    name: 'Condition Scene with Text Labels',
    input: 'Hands holding growing plant with glowing particles, Autoimmune and Mold/Mycotoxins text labels',
    sceneType: 'explanation',
    expected: {
      shouldContainNoTextInstruction: true,
      shouldNotContain: ['text labels'],
      shouldRemoveElements: true,
    },
  },
  {
    name: 'Scene with Multiple CTA Buttons',
    input: 'Beautiful storefront with Learn More button, Get Started button, and Contact Us CTA',
    sceneType: 'cta',
    expected: {
      shouldContainNoTextInstruction: true,
      shouldNotContain: ['Learn More button', 'Get Started button', 'Contact Us CTA'],
      shouldExtractText: ['Learn More', 'Get Started', 'Contact Us'],
      shouldRemoveElements: true,
    },
  },
  {
    name: 'Scene with Brand Names',
    input: 'Pine Hill Farm wellness center with PHF logo and natural products display',
    sceneType: 'intro',
    expected: {
      shouldContainNoTextInstruction: true,
      shouldNotContain: ['PHF logo'],
      shouldExtractLogos: ['PHF'],
      shouldRemoveElements: true,
    },
  },
  {
    name: 'Clean Scene (No Text/Logos)',
    input: 'Beautiful sunset over rolling hills with natural landscaping and warm golden hour lighting',
    sceneType: 'hook',
    expected: {
      shouldContainNoTextInstruction: true,
      shouldNotContain: [],
      shouldRemoveElements: false,
    },
  },
  {
    name: 'Scene with Title and Headline',
    input: 'Modern office with title "Welcome to Wellness" headline, professional setting',
    sceneType: 'intro',
    expected: {
      shouldContainNoTextInstruction: true,
      shouldNotContain: ['title', 'headline'],
      shouldExtractText: ['Welcome to Wellness'],
      shouldRemoveElements: true,
    },
  },
  {
    name: 'Scene with Watermark Request',
    input: 'Product showcase with company watermark and branding elements',
    sceneType: 'product',
    expected: {
      shouldContainNoTextInstruction: true,
      shouldNotContain: ['company watermark', 'branding elements'],
      shouldRemoveElements: true,
    },
  },
];

function runTests(): void {
  console.log('========================================================');
  console.log('PHASE 11A VERIFICATION: AI PROMPT SANITIZATION');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;
  const failures: string[] = [];

  for (const testCase of testCases) {
    console.log(`--- Testing: ${testCase.name} ---`);
    console.log(`Input: "${testCase.input.substring(0, 60)}..."`);
    
    const result = sanitizePromptForAI(testCase.input, testCase.sceneType);
    
    let testPassed = true;
    
    // Check 1: "No text" instruction present
    if (testCase.expected.shouldContainNoTextInstruction) {
      const hasNoTextInstruction = result.cleanPrompt.toLowerCase().includes('do not include any text');
      if (!hasNoTextInstruction) {
        console.log(`  ✗ Missing "no text" instruction`);
        failures.push(`${testCase.name}: Missing "no text" instruction`);
        testPassed = false;
      } else {
        console.log(`  ✓ Contains "no text" instruction`);
      }
    }
    
    // Check 2: Forbidden content removed
    for (const forbidden of testCase.expected.shouldNotContain) {
      if (result.cleanPrompt.toLowerCase().includes(forbidden.toLowerCase())) {
        console.log(`  ✗ Still contains forbidden: "${forbidden}"`);
        failures.push(`${testCase.name}: Still contains "${forbidden}"`);
        testPassed = false;
      } else {
        console.log(`  ✓ Removed: "${forbidden}"`);
      }
    }
    
    // Check 3: Text extracted for overlays
    if (testCase.expected.shouldExtractText) {
      for (const expectedText of testCase.expected.shouldExtractText) {
        const found = result.extractedText.some(t => 
          t.toLowerCase().includes(expectedText.toLowerCase()) ||
          expectedText.toLowerCase().includes(t.toLowerCase())
        );
        if (!found) {
          console.log(`  ✗ Failed to extract text: "${expectedText}"`);
          console.log(`    Extracted: ${JSON.stringify(result.extractedText)}`);
          failures.push(`${testCase.name}: Failed to extract "${expectedText}"`);
          testPassed = false;
        } else {
          console.log(`  ✓ Extracted text: "${expectedText}"`);
        }
      }
    }
    
    // Check 4: Logos extracted
    if (testCase.expected.shouldExtractLogos) {
      for (const expectedLogo of testCase.expected.shouldExtractLogos) {
        const found = result.extractedLogos.some(l => 
          l.toLowerCase().includes(expectedLogo.toLowerCase())
        );
        if (!found) {
          console.log(`  ✗ Failed to extract logo: "${expectedLogo}"`);
          console.log(`    Extracted logos: ${JSON.stringify(result.extractedLogos)}`);
          failures.push(`${testCase.name}: Failed to extract logo "${expectedLogo}"`);
          testPassed = false;
        } else {
          console.log(`  ✓ Extracted logo: "${expectedLogo}"`);
        }
      }
    }
    
    // Check 5: Elements removed
    if (testCase.expected.shouldRemoveElements) {
      if (result.removedElements.length === 0) {
        console.log(`  ✗ Expected elements to be removed, but none were`);
        failures.push(`${testCase.name}: No elements removed`);
        testPassed = false;
      } else {
        console.log(`  ✓ Removed ${result.removedElements.length} element(s)`);
      }
    } else if (testCase.expected.shouldRemoveElements === false) {
      if (result.removedElements.length > 0) {
        console.log(`  ! Removed elements from clean scene: ${result.removedElements.join(', ')}`);
      } else {
        console.log(`  ✓ Clean scene - no elements to remove`);
      }
    }
    
    if (testPassed) {
      passed++;
      console.log(`  PASSED ✓`);
    } else {
      failed++;
      console.log(`  FAILED ✗`);
    }
    
    console.log(`  Clean prompt: "${result.cleanPrompt.substring(0, 80)}..."`);
    console.log('');
  }

  // Test provider enhancements
  console.log('--- Testing Provider Enhancements ---');
  const testPrompt = 'Beautiful sunset scene with warm lighting.';
  const providers = ['runway', 'kling', 'luma', 'hailuo', 'flux'];
  
  for (const provider of providers) {
    const enhanced = enhancePromptForProvider(testPrompt, provider);
    const hasPrefix = enhanced !== testPrompt;
    console.log(`  ${provider}: ${hasPrefix ? '✓ Enhanced' : '○ Unchanged'} - "${enhanced.substring(0, 50)}..."`);
  }
  
  // Test scene type detection
  console.log('\n--- Testing Scene Type Detection ---');
  const textSceneTypes = ['cta', 'call_to_action', 'intro', 'benefits', 'pricing'];
  const nonTextSceneTypes = ['hook', 'problem', 'agitation'];
  
  for (const sceneType of textSceneTypes) {
    const needsText = sceneTypicallyNeedsText(sceneType);
    console.log(`  ${sceneType}: ${needsText ? '✓ Needs text overlays' : '✗ Should need text'}`);
    if (!needsText) {
      failed++;
      failures.push(`Scene type "${sceneType}" should need text overlays`);
    } else {
      passed++;
    }
  }
  
  console.log('\n========================================================');
  console.log('PHASE 11A VERIFICATION SUMMARY');
  console.log('========================================================\n');
  
  console.log(`Total Tests: ${passed + failed}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  
  if (failures.length > 0) {
    console.log('\nFailures:');
    failures.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
  }
  
  if (failed === 0) {
    console.log('\n✓ ALL PHASE 11A TESTS PASSED');
  } else {
    console.log('\n✗ SOME TESTS FAILED');
    process.exit(1);
  }
}

runTests();
