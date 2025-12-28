# Phase 6A: Brand Context Service

## Objective

Create a centralized brand context service that loads, stores, and provides Pine Hill Farm brand knowledge to all AI services. This includes structured brand data, terminology, products, services, and values.

## Prerequisites

- Phase 4A brand bible service exists
- Server services directory structure in place

## What This Phase Creates

- `server/brand-context/pine-hill-farm.json` - Structured brand data
- `server/services/brand-context-service.ts` - Service to load and format context
- Type definitions for brand context

## What Success Looks Like

```
[BrandContext] Loading Pine Hill Farm brand context...
[BrandContext] Loaded: 14 services, 6 product categories, 45 keywords
[BrandContext] Context ready for AI injection
```

---

## Step 1: Create Brand Context Directory

```bash
mkdir -p server/brand-context
```

---

## Step 2: Create Pine Hill Farm Brand Data

Create `server/brand-context/pine-hill-farm.json`:

```json
{
  "brand": {
    "name": "Pine Hill Farm",
    "legalName": "Pine Hill Farm LLC",
    "tagline": "Farm-to-Wellness Destination",
    "website": "pinehillfarm.co",
    "founded": 1853,
    "organicCertified": 2017,
    "ownership": "Women-owned, family-operated (3 sisters)",
    "locations": [
      {
        "name": "Watertown Wellness Center",
        "city": "Watertown",
        "state": "Wisconsin",
        "type": "retail-spa"
      },
      {
        "name": "Lake Geneva Wellness Center",
        "city": "Lake Geneva",
        "state": "Wisconsin",
        "type": "retail-spa",
        "opened": 2025
      }
    ]
  },

  "identity": {
    "story": "For generations since 1853, the land has been nurtured and farmed by the family. In 2012, they embarked on a journey toward organic practices, achieving USDA certification in 2017. Three sisters with backgrounds in diverse healthcare settings recognized the need for a more holistic approach to wellness, creating Pine Hill Farm as a place where individuals can access functional health resources and education.",
    "mission": "To provide holistic, root-cause health solutions that connect health, nature, and community.",
    "founders": "Three sisters with healthcare backgrounds",
    "philosophy": "Whole-body health approach that addresses root causes, not just symptoms"
  },

  "values": [
    {
      "value": "Holistic Over Symptomatic",
      "description": "We treat the whole person, not isolated symptoms"
    },
    {
      "value": "Root Cause Medicine",
      "description": "We dig deep to find why, not just what"
    },
    {
      "value": "Natural Over Synthetic",
      "description": "We prefer organic, plant-based solutions"
    },
    {
      "value": "Family Over Corporate",
      "description": "Personal care, not assembly-line medicine"
    },
    {
      "value": "Education Over Sales",
      "description": "We empower with knowledge, not pressure"
    },
    {
      "value": "Accessibility",
      "description": "HSA/FSA accepted, veteran discounts (50% off CBD)"
    }
  ],

  "targetAudience": {
    "primary": {
      "description": "Health-conscious individuals seeking root-cause solutions",
      "demographics": "Primarily women 35-65",
      "psychographics": "Frustrated with conventional medicine, open to holistic approaches"
    },
    "conditions": [
      "Hormone imbalances (menopause, thyroid, adrenal)",
      "Gut health issues (IBS, SIBO, microbiome)",
      "Mold and mycotoxin illness",
      "Chronic fatigue and brain fog",
      "Autoimmune conditions",
      "Weight management struggles",
      "Detoxification needs"
    ],
    "specialGroups": [
      {
        "group": "Veterans",
        "benefit": "50% off sublingual hemp extract oil"
      },
      {
        "group": "HSA/FSA holders",
        "benefit": "Payments accepted for eligible services"
      }
    ]
  },

  "services": [
    {
      "name": "MTHFR Gene Test",
      "category": "genetic-testing",
      "description": "Detects variations in the MTHFR gene to identify reduced folate metabolism and cardiovascular risk"
    },
    {
      "name": "Saliva Profile Hormone III",
      "category": "hormone-testing",
      "description": "Assesses hormones including Cortisol 4x, DHEA, E2, Progesterone, Pg/E2 ratio, Testosterone"
    },
    {
      "name": "Mold Exploration Visit",
      "category": "mold-assessment",
      "description": "Mold-literate certified RN assesses mold-toxin exposure and recommends solutions"
    },
    {
      "name": "Supplement/Medication Consultation",
      "category": "consultation",
      "description": "Wellness RN helps find best supplements and educates on lifestyle impacts"
    },
    {
      "name": "GI360 Microbiome Profile",
      "category": "gut-health",
      "description": "DNA analysis identifying 45+ targeted analytes contributing to dysbiosis"
    },
    {
      "name": "3X4 Genetics Test + Blueprint",
      "category": "genetic-testing",
      "description": "36 key insights with personalized recommendations"
    },
    {
      "name": "Weight Management Profile",
      "category": "hormone-testing",
      "description": "Identifies hormone imbalances contributing to weight issues"
    },
    {
      "name": "MycoTOX Profile",
      "category": "mold-assessment",
      "description": "Screens for 11 mycotoxins from 40 mold species via urine"
    },
    {
      "name": "Mycotoxin Building Profile",
      "category": "mold-assessment",
      "description": "Dust swab testing for 16 mycotoxins in living spaces"
    },
    {
      "name": "Essential Thyroid Profile",
      "category": "hormone-testing",
      "description": "Baseline assessment detecting overt and subclinical thyroid disease"
    },
    {
      "name": "DUTCH Complete",
      "category": "hormone-testing",
      "description": "Comprehensive sex and adrenal hormone assessment with metabolites"
    },
    {
      "name": "Child Gut Health Test",
      "category": "gut-health",
      "description": "Microbiome analysis for kids ages 3-18"
    },
    {
      "name": "BioScan SRT",
      "category": "technology",
      "description": "Non-invasive technology to identify root cause"
    },
    {
      "name": "Wellness Spa Services",
      "category": "spa",
      "description": "Salt therapy, relaxation, holistic treatments"
    }
  ],

  "products": {
    "categories": [
      {
        "name": "Proprietary Supplements",
        "count": "300+",
        "description": "Organic small batch supplement development and manufacture",
        "url": "pinehillfarm.co/shop-supplements/"
      },
      {
        "name": "CBD Gummies",
        "description": "Organic hemp-derived, small batch quality control",
        "url": "pinehillfarm.co/wellness-products/gummies/"
      },
      {
        "name": "CBD Oils",
        "description": "Sublingual hemp extract oil, organic certified"
      },
      {
        "name": "CBD Products",
        "description": "Various organic CBD formulations"
      },
      {
        "name": "Gut Health Supplements",
        "description": "Probiotics, digestive enzymes, microbiome support"
      },
      {
        "name": "Hormone Support",
        "description": "Natural hormone balancing supplements"
      }
    ],
    "sourcing": "Grown on certified FDA Organic family farm (bicentennial)",
    "quality": "Small batch, organic, USDA certified"
  },

  "terminology": {
    "useTheseTerms": [
      "functional health",
      "root cause",
      "holistic wellness",
      "whole-body health",
      "farm-to-wellness",
      "organic",
      "natural solutions",
      "wellness journey",
      "health goals",
      "mold-literate",
      "microbiome",
      "hormone balance",
      "detox",
      "gut health"
    ],
    "avoidTheseTerms": [
      "cure",
      "treat disease",
      "medical diagnosis",
      "prescription",
      "clinical trial",
      "FDA approved treatment",
      "guaranteed results"
    ],
    "brandSpecificPhrases": [
      "You're in the driver's seat of your health journey",
      "We leave no stone unturned",
      "Your care should be as unique as you",
      "Connecting health, nature, and community",
      "Farm-to-wellness destination"
    ]
  },

  "partnerships": [
    "American Holistic Nurses Association",
    "Institute for Functional Medicine",
    "The Menopause Society",
    "Salt Therapy Association"
  ],

  "contentGuidelines": {
    "tone": [
      "Warm and welcoming",
      "Knowledgeable but not preachy",
      "Empowering, not fear-based",
      "Personal and caring",
      "Educational",
      "Hopeful and positive"
    ],
    "messaging": {
      "emphasize": [
        "Natural, organic solutions",
        "Root cause approach",
        "Personalized care",
        "Family farm heritage",
        "Scientific backing (functional medicine)",
        "Empowerment and education"
      ],
      "deemphasize": [
        "Quick fixes",
        "Miracle cures",
        "Fear-based marketing",
        "Comparison to competitors",
        "Price as primary value prop"
      ]
    }
  },

  "visualIdentity": {
    "colors": {
      "primary": "#2D5A27",
      "primaryName": "Forest Green",
      "secondary": "#8B7355",
      "secondaryName": "Earthy Brown",
      "accent": "#D4A574",
      "accentName": "Warm Gold",
      "background": "#F5F2ED",
      "backgroundName": "Natural Cream"
    },
    "aesthetic": [
      "Warm, golden lighting",
      "Natural settings (farm, fields, gardens)",
      "Organic textures (wood, plants, natural materials)",
      "Earth tones throughout",
      "Real people, authentic expressions",
      "Soft, welcoming atmosphere"
    ],
    "avoid": [
      "Clinical/hospital settings",
      "Cold, blue lighting",
      "Sterile/corporate environments",
      "Overly polished/artificial models",
      "Harsh contrasts",
      "Plastic/synthetic textures"
    ]
  }
}
```

