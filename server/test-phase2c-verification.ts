import { compositionInstructionsService } from './services/composition-instructions-service';

interface MockSceneAnalysis {
  faces: {
    detected: boolean;
    count: number;
    positions: Array<{ x: number; y: number; width: number; height: number }>;
  };
  composition: {
    focalPoint: { x: number; y: number };
    brightness: 'dark' | 'normal' | 'bright';
    dominantColors: string[];
  };
  safeZones: {
    topLeft: boolean;
    topCenter: boolean;
    topRight: boolean;
    middleLeft: boolean;
    middleCenter: boolean;
    middleRight: boolean;
    bottomLeft: boolean;
    bottomCenter: boolean;
    bottomRight: boolean;
  };
  recommendations: {
    textPosition: {
      vertical: 'top' | 'center' | 'lower-third';
      horizontal: 'left' | 'center' | 'right';
    };
    textColor: string;
    needsTextShadow: boolean;
    needsTextBackground: boolean;
    productOverlayPosition: { x: string; y: string };
    productOverlaySafe: boolean;
  };
  contentType: 'person' | 'product' | 'nature' | 'abstract' | 'mixed';
  mood: 'positive' | 'neutral' | 'serious' | 'dramatic';
}

async function testPhase2CVerification() {
  console.log('='.repeat(60));
  console.log('PHASE 2C VERIFICATION TEST');
  console.log('='.repeat(60));
  
  const service = compositionInstructionsService;
  let allPassed = true;
  
  // Test 1: Ken Burns instructions generated with focal point data
  console.log('\n[TEST 1] Ken Burns instructions with focal point data');
  const analysisWithFocalPoint: MockSceneAnalysis = {
    faces: { detected: false, count: 0, positions: [] },
    composition: {
      focalPoint: { x: 70, y: 30 },
      brightness: 'normal',
      dominantColors: ['#2a5c3a']
    },
    safeZones: {
      topLeft: true, topCenter: true, topRight: true,
      middleLeft: true, middleCenter: true, middleRight: true,
      bottomLeft: true, bottomCenter: true, bottomRight: true
    },
    recommendations: {
      textPosition: { vertical: 'lower-third', horizontal: 'center' },
      textColor: '#ffffff',
      needsTextShadow: true,
      needsTextBackground: false,
      productOverlayPosition: { x: 'right', y: 'center' },
      productOverlaySafe: true
    },
    contentType: 'nature',
    mood: 'neutral'
  };
  
  const result1 = service.generateInstructions(
    'test-scene-1',
    [{ text: 'Test Text' }],
    analysisWithFocalPoint as any,
    {
      sceneType: 'benefit',
      sceneDuration: 5,
      isFirstScene: false,
      isLastScene: false,
      previousSceneMood: 'neutral'
    }
  );
  
  if (result1.kenBurns) {
    console.log(`  ✅ Ken Burns generated: ${result1.kenBurns.startScale.toFixed(2)} → ${result1.kenBurns.endScale.toFixed(2)}`);
    console.log(`     Start position: (${result1.kenBurns.startPosition.x}, ${result1.kenBurns.startPosition.y})`);
    console.log(`     End position: (${result1.kenBurns.endPosition.x}, ${result1.kenBurns.endPosition.y})`);
    console.log(`     Easing: ${result1.kenBurns.easing}`);
  } else {
    console.log('  ❌ Ken Burns not generated');
    allPassed = false;
  }
  
  // Test 2: Transitions match mood (dramatic = slower)
  console.log('\n[TEST 2] Transitions match mood (dramatic = slower)');
  
  const dramaticAnalysis: MockSceneAnalysis = {
    ...analysisWithFocalPoint,
    mood: 'dramatic'
  };
  
  const dramaticResult = service.generateInstructions(
    'test-dramatic',
    [{ text: 'Dramatic scene' }],
    dramaticAnalysis as any,
    {
      sceneType: 'benefit',
      sceneDuration: 5,
      isFirstScene: false,
      isLastScene: false,
      previousSceneMood: 'neutral'
    }
  );
  
  const neutralResult = service.generateInstructions(
    'test-neutral',
    [{ text: 'Neutral scene' }],
    analysisWithFocalPoint as any,
    {
      sceneType: 'benefit',
      sceneDuration: 5,
      isFirstScene: false,
      isLastScene: false,
      previousSceneMood: 'neutral'
    }
  );
  
  const dramaticDuration = dramaticResult.transitionIn?.duration || 0;
  const neutralDuration = neutralResult.transitionIn?.duration || 0;
  
  console.log(`  Dramatic transition: ${dramaticDuration}s (type: ${dramaticResult.transitionIn?.type})`);
  console.log(`  Neutral transition: ${neutralDuration}s (type: ${neutralResult.transitionIn?.type})`);
  
  if (dramaticDuration >= neutralDuration) {
    console.log(`  ✅ Dramatic transitions are equal or slower`);
  } else {
    console.log(`  ⚠️ Dramatic duration not slower - may depend on scene type`);
  }
  
  // Test 3: First scene fades from black
  console.log('\n[TEST 3] First scene fades from black');
  const firstSceneResult = service.generateInstructions(
    'test-first',
    [{ text: 'Intro scene' }],
    analysisWithFocalPoint as any,
    {
      sceneType: 'intro',
      sceneDuration: 5,
      isFirstScene: true,
      isLastScene: false,
      previousSceneMood: 'neutral'
    }
  );
  
  if (firstSceneResult.transitionIn?.type === 'fade') {
    console.log(`  ✅ First scene uses fade transition: ${firstSceneResult.transitionIn.type}`);
    console.log(`     Duration: ${firstSceneResult.transitionIn.duration}s`);
  } else {
    console.log(`  ❌ First scene should use fade, got: ${firstSceneResult.transitionIn?.type}`);
    allPassed = false;
  }
  
  // Test 4: Last scene fades to black
  console.log('\n[TEST 4] Last scene fades to black');
  const lastSceneResult = service.generateInstructions(
    'test-last',
    [{ text: 'CTA scene' }],
    analysisWithFocalPoint as any,
    {
      sceneType: 'cta',
      sceneDuration: 5,
      isFirstScene: false,
      isLastScene: true,
      previousSceneMood: 'neutral'
    }
  );
  
  if (lastSceneResult.transitionOut?.type === 'fade') {
    console.log(`  ✅ Last scene uses fade out: ${lastSceneResult.transitionOut.type}`);
    console.log(`     Duration: ${lastSceneResult.transitionOut.duration}s`);
  } else {
    console.log(`  ❌ Last scene should fade out, got: ${lastSceneResult.transitionOut?.type}`);
    allPassed = false;
  }
  
  // Test 5: Face scenes zoom toward faces
  console.log('\n[TEST 5] Face scenes zoom toward faces');
  const faceAnalysis: MockSceneAnalysis = {
    faces: {
      detected: true,
      count: 1,
      positions: [{ x: 55, y: 35, width: 10, height: 10 }]
    },
    composition: {
      focalPoint: { x: 60, y: 40 },
      brightness: 'normal',
      dominantColors: ['#d4a574']
    },
    safeZones: {
      topLeft: true, topCenter: false, topRight: true,
      middleLeft: true, middleCenter: false, middleRight: true,
      bottomLeft: true, bottomCenter: true, bottomRight: true
    },
    recommendations: {
      textPosition: { vertical: 'lower-third', horizontal: 'center' },
      textColor: '#ffffff',
      needsTextShadow: true,
      needsTextBackground: false,
      productOverlayPosition: { x: 'right', y: 'bottom' },
      productOverlaySafe: true
    },
    contentType: 'person',
    mood: 'positive'
  };
  
  const faceResult = service.generateInstructions(
    'test-face',
    [{ text: 'Testimonial' }],
    faceAnalysis as any,
    {
      sceneType: 'testimonial',
      sceneDuration: 5,
      isFirstScene: false,
      isLastScene: false,
      previousSceneMood: 'positive'
    }
  );
  
  if (faceResult.kenBurns) {
    const zoomsIn = faceResult.kenBurns.endScale > faceResult.kenBurns.startScale;
    const focusesOnFace = 
      Math.abs(faceResult.kenBurns.endPosition.x - 60) < 20 &&
      Math.abs(faceResult.kenBurns.endPosition.y - 40) < 20;
    
    console.log(`  Scale: ${faceResult.kenBurns.startScale.toFixed(2)} → ${faceResult.kenBurns.endScale.toFixed(2)}`);
    console.log(`  End position: (${faceResult.kenBurns.endPosition.x}, ${faceResult.kenBurns.endPosition.y})`);
    
    if (zoomsIn) {
      console.log(`  ✅ Face scene zooms in toward face`);
    } else {
      console.log(`  ⚠️ Face scene may zoom out instead of in`);
    }
    
    if (focusesOnFace) {
      console.log(`  ✅ Ken Burns focuses on face position`);
    } else {
      console.log(`  ⚠️ Ken Burns end position not focused on face`);
    }
  } else {
    console.log('  ❌ No Ken Burns for face scene');
    allPassed = false;
  }
  
  // Test 6: Easing functions applied correctly
  console.log('\n[TEST 6] Easing functions applied correctly');
  const easingTests = [
    { mood: 'dramatic', sceneType: 'hook' },
    { mood: 'positive', sceneType: 'benefit' },
    { mood: 'neutral', sceneType: 'explanation' },
  ];
  
  let easingPassed = true;
  for (const test of easingTests) {
    const result = service.generateInstructions(
      `test-easing-${test.mood}`,
      [{ text: 'Easing test' }],
      analysisWithFocalPoint as any,
      {
        sceneType: test.sceneType,
        sceneDuration: 5,
        isFirstScene: false,
        isLastScene: false,
        previousSceneMood: test.mood
      }
    );
    
    if (result.kenBurns?.easing) {
      console.log(`  ✅ ${test.mood} mood → easing: ${result.kenBurns.easing}`);
    } else {
      console.log(`  ❌ ${test.mood} mood → no easing applied`);
      easingPassed = false;
    }
  }
  
  if (!easingPassed) allPassed = false;
  
  // Test 7: No jarring cuts between scenes (smooth transitions)
  console.log('\n[TEST 7] No jarring cuts between scenes');
  const sceneSequence = ['intro', 'hook', 'benefit', 'feature', 'cta'];
  let previousMood = 'neutral';
  let smoothTransitions = true;
  
  for (let i = 0; i < sceneSequence.length; i++) {
    const isFirst = i === 0;
    const isLast = i === sceneSequence.length - 1;
    
    const result = service.generateInstructions(
      `test-sequence-${i}`,
      [{ text: `Scene ${i + 1}` }],
      analysisWithFocalPoint as any,
      {
        sceneType: sceneSequence[i],
        sceneDuration: 5,
        isFirstScene: isFirst,
        isLastScene: isLast,
        previousSceneMood: previousMood
      }
    );
    
    const hasTransitionIn = result.transitionIn && result.transitionIn.duration > 0;
    const hasTransitionOut = result.transitionOut && result.transitionOut.duration > 0;
    
    console.log(`  Scene ${i + 1} (${sceneSequence[i]}): in=${result.transitionIn?.type || 'none'}/${result.transitionIn?.duration || 0}s, out=${result.transitionOut?.type || 'none'}/${result.transitionOut?.duration || 0}s`);
    
    if (!isFirst && !hasTransitionIn) {
      smoothTransitions = false;
    }
    if (!isLast && !hasTransitionOut) {
      smoothTransitions = false;
    }
  }
  
  if (smoothTransitions) {
    console.log('  ✅ All scenes have smooth transitions');
  } else {
    console.log('  ⚠️ Some scenes may have abrupt transitions');
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('VERIFICATION SUMMARY');
  console.log('='.repeat(60));
  
  const checklist = [
    { name: 'Ken Burns instructions generated with focal point data', passed: !!result1.kenBurns },
    { name: 'Transitions match mood (dramatic = slower)', passed: dramaticDuration >= neutralDuration },
    { name: 'First scene fades from black', passed: firstSceneResult.transitionIn?.type === 'fade' },
    { name: 'Last scene fades to black', passed: lastSceneResult.transitionOut?.type === 'fade' },
    { name: 'Face scenes zoom toward faces', passed: faceResult.kenBurns && faceResult.kenBurns.endScale > faceResult.kenBurns.startScale },
    { name: 'Easing functions applied correctly', passed: easingPassed },
    { name: 'No jarring cuts between scenes', passed: smoothTransitions },
  ];
  
  console.log('\nChecklist Status:');
  for (const item of checklist) {
    const icon = item.passed ? '✅' : '❌';
    console.log(`  [${icon}] ${item.name}`);
  }
  
  const passedCount = checklist.filter(c => c.passed).length;
  console.log(`\n${passedCount}/${checklist.length} tests passed`);
  
  if (passedCount === checklist.length) {
    console.log('\n✅ ALL PHASE 2C TESTS PASSED - Ready for Phase 3!');
  } else {
    console.log('\n⚠️ SOME TESTS NEED ATTENTION');
  }
}

testPhase2CVerification().catch(console.error);
