# Phase 15B: Asset Type Configuration File

## Objective

Create a single configuration file containing all 97 asset types with their categories, labels, descriptions, and `promptKeywords`. This file will be the source of truth for asset classification.

---

## Prerequisites

- Phase 15A complete (database columns exist)

---

## File Location

```
shared/config/brand-asset-types.ts
```

This file should be in `shared/` so both server and client can import it.

---

## Configuration Structure

```typescript
// shared/config/brand-asset-types.ts

export interface AssetTypeDefinition {
  id: string;
  category: AssetCategory;
  label: string;
  description: string;
  icon: string;  // Lucide icon name
  
  // Keywords that trigger matching to this asset type
  promptKeywords: string[];
  
  // Placement rules for Remotion rendering
  placementRules: {
    canBeComposited: boolean;
    canBeAnimated: boolean;
    typicalPosition: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'corner' | 'full-frame' | 'background';
    typicalScale: 'small' | 'medium' | 'large' | 'full';
    typicalOpacity?: number;
    animationStyle?: 'fade-in' | 'slide-in' | 'zoom' | 'ken-burns' | 'none';
  };
  
  // Requirements for validation
  requirements?: {
    recommendedFormat?: string[];
    transparentBackground?: boolean;
    minResolution?: { width: number; height: number };
  };
}

export type AssetCategory = 
  | 'products'
  | 'location'
  | 'people'
  | 'logos'
  | 'trust'
  | 'services'
  | 'creative'
  | 'documents';

export interface CategoryDefinition {
  id: AssetCategory;
  label: string;
  description: string;
  icon: string;
}
```

---

## Categories Definition

```typescript
// shared/config/brand-asset-types.ts (continued)

export const ASSET_CATEGORIES: CategoryDefinition[] = [
  {
    id: 'products',
    label: 'Products',
    description: 'Product photos, packaging, and lifestyle shots',
    icon: 'Package',
  },
  {
    id: 'location',
    label: 'Location & Facilities',
    description: 'Building exteriors, interiors, and facility photos',
    icon: 'Building2',
  },
  {
    id: 'people',
    label: 'People',
    description: 'Founders, employees, customers, and experts',
    icon: 'Users',
  },
  {
    id: 'logos',
    label: 'Logos',
    description: 'Brand logos in various formats and colors',
    icon: 'Sparkles',
  },
  {
    id: 'trust',
    label: 'Trust & Credibility',
    description: 'Certifications, partnerships, and awards',
    icon: 'BadgeCheck',
  },
  {
    id: 'services',
    label: 'Services & Programs',
    description: 'Service-specific imagery and equipment',
    icon: 'Stethoscope',
  },
  {
    id: 'creative',
    label: 'Creative Assets',
    description: 'Backgrounds, icons, templates, and animations',
    icon: 'Palette',
  },
  {
    id: 'documents',
    label: 'Documents & Screenshots',
    description: 'Certificates, reports, and screen captures',
    icon: 'FileText',
  },
];
```

---

## Asset Types Definition (Pine Hill Farm Priority Types)

Focus on the types needed for Pine Hill Farm first:

```typescript
// shared/config/brand-asset-types.ts (continued)

export const BRAND_ASSET_TYPES: Record<string, AssetTypeDefinition> = {
  
  // ═══════════════════════════════════════════════════════════════
  // PRODUCTS (8 types)
  // ═══════════════════════════════════════════════════════════════
  
  'product-hero-single': {
    id: 'product-hero-single',
    category: 'products',
    label: 'Product Hero (Single)',
    description: 'Single product showcased prominently',
    icon: 'Package',
    promptKeywords: [
      'product', 'bottle', 'supplement', 'package', 'item', 
      'featured product', 'hero product', 'main product'
    ],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'center',
      typicalScale: 'large',
      animationStyle: 'zoom',
    },
  },
  
  'product-hero-group': {
    id: 'product-hero-group',
    category: 'products',
    label: 'Product Hero (Group)',
    description: 'Multiple products displayed together',
    icon: 'Boxes',
    promptKeywords: [
      'products', 'product line', 'collection', 'lineup', 
      'product display', 'product arrangement', 'multiple products',
      'product group', 'all products'
    ],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'center',
      typicalScale: 'large',
      animationStyle: 'fade-in',
    },
  },
  
  'product-lifestyle': {
    id: 'product-lifestyle',
    category: 'products',
    label: 'Product Lifestyle',
    description: 'Product shown in use or lifestyle context',
    icon: 'Heart',
    promptKeywords: [
      'lifestyle', 'in use', 'using product', 'daily routine',
      'product in context', 'real life', 'authentic use'
    ],
    placementRules: {
      canBeComposited: false,
      canBeAnimated: true,
      typicalPosition: 'full-frame',
      typicalScale: 'full',
      animationStyle: 'ken-burns',
    },
  },
  
  // ═══════════════════════════════════════════════════════════════
  // LOCATION (7 types) - CRITICAL FOR PINE HILL FARM
  // ═══════════════════════════════════════════════════════════════
  
  'location-exterior-sign': {
    id: 'location-exterior-sign',
    category: 'location',
    label: 'Exterior Sign',
    description: 'Building signage or entrance sign',
    icon: 'Signpost',
    promptKeywords: [
      'sign', 'signage', 'entrance', 'storefront sign',
      'building sign', 'exterior sign', 'front sign'
    ],
    placementRules: {
      canBeComposited: false,
      canBeAnimated: true,
      typicalPosition: 'center',
      typicalScale: 'large',
      animationStyle: 'zoom',
    },
  },
  
  'location-exterior-building': {
    id: 'location-exterior-building',
    category: 'location',
    label: 'Exterior Building',
    description: 'Full building or storefront exterior',
    icon: 'Building',
    promptKeywords: [
      'building', 'exterior', 'storefront', 'facade', 
      'outside', 'front of building', 'location exterior'
    ],
    placementRules: {
      canBeComposited: false,
      canBeAnimated: true,
      typicalPosition: 'full-frame',
      typicalScale: 'full',
      animationStyle: 'ken-burns',
    },
  },
  
  'location-interior-workspace': {
    id: 'location-interior-workspace',
    category: 'location',
    label: 'Interior Workspace',
    description: 'Office, consultation room, or work area',
    icon: 'Armchair',
    promptKeywords: [
      'interior', 'inside', 'office', 'workspace', 'consultation room',
      'consultation space', 'meeting room', 'work area', 'indoor',
      'welcoming space', 'professional space', 'consultation',
      'warm interior', 'cozy interior', 'inviting space'
    ],
    placementRules: {
      canBeComposited: false,
      canBeAnimated: true,
      typicalPosition: 'full-frame',
      typicalScale: 'full',
      animationStyle: 'ken-burns',
    },
  },
  
  'location-interior-retail': {
    id: 'location-interior-retail',
    category: 'location',
    label: 'Interior Retail',
    description: 'Store interior, shelves, displays',
    icon: 'Store',
    promptKeywords: [
      'store', 'retail', 'shop', 'shelves', 'display',
      'store interior', 'retail space', 'shopping area',
      'product shelves', 'apothecary', 'shop interior'
    ],
    placementRules: {
      canBeComposited: false,
      canBeAnimated: true,
      typicalPosition: 'full-frame',
      typicalScale: 'full',
      animationStyle: 'ken-burns',
    },
  },
  
  'location-farm-grounds': {
    id: 'location-farm-grounds',
    category: 'location',
    label: 'Farm Grounds',
    description: 'Outdoor farm property, fields, gardens',
    icon: 'Trees',
    promptKeywords: [
      'farm', 'grounds', 'outdoor', 'field', 'garden',
      'property', 'land', 'nature', 'countryside',
      'farm exterior', 'rural', 'farmland'
    ],
    placementRules: {
      canBeComposited: false,
      canBeAnimated: true,
      typicalPosition: 'full-frame',
      typicalScale: 'full',
      animationStyle: 'ken-burns',
    },
  },
  
  // ═══════════════════════════════════════════════════════════════
  // PEOPLE (6 types)
  // ═══════════════════════════════════════════════════════════════
  
  'people-founder-portrait': {
    id: 'people-founder-portrait',
    category: 'people',
    label: 'Founder Portrait',
    description: 'Photo of company founder(s) or owner(s)',
    icon: 'User',
    promptKeywords: [
      'founder', 'owner', 'ceo', 'principal', 'leadership',
      'founders', 'owners', 'our team', 'meet the founder'
    ],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'center',
      typicalScale: 'large',
      animationStyle: 'fade-in',
    },
  },
  
  'people-employee-headshot': {
    id: 'people-employee-headshot',
    category: 'people',
    label: 'Employee Headshot',
    description: 'Professional headshot of team member',
    icon: 'UserCircle',
    promptKeywords: [
      'employee', 'team member', 'staff', 'headshot',
      'team', 'our people', 'meet the team'
    ],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'center',
      typicalScale: 'medium',
      animationStyle: 'fade-in',
    },
  },
  
  'people-customer-portrait': {
    id: 'people-customer-portrait',
    category: 'people',
    label: 'Customer Portrait',
    description: 'Photo of customer for testimonials',
    icon: 'UserCheck',
    promptKeywords: [
      'customer', 'client', 'testimonial', 'review',
      'happy customer', 'satisfied customer', 'success story'
    ],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'center',
      typicalScale: 'medium',
      animationStyle: 'fade-in',
    },
  },
  
  // ═══════════════════════════════════════════════════════════════
  // LOGOS (6 types) - CRITICAL FOR OVERLAYS
  // ═══════════════════════════════════════════════════════════════
  
  'logo-primary-color': {
    id: 'logo-primary-color',
    category: 'logos',
    label: 'Primary Logo (Color)',
    description: 'Main logo in full color',
    icon: 'Sparkles',
    promptKeywords: [
      'logo', 'brand logo', 'main logo', 'primary logo',
      'company logo', 'our logo', 'PHF logo', 'Pine Hill Farm logo'
    ],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'center',
      typicalScale: 'medium',
      animationStyle: 'fade-in',
    },
    requirements: {
      recommendedFormat: ['png', 'svg'],
      transparentBackground: true,
    },
  },
  
  'logo-primary-white': {
    id: 'logo-primary-white',
    category: 'logos',
    label: 'Primary Logo (White)',
    description: 'Main logo in white for dark backgrounds',
    icon: 'Sparkles',
    promptKeywords: [
      'white logo', 'light logo', 'logo on dark',
      'reversed logo', 'logo white'
    ],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'corner',
      typicalScale: 'small',
      animationStyle: 'fade-in',
    },
    requirements: {
      recommendedFormat: ['png', 'svg'],
      transparentBackground: true,
    },
  },
  
  'logo-primary-dark': {
    id: 'logo-primary-dark',
    category: 'logos',
    label: 'Primary Logo (Dark)',
    description: 'Main logo in dark color for light backgrounds',
    icon: 'Sparkles',
    promptKeywords: [
      'dark logo', 'black logo', 'logo on light',
      'logo dark'
    ],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'corner',
      typicalScale: 'small',
      animationStyle: 'fade-in',
    },
    requirements: {
      recommendedFormat: ['png', 'svg'],
      transparentBackground: true,
    },
  },
  
  'logo-watermark': {
    id: 'logo-watermark',
    category: 'logos',
    label: 'Watermark Logo',
    description: 'Semi-transparent logo for watermarking',
    icon: 'Droplet',
    promptKeywords: [
      'watermark', 'subtle logo', 'background logo',
      'corner logo', 'branded'
    ],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: false,
      typicalPosition: 'bottom-right',
      typicalScale: 'small',
      typicalOpacity: 0.3,
      animationStyle: 'none',
    },
    requirements: {
      recommendedFormat: ['png'],
      transparentBackground: true,
    },
  },
  
  // ═══════════════════════════════════════════════════════════════
  // TRUST & CREDIBILITY (8 types) - CRITICAL FOR PINE HILL FARM
  // ═══════════════════════════════════════════════════════════════
  
  'trust-certification-usda': {
    id: 'trust-certification-usda',
    category: 'trust',
    label: 'USDA Organic Certification',
    description: 'USDA Organic certification badge',
    icon: 'BadgeCheck',
    promptKeywords: [
      'usda', 'organic', 'certified organic', 'usda organic',
      'organic certification', 'organic certified'
    ],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'bottom-left',
      typicalScale: 'small',
      animationStyle: 'fade-in',
    },
    requirements: {
      recommendedFormat: ['png', 'svg'],
      transparentBackground: true,
    },
  },
  
  'trust-certification-nongmo': {
    id: 'trust-certification-nongmo',
    category: 'trust',
    label: 'Non-GMO Certification',
    description: 'Non-GMO Project verified badge',
    icon: 'Leaf',
    promptKeywords: [
      'non-gmo', 'gmo free', 'non gmo', 'gmo-free',
      'non-gmo project', 'verified non-gmo'
    ],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'bottom-left',
      typicalScale: 'small',
      animationStyle: 'fade-in',
    },
  },
  
  'trust-certification-other': {
    id: 'trust-certification-other',
    category: 'trust',
    label: 'Other Certification',
    description: 'Other certification badges (GMP, Women-Owned, etc.)',
    icon: 'Award',
    promptKeywords: [
      'certified', 'certification', 'verified', 'accredited',
      'women owned', 'woman owned', 'gmp', 'third party tested'
    ],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'bottom-left',
      typicalScale: 'small',
      animationStyle: 'fade-in',
    },
  },
  
  'trust-partnership-logo': {
    id: 'trust-partnership-logo',
    category: 'trust',
    label: 'Partnership Logo',
    description: 'Logo of partner organization or association',
    icon: 'Handshake',
    promptKeywords: [
      'partner', 'partnership', 'association', 'member',
      'affiliated', 'institute', 'society', 'organization',
      'functional medicine', 'holistic nurses', 'menopause society',
      'salt therapy', 'research', 'advocacy'
    ],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'bottom',
      typicalScale: 'small',
      animationStyle: 'fade-in',
    },
    requirements: {
      recommendedFormat: ['png', 'svg'],
      transparentBackground: true,
    },
  },
  
  // ═══════════════════════════════════════════════════════════════
  // SERVICES (10 types) - CRITICAL FOR PINE HILL FARM
  // ═══════════════════════════════════════════════════════════════
  
  'service-bioscan-device': {
    id: 'service-bioscan-device',
    category: 'services',
    label: 'BioScan SRT Device',
    description: 'Photo of BioScan SRT equipment/device',
    icon: 'Cpu',
    promptKeywords: [
      'bioscan', 'biofeedback', 'srt', 'scanning device',
      'bioscan equipment', 'bioscan machine', 'bioresonance',
      'stress response testing', 'bioscan srt'
    ],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'center',
      typicalScale: 'large',
      animationStyle: 'zoom',
    },
  },
  
  'service-bioscan-session': {
    id: 'service-bioscan-session',
    category: 'services',
    label: 'BioScan Session',
    description: 'BioScan session in progress with client',
    icon: 'Activity',
    promptKeywords: [
      'bioscan session', 'scanning', 'client session',
      'bioscan in use', 'testing session', 'consultation'
    ],
    placementRules: {
      canBeComposited: false,
      canBeAnimated: true,
      typicalPosition: 'full-frame',
      typicalScale: 'full',
      animationStyle: 'ken-burns',
    },
  },
  
  'service-lab-testing-hero': {
    id: 'service-lab-testing-hero',
    category: 'services',
    label: 'Lab Testing Hero',
    description: 'Lab testing service imagery',
    icon: 'FlaskConical',
    promptKeywords: [
      'lab', 'laboratory', 'testing', 'lab test',
      'blood test', 'lab work', 'diagnostics'
    ],
    placementRules: {
      canBeComposited: false,
      canBeAnimated: true,
      typicalPosition: 'full-frame',
      typicalScale: 'full',
      animationStyle: 'ken-burns',
    },
  },
  
  'service-functional-health-hero': {
    id: 'service-functional-health-hero',
    category: 'services',
    label: 'Functional Health Hero',
    description: 'Functional health services imagery',
    icon: 'HeartPulse',
    promptKeywords: [
      'functional health', 'functional medicine', 'wellness',
      'health services', 'holistic', 'integrative',
      'natural health', 'wellness services'
    ],
    placementRules: {
      canBeComposited: false,
      canBeAnimated: true,
      typicalPosition: 'full-frame',
      typicalScale: 'full',
      animationStyle: 'ken-burns',
    },
  },
  
  'service-consultation-room': {
    id: 'service-consultation-room',
    category: 'services',
    label: 'Consultation Room',
    description: 'Generic consultation/treatment room',
    icon: 'DoorOpen',
    promptKeywords: [
      'consultation', 'treatment room', 'appointment',
      'practitioner', 'client meeting', 'health consultation'
    ],
    placementRules: {
      canBeComposited: false,
      canBeAnimated: true,
      typicalPosition: 'full-frame',
      typicalScale: 'full',
      animationStyle: 'ken-burns',
    },
  },
};
```