---

## Step 3: Create Brand Context Service

Create `server/services/brand-context-service.ts`:

```typescript
// server/services/brand-context-service.ts

import * as fs from 'fs';
import * as path from 'path';

export interface BrandContextData {
  brand: {
    name: string;
    tagline: string;
    website: string;
    founded: number;
    ownership: string;
    locations: Array<{
      name: string;
      city: string;
      state: string;
      type: string;
    }>;
  };
  identity: {
    story: string;
    mission: string;
    founders: string;
    philosophy: string;
  };
  values: Array<{
    value: string;
    description: string;
  }>;
  targetAudience: {
    primary: {
      description: string;
      demographics: string;
      psychographics: string;
    };
    conditions: string[];
    specialGroups: Array<{
      group: string;
      benefit: string;
    }>;
  };
  services: Array<{
    name: string;
    category: string;
    description: string;
  }>;
  products: {
    categories: Array<{
      name: string;
      description: string;
      count?: string;
      url?: string;
    }>;
    sourcing: string;
    quality: string;
  };
  terminology: {
    useTheseTerms: string[];
    avoidTheseTerms: string[];
    brandSpecificPhrases: string[];
  };
  contentGuidelines: {
    tone: string[];
    messaging: {
      emphasize: string[];
      deemphasize: string[];
    };
  };
  visualIdentity: {
    colors: Record<string, string>;
    aesthetic: string[];
    avoid: string[];
  };
}

class BrandContextService {
  private brandData: BrandContextData | null = null;
  private loadedAt: number = 0;

  /**
   * Load brand context data from JSON file
   */
  async loadBrandContext(): Promise<BrandContextData> {
    // Return cached if loaded within last hour
    if (this.brandData && Date.now() - this.loadedAt < 3600000) {
      return this.brandData;
    }

    console.log('[BrandContext] Loading Pine Hill Farm brand context...');

    try {
      const contextPath = path.join(__dirname, '../brand-context/pine-hill-farm.json');
      const rawData = fs.readFileSync(contextPath, 'utf-8');
      this.brandData = JSON.parse(rawData) as BrandContextData;
      this.loadedAt = Date.now();

      const serviceCount = this.brandData.services.length;
      const productCount = this.brandData.products.categories.length;
      const keywordCount = this.brandData.terminology.useTheseTerms.length;

      console.log(`[BrandContext] Loaded: ${serviceCount} services, ${productCount} product categories, ${keywordCount} keywords`);
      console.log('[BrandContext] Context ready for AI injection');

      return this.brandData;
    } catch (error: any) {
      console.error('[BrandContext] Failed to load brand context:', error.message);
      throw error;
    }
  }

  /**
   * Get formatted context for script parsing
   */
  async getScriptParsingContext(): Promise<string> {
    const data = await this.loadBrandContext();

    return `
