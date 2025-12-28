# Phase 6B: Script Parsing Context

## Objective

Inject Pine Hill Farm brand knowledge into the script parsing service so Claude understands the brand's products, services, terminology, and audience when analyzing video scripts. This enables smarter scene detection and content recommendations.

## Prerequisites

- Phase 6A complete (Brand Context Service working)
- Script parsing service exists (from Phase 1/2)
- Claude API integration working

## What This Phase Modifies

- `server/services/script-parser-service.ts` - Add brand context to Claude prompts
- Script parsing prompts - Include brand terminology and services

## What Success Looks Like

**Before (Generic Parsing):**
```
Script: "Tired of fatigue and brain fog? Your gut holds the answer."

Parsed:
- Scene 1: Problem scene, generic health issue
- Scene 2: Solution scene, generic
```

**After (Brand-Aware Parsing):**
```
Script: "Tired of fatigue and brain fog? Your gut holds the answer."

Parsed:
- Scene 1: Problem scene
  - PHF Service Match: GI360 Microbiome Profile
  - Condition: Gut health issues, chronic fatigue
  - Suggested Visual: Person looking tired in natural setting
  - Brand Connection: Root cause approach
  
- Scene 2: Solution scene
  - PHF Product Match: Gut Health Supplements
  - Service: Supplement Consultation
  - Suggested Visual: Wellness consultation, natural products
```

---

## Step 1: Update Script Parser Service

Update `server/services/script-parser-service.ts`:

### Add import:
```typescript
import { brandContextService } from './brand-context-service';
```

### Update the parseScript method:

```typescript
async parseScript(
  script: string,
  options: {
    platform: string;
    visualStyle: string;
    targetDuration?: number;
  }
): Promise<ParsedScript> {
  console.log('[ScriptParser] Starting brand-aware script parsing...');

  // Load brand context
  const brandContext = await brandContextService.getScriptParsingContext();
  const serviceMatches = await brandContextService.matchScriptToServices(script);
  
  console.log(`[ScriptParser] Brand matches - Services: ${serviceMatches.services.length}, Products: ${serviceMatches.products.length}`);

  // Build the brand-aware parsing prompt
  const systemPrompt = this.buildBrandAwareSystemPrompt(brandContext);
  const userPrompt = this.buildParsingPrompt(script, options, serviceMatches);

  try {
    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    return this.parseResponse(content.text, serviceMatches);

  } catch (error: any) {
    console.error('[ScriptParser] Parsing failed:', error.message);
    throw error;
  }
}
```

### Add the brand-aware system prompt builder:

```typescript
private buildBrandAwareSystemPrompt(brandContext: string): string {
  return `You are an expert video script parser for Pine Hill Farm, a farm-to-wellness brand.

${brandContext}

YOUR ROLE:
You parse video scripts into scenes, identifying:
1. Scene breaks and types (hook, problem, solution, benefit, testimonial, cta)
2. Pine Hill Farm service/product connections for each scene
3. Visual directions that match the brand's warm, natural aesthetic
4. Target audience resonance points
5. Brand messaging opportunities

SCENE TYPES FOR PINE HILL FARM:
- "hook": Opening that captures attention, often showing a relatable health struggle
- "problem": Depicts the health challenge (fatigue, gut issues, hormone problems)
- "agitation": Deepens the pain point (conventional medicine frustrations)
- "solution": Introduces Pine Hill Farm's approach (root cause, holistic)
- "benefit": Shows transformation and positive outcomes
- "proof": Social proof, credentials, certifications
- "product": Showcases specific products or services
- "testimonial": Customer success stories
- "cta": Call to action (visit website, book consultation)

VISUAL STYLE FOR PINE HILL FARM:
- Warm, golden lighting (NOT clinical/cold)
- Natural settings: farm fields, gardens, cozy interiors, spa environments
- Real people with authentic expressions (NOT stock photo models)
- Earth tones: greens, browns, warm golds
- Organic textures: wood, plants, natural materials
- Family farm feel, NOT corporate wellness