---

## Helper Functions

```typescript
// shared/config/brand-asset-types.ts (continued)

/**
 * Get asset type definition by ID
 */
export function getAssetType(typeId: string): AssetTypeDefinition | undefined {
  return BRAND_ASSET_TYPES[typeId];
}

/**
 * Get all asset types for a category
 */
export function getTypesByCategory(category: AssetCategory): AssetTypeDefinition[] {
  return Object.values(BRAND_ASSET_TYPES).filter(type => type.category === category);
}

/**
 * Get category definition by ID
 */
export function getCategory(categoryId: AssetCategory): CategoryDefinition | undefined {
  return ASSET_CATEGORIES.find(cat => cat.id === categoryId);
}

/**
 * Find asset types that match a visual direction based on promptKeywords
 */
export function findMatchingAssetTypes(visualDirection: string): string[] {
  const lowerDirection = visualDirection.toLowerCase();
  const matches: Array<{ typeId: string; score: number }> = [];
  
  for (const [typeId, typeDef] of Object.entries(BRAND_ASSET_TYPES)) {
    let score = 0;
    
    for (const keyword of typeDef.promptKeywords) {
      if (lowerDirection.includes(keyword.toLowerCase())) {
        // Longer keywords = more specific = higher score
        score += keyword.length;
      }
    }
    
    if (score > 0) {
      matches.push({ typeId, score });
    }
  }
  
  // Sort by score descending
  matches.sort((a, b) => b.score - a.score);
  
  return matches.map(m => m.typeId);
}
```

---

## Verification

Test the helper functions:

```typescript
// Test findMatchingAssetTypes
const result1 = findMatchingAssetTypes(
  "Welcoming Pine Hill Farm consultation space with warm lighting"
);
console.log(result1);
// Expected: ['location-interior-workspace', 'service-consultation-room', ...]

const result2 = findMatchingAssetTypes(
  "BioScan equipment in warm wellness space"
);
console.log(result2);
// Expected: ['service-bioscan-device', 'service-bioscan-session', ...]

const result3 = findMatchingAssetTypes(
  "Pine Hill Farm products arranged beautifully with PHF logo visible"
);
console.log(result3);
// Expected: ['product-hero-group', 'logo-primary-color', ...]
```

---

## Success Criteria

Phase 15B is complete when:

1. ✅ `shared/config/brand-asset-types.ts` file created
2. ✅ All 8 categories defined
3. ✅ At least 30 asset types defined (priority types for Pine Hill Farm)
4. ✅ Each type has `promptKeywords` array
5. ✅ Helper functions work correctly
6. ✅ `findMatchingAssetTypes()` returns correct matches for test cases

---

## Next Step

Proceed to **Phase 15C: Edit Asset Modal UI Update**