## Brand Context: ${data.brand.name}

**About:** ${data.identity.story}

**Mission:** ${data.identity.mission}

**Target Audience:** ${data.targetAudience.primary.description}
- Demographics: ${data.targetAudience.primary.demographics}
- Health concerns: ${data.targetAudience.conditions.join(', ')}

**Services Offered:**
${data.services.map(s => `- ${s.name}: ${s.description}`).join('\n')}

**Products:**
${data.products.categories.map(p => `- ${p.name}: ${p.description}`).join('\n')}

**Brand Terminology to Use:**
${data.terminology.useTheseTerms.join(', ')}

**Terms to Avoid:**
${data.terminology.avoidTheseTerms.join(', ')}

**Brand Phrases:**
${data.terminology.brandSpecificPhrases.map(p => `- "${p}"`).join('\n')}

**Content Tone:** ${data.contentGuidelines.tone.join(', ')}

**Emphasize:** ${data.contentGuidelines.messaging.emphasize.join(', ')}
`;
  }

  /**
   * Get formatted context for visual/scene analysis
   */
  async getVisualAnalysisContext(): Promise<string> {
    const data = await this.loadBrandContext();

    return `
## Visual Guidelines: ${data.brand.name}

**Brand Aesthetic:**
${data.visualIdentity.aesthetic.map(a => `- ${a}`).join('\n')}

