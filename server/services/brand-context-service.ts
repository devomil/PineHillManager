import * as fs from 'fs';
import * as path from 'path';

export interface BrandContextData {
  brand: {
    name: string;
    legalName: string;
    tagline: string;
    website: string;
    founded: number;
    organicCertified: number;
    ownership: string;
    locations: Array<{
      name: string;
      city: string;
      state: string;
      type: string;
      opened?: number;
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
  partnerships: string[];
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

  async loadBrandContext(): Promise<BrandContextData> {
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

  async getPromptEnhancementContext(): Promise<string> {
    const data = await this.loadBrandContext();

    return `For ${data.brand.name}, a ${data.brand.tagline.toLowerCase()}. ` +
      `${data.identity.philosophy}. ` +
      `Visual style: ${data.visualIdentity.aesthetic.slice(0, 3).join(', ')}. ` +
      `Tone: ${data.contentGuidelines.tone.slice(0, 3).join(', ')}.`;
  }

  async getServiceKeywords(): Promise<Map<string, string[]>> {
    const data = await this.loadBrandContext();
    const keywords = new Map<string, string[]>();

    data.services.forEach(service => {
      const serviceKeywords = [
        service.name.toLowerCase(),
        ...service.description.toLowerCase().split(/\s+/).filter(w => w.length > 4),
      ];
      keywords.set(service.name, serviceKeywords);
    });

    keywords.set('conditions', data.targetAudience.conditions.map(c => c.toLowerCase()));

    data.products.categories.forEach(product => {
      keywords.set(product.name, [
        product.name.toLowerCase(),
        ...product.description.toLowerCase().split(/\s+/).filter(w => w.length > 4),
      ]);
    });

    return keywords;
  }

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

  async getBrandData(): Promise<BrandContextData> {
    return this.loadBrandContext();
  }

  async getBrandSummary(): Promise<string> {
    const data = await this.loadBrandContext();
    return `${data.brand.name} - ${data.brand.tagline}. ${data.identity.mission}`;
  }

  clearCache(): void {
    this.brandData = null;
    this.loadedAt = 0;
    console.log('[BrandContext] Cache cleared');
  }
}

export const brandContextService = new BrandContextService();