OUTPUT FORMAT:
Return a JSON object with scenes array. Each scene should include:
- id: unique identifier
- type: scene type from list above
- narration: the script text for this scene
- duration: estimated seconds (based on reading speed ~150 words/min)
- visualDirection: detailed visual description matching PHF aesthetic
- serviceMatch: Pine Hill Farm service if relevant
- productMatch: Pine Hill Farm product if relevant
- conditionMatch: Health condition being addressed
- audienceResonance: Why this connects with target audience
- brandOpportunity: Messaging opportunity for PHF values`;
}
```

### Add the parsing prompt builder:

```typescript
private buildParsingPrompt(
  script: string,
  options: { platform: string; visualStyle: string; targetDuration?: number },
  serviceMatches: { services: string[]; products: string[]; conditions: string[] }
): string {
  return `Parse this video script for Pine Hill Farm.

PLATFORM: ${options.platform}
VISUAL STYLE: ${options.visualStyle}
${options.targetDuration ? `TARGET DURATION: ${options.targetDuration} seconds` : ''}

PRE-IDENTIFIED MATCHES (use these as hints):
- Services mentioned: ${serviceMatches.services.join(', ') || 'None detected'}
- Products mentioned: ${serviceMatches.products.join(', ') || 'None detected'}
- Health conditions: ${serviceMatches.conditions.join(', ') || 'None detected'}

SCRIPT TO PARSE:
"""
${script}
"""

Parse this into scenes with Pine Hill Farm brand awareness. For each scene:
1. Identify the scene type and purpose
2. Connect to relevant PHF services/products
3. Write visual directions that match PHF's warm, natural aesthetic
4. Note audience resonance and brand opportunities

Return ONLY valid JSON matching this structure:
{
  "scenes": [
    {
      "id": "scene-1",
      "type": "hook|problem|solution|benefit|cta|etc",
      "narration": "exact script text for this scene",
      "duration": 5,
      "visualDirection": "detailed visual matching PHF aesthetic",
      "serviceMatch": "PHF service name or null",
      "productMatch": "PHF product name or null",
      "conditionMatch": "health condition or null",
      "audienceResonance": "why this connects with target audience",
      "brandOpportunity": "PHF value or messaging opportunity"
    }
  ],
  "summary": {
    "totalDuration": 60,
    "sceneCount": 8,
    "primaryService": "main PHF service featured",
    "targetConditions": ["list of conditions addressed"],
    "brandAlignment": "how well this aligns with PHF messaging"
  }
}`;
}
```

### Update the response parser:

```typescript
private parseResponse(
  responseText: string,
  serviceMatches: { services: string[]; products: string[]; conditions: string[] }
): ParsedScript {
  try {
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate and enhance scenes
    const scenes = parsed.scenes.map((scene: any, index: number) => ({
      id: scene.id || `scene-${index + 1}`,
      type: this.validateSceneType(scene.type),
      narration: scene.narration || '',
      duration: scene.duration || 5,
      visualDirection: scene.visualDirection || '',
      
      // Brand-specific fields
      serviceMatch: scene.serviceMatch || null,
      productMatch: scene.productMatch || null,
      conditionMatch: scene.conditionMatch || null,
      audienceResonance: scene.audienceResonance || null,
      brandOpportunity: scene.brandOpportunity || null,
      
      // Add content type based on scene analysis
      contentType: this.inferContentType(scene),
      
      // Status for generation tracking
      status: 'pending',
    }));

    console.log(`[ScriptParser] Parsed ${scenes.length} scenes with brand awareness`);

    return {
      scenes,
      summary: parsed.summary || {
        totalDuration: scenes.reduce((sum: number, s: any) => sum + s.duration, 0),
        sceneCount: scenes.length,
        primaryService: serviceMatches.services[0] || null,
        targetConditions: serviceMatches.conditions,
        brandAlignment: 'Analyzed',
      },
    };

  } catch (error: any) {
    console.error('[ScriptParser] Failed to parse response:', error.message);
    throw error;
  }
}

private validateSceneType(type: string): string {
  const validTypes = [
    'hook', 'problem', 'agitation', 'solution', 'benefit',
    'proof', 'product', 'testimonial', 'cta', 'explanation',
    'story', 'broll', 'process'
  ];
  return validTypes.includes(type) ? type : 'broll';
}

private inferContentType(scene: any): string {
  const narration = (scene.narration || '').toLowerCase();
  const visual = (scene.visualDirection || '').toLowerCase();
  const combined = narration + ' ' + visual;

  if (combined.includes('person') || combined.includes('woman') || 
      combined.includes('man') || combined.includes('people') ||
      combined.includes('face') || combined.includes('customer')) {
    return 'person';
  }
  if (combined.includes('product') || combined.includes('supplement') ||
      combined.includes('bottle') || combined.includes('package')) {
    return 'product';
  }
  if (combined.includes('farm') || combined.includes('field') ||
      combined.includes('garden') || combined.includes('nature') ||
      combined.includes('outdoor')) {
    return 'nature';
  }
  if (combined.includes('abstract') || combined.includes('concept') ||
      combined.includes('metaphor')) {
    return 'abstract';
  }
  return 'lifestyle';
}
```

---

## Step 2: Update Scene Type Definitions

Add to your types file or update the scene interface:

```typescript
export interface ParsedScene {
  id: string;
  type: string;
  narration: string;
  duration: number;
  visualDirection: string;
  contentType: string;
  status: string;
  
  // Brand-specific fields (Phase 6)
  serviceMatch?: string | null;
  productMatch?: string | null;
  conditionMatch?: string | null;
  audienceResonance?: string | null;
  brandOpportunity?: string | null;
}

export interface ParsedScript {
  scenes: ParsedScene[];
  summary: {
    totalDuration: number;
    sceneCount: number;
    primaryService?: string | null;
    targetConditions?: string[];
    brandAlignment?: string;
  };
}
```

---

## Step 3: Update the Parse Script API Endpoint

Update the script parsing endpoint to include brand matches in response:

```typescript
router.post('/api/parse-script', async (req, res) => {
  try {
    const { script, platform, visualStyle, targetDuration } = req.body;

    const parsed = await scriptParserService.parseScript(script, {
      platform,
      visualStyle,
      targetDuration,
    });

    // Include brand context summary
    const serviceMatches = await brandContextService.matchScriptToServices(script);

    res.json({
      ...parsed,
      brandMatches: serviceMatches,
    });

  } catch (error: any) {
    console.error('[API] Script parsing failed:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

## Step 4: Test Brand-Aware Parsing

Test with a Pine Hill Farm relevant script:

```bash
curl -X POST http://localhost:5000/api/parse-script \
  -H "Content-Type: application/json" \
  -d '{
    "script": "Are you tired of feeling exhausted, dealing with brain fog, and struggling with your weight? You have tried everything but nothing seems to work. The truth is, your gut might be the root cause of all these issues. At Pine Hill Farm, we use advanced microbiome testing to uncover what is really going on inside your body. Our GI360 test analyzes over 45 markers to identify imbalances. Combined with our organic supplements and personalized consultation, we help you restore balance naturally. Start your wellness journey today at pinehillfarm.co",
    "platform": "YouTube",
    "visualStyle": "warm"
  }'