**Brand Colors:**
- Primary: ${data.visualIdentity.colors.primary} (${data.visualIdentity.colors.primaryName})
- Secondary: ${data.visualIdentity.colors.secondary} (${data.visualIdentity.colors.secondaryName})
- Accent: ${data.visualIdentity.colors.accent} (${data.visualIdentity.colors.accentName})

**Visual Elements to AVOID:**
${data.visualIdentity.avoid.map(a => `- ${a}`).join('\n')}

**Target Audience Visual Cues:**
- Primary: ${data.targetAudience.primary.demographics}
- Settings: Wellness spaces, natural environments, home settings
- People: Real, relatable, authentic expressions
- Mood: Warm, hopeful, empowering

**Brand Identity:**
- Family farm since 1853
- Women-owned (3 sisters)
- Organic, natural, holistic
- Farm-to-wellness concept
`;
  }

  /**
   * Get formatted context for quality evaluation
   */
  async getQualityEvaluationContext(): Promise<string> {
    const data = await this.loadBrandContext();

    return `
## Brand Compliance Criteria: ${data.brand.name}

**Visual Alignment Checklist:**
✓ Warm, natural lighting (not cold/clinical)
✓ Earth tones and organic colors
✓ Natural settings or warm interiors
✓ Real people with authentic expressions
✓ Organic textures (wood, plants, natural materials)

**Visual Red Flags:**
✗ Clinical/hospital environments
✗ Cold, blue or harsh lighting
✗ Sterile/corporate settings
✗ Overly polished/artificial appearances
✗ Plastic or synthetic textures
✗ Fear-based or negative imagery

**Brand Tone Compliance:**
- Should feel: Warm, welcoming, empowering, educational
- Should NOT feel: Clinical, corporate, salesy, fear-based

**Target Audience Resonance:**
- Primary: Women 35-65 seeking holistic health solutions
- Should see themselves in the content
- Aspirational but achievable