```

Expected response should include:
- Scenes with `serviceMatch: "GI360 Microbiome Profile"`
- Scenes with `productMatch: "Gut Health Supplements"`
- Scenes with `conditionMatch: "Gut health issues, chronic fatigue"`
- Visual directions mentioning warm lighting, natural settings

---

## Verification Checklist

Before moving to Phase 6C, confirm:

- [ ] Script parser imports brand context service
- [ ] System prompt includes full brand context
- [ ] Service matches are pre-identified before Claude call
- [ ] Parsed scenes include `serviceMatch`, `productMatch`, `conditionMatch`
- [ ] Visual directions reflect PHF aesthetic
- [ ] `audienceResonance` explains target audience connection
- [ ] `brandOpportunity` identifies messaging opportunities
- [ ] Content type is inferred correctly
- [ ] API response includes brand matches summary
- [ ] Console shows brand-aware parsing logs

---

## Example Parsed Output

```json
{
  "scenes": [
    {
      "id": "scene-1",
      "type": "hook",
      "narration": "Are you tired of feeling exhausted, dealing with brain fog, and struggling with your weight?",
      "duration": 5,
      "visualDirection": "Woman in her 40s sitting in a sunlit room, looking tired but hopeful. Warm, golden morning light through windows. Natural wood furniture, plants visible. Authentic, relatable expression of fatigue. Earth tones in clothing and decor.",
      "contentType": "person",
      "serviceMatch": null,
      "productMatch": null,
      "conditionMatch": "Chronic fatigue, brain fog, weight management",
      "audienceResonance": "Directly speaks to primary audience pain points - women 35-65 dealing with multiple symptoms",
      "brandOpportunity": "Root cause approach - these symptoms are connected"
    },
    {
      "id": "scene-2",
      "type": "problem",
      "narration": "You have tried everything but nothing seems to work.",
      "duration": 4,
      "visualDirection": "Same woman looking at various conventional medicine bottles, frustrated expression. Kitchen or bathroom setting with natural light. Show discarded diet books, fitness trackers. Authentic frustration, not overdramatic.",
      "contentType": "person",
      "serviceMatch": null,
      "productMatch": null,
      "conditionMatch": "Treatment resistance",
      "audienceResonance": "Validates frustration with conventional approaches - core audience experience",
      "brandOpportunity": "PHF difference - we find root cause when others haven't"
    },
    {
      "id": "scene-3",
      "type": "solution",
      "narration": "The truth is, your gut might be the root cause of all these issues.",
      "duration": 4,
      "visualDirection": "Gentle transition to educational visual. Abstract representation of gut-body connection using natural imagery - tree roots, flowing water. Warm color palette. Could show PHF wellness center interior briefly.",
      "contentType": "abstract",
      "serviceMatch": "GI360 Microbiome Profile",
      "productMatch": null,
      "conditionMatch": "Gut health issues",
      "audienceResonance": "Provides answer they've been seeking - gut-health connection",
      "brandOpportunity": "Root cause medicine philosophy - 'why' not just 'what'"
    }
  ],
  "summary": {
    "totalDuration": 60,
    "sceneCount": 8,
    "primaryService": "GI360 Microbiome Profile",
    "targetConditions": ["Gut health issues", "Chronic fatigue", "Weight management"],
    "brandAlignment": "Strong - addresses root cause philosophy, targets primary demographic"
  },
  "brandMatches": {
    "services": ["GI360 Microbiome Profile", "Supplement/Medication Consultation"],
    "products": ["Gut Health Supplements", "Proprietary Supplements"],
    "conditions": ["Gut health issues", "Chronic fatigue and brain fog", "Weight management struggles"]
  }
}
```

---

## Troubleshooting

### "Brand context not loading"
- Check Phase 6A is complete
- Verify JSON file path is correct
- Check for import errors

### "Service matches are empty"
- Script may not contain enough keywords
- Check matchScriptToServices logic
- Try with more explicit product/service mentions

### "Visual directions still generic"
- Ensure system prompt includes full brand context
- Check that PHF aesthetic guidelines are in prompt
- Verify Claude is using the brand context

---

## Next Phase

Once Script Parsing Context is working, proceed to **Phase 6C: Visual Analysis Context** to inject brand knowledge into scene analysis.