**${data.brand.name} Values to Reflect:**
${data.values.map(v => `- ${v.value}: ${v.description}`).join('\n')}
`;
  }

  /**
   * Get formatted context for prompt enhancement
   */
  async getPromptEnhancementContext(): Promise<string> {
    const data = await this.loadBrandContext();

    return `For ${data.brand.name}, a ${data.brand.tagline.toLowerCase()}. ` +
      `${data.identity.philosophy}. ` +
      `Visual style: ${data.visualIdentity.aesthetic.slice(0, 3).join(', ')}. ` +
      `Tone: ${data.contentGuidelines.tone.slice(0, 3).join(', ')}.`;
  }

  /**
   * Get service keywords for script matching
   */
  async getServiceKeywords(): Promise<Map<string, string[]>> {
    const data = await this.loadBrandContext();
    const keywords = new Map<string, string[]>();

    // Map services to their keywords
    data.services.forEach(service => {
      const serviceKeywords = [
        service.name.toLowerCase(),
        ...service.description.toLowerCase().split(/\s+/).filter(w => w.length > 4),
      ];
      keywords.set(service.name, serviceKeywords);
    });

    // Add condition keywords
    keywords.set('conditions', data.targetAudience.conditions.map(c => c.toLowerCase()));

    // Add product keywords
    data.products.categories.forEach(product => {
      keywords.set(product.name, [
        product.name.toLowerCase(),
        ...product.description.toLowerCase().split(/\s+/).filter(w => w.length > 4),
      ]);
    });

    return keywords;
  }

  /**
   * Match script text to relevant services/products
   */
  async matchScriptToServices(scriptText: string): Promise<{
    services: string[];
    products: string[];
    conditions: string[];
  }> {
    const data = await this.loadBrandContext();
    const lowerScript = scriptText.toLowerCase();

    const matchedServices = data.services
      .filter(s => 
        lowerScript.includes(s.name.toLowerCase()) ||
        s.description.toLowerCase().split(/\s+/).some(word => 
          word.length > 5 && lowerScript.includes(word)
        )
      )
      .map(s => s.name);

    const matchedProducts = data.products.categories
      .filter(p => 
        lowerScript.includes(p.name.toLowerCase()) ||
        p.description.toLowerCase().split(/\s+/).some(word => 
          word.length > 5 && lowerScript.includes(word)
        )
      )
      .map(p => p.name);

    const matchedConditions = data.targetAudience.conditions
      .filter(c => {
        const conditionWords = c.toLowerCase().split(/[\s,()]+/);
        return conditionWords.some(word => word.length > 4 && lowerScript.includes(word));
      });

    return {
      services: matchedServices,
      products: matchedProducts,
      conditions: matchedConditions,
    };
  }

  /**
   * Get full brand data
   */
  async getBrandData(): Promise<BrandContextData> {
    return this.loadBrandContext();
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.brandData = null;
    this.loadedAt = 0;
    console.log('[BrandContext] Cache cleared');
  }
}

export const brandContextService = new BrandContextService();
```

---

## Step 4: Create API Endpoint for Brand Context

Add to `server/routes.ts`:

```typescript
import { brandContextService } from './services/brand-context-service';

// GET /api/brand-context - Get brand context for debugging/admin
router.get('/api/brand-context', async (req, res) => {
  try {
    const data = await brandContextService.getBrandData();
    res.json({
      brand: data.brand.name,
      servicesCount: data.services.length,
      productsCount: data.products.categories.length,
      terminology: data.terminology.useTheseTerms,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/brand-context/match - Match script to brand services
router.post('/api/brand-context/match', async (req, res) => {
  try {
    const { script } = req.body;
    const matches = await brandContextService.matchScriptToServices(script);
    res.json(matches);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## Step 5: Test the Service

```bash
# Test loading brand context
curl http://localhost:5000/api/brand-context

# Test matching script to services
curl -X POST http://localhost:5000/api/brand-context/match \
  -H "Content-Type: application/json" \
  -d '{"script": "Are you struggling with hormone imbalances and gut health issues?"}'
```

Expected response:
```json
{
  "services": ["Saliva Profile Hormone III", "GI360 Microbiome Profile"],
  "products": ["Gut Health Supplements", "Hormone Support"],
  "conditions": ["Hormone imbalances", "Gut health issues"]
}
```

---

## Verification Checklist

Before moving to Phase 6B, confirm:

- [ ] `server/brand-context/` directory created
- [ ] `pine-hill-farm.json` contains all brand data
- [ ] `brand-context-service.ts` loads JSON successfully
- [ ] Service exports all context formatters
- [ ] `getScriptParsingContext()` returns formatted string
- [ ] `getVisualAnalysisContext()` returns visual guidelines
- [ ] `getQualityEvaluationContext()` returns compliance criteria
- [ ] `matchScriptToServices()` identifies relevant services
- [ ] API endpoints return expected data
- [ ] Console logs show successful loading

---

## Troubleshooting

### "Cannot find pine-hill-farm.json"
- Check file path in service
- Verify `brand-context` directory exists
- Check JSON file has no syntax errors

### "Service matches nothing"
- Verify script text is being lowercased
- Check keyword matching logic
- Ensure services/products have descriptions

---

## Next Phase

Once Brand Context Service is working, proceed to **Phase 6B: Script Parsing Context** to inject brand knowledge into script parsing.
