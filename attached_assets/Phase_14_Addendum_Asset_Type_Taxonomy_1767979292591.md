# Phase 14 Addendum: Brand Asset Type Taxonomy & Upload Enhancement

## Purpose

This addendum introduces a **structured asset type system** that allows users to declare what they're uploading. This eliminates guesswork in asset matching and ensures the right assets are used in the right contexts.

## The Problem

Currently, when users upload brand media, the system must infer:
- What is this image? (product? logo? person?)
- How should it be used? (hero shot? watermark? background?)
- What scenes is it appropriate for?

This leads to mismatches where:
- A watermark logo gets used as a hero image
- A product lifestyle shot gets composited when a clean product shot was needed
- An employee photo gets mistaken for stock imagery

## The Solution: Declared Asset Types

Users select an asset type when uploading, giving the system explicit knowledge about:
1. **What** the asset is
2. **How** it should be used
3. **Where** it's appropriate
4. **Requirements** it should meet

---

## Complete Asset Type Taxonomy

### Category 1: Products

```typescript
const PRODUCT_ASSET_TYPES = {
  'product-hero-single': {
    id: 'product-hero-single',
    category: 'products',
    label: 'Product Hero (Single)',
    description: 'Single product on clean/transparent background for feature placement',
    icon: 'Package',
    examples: ['Single supplement bottle on white', 'One lotion tube, no background'],
    usageContext: ['product-shot', 'hero', 'composition'],
    requirements: {
      recommendedFormat: ['png', 'webp'],
      transparentBackground: 'recommended',
      minResolution: { width: 1000, height: 1000 },
      aspectRatio: 'flexible',
    },
    promptKeywords: ['product', 'bottle', 'supplement', 'item', 'package'],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'center',
      typicalScale: 'large',
    },
  },
  
  'product-hero-group': {
    id: 'product-hero-group',
    category: 'products',
    label: 'Product Group/Lineup',
    description: 'Multiple products arranged together for overview shots',
    icon: 'Layers',
    examples: ['Full product line on display', '3 bottles arranged together'],
    usageContext: ['product-overview', 'lineup', 'collection'],
    requirements: {
      recommendedFormat: ['png', 'jpg', 'webp'],
      transparentBackground: 'optional',
      minResolution: { width: 1500, height: 1000 },
      aspectRatio: 'landscape-preferred',
    },
    promptKeywords: ['products', 'lineup', 'collection', 'range', 'family'],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'center',
      typicalScale: 'medium-large',
    },
  },
  
  'product-lifestyle': {
    id: 'product-lifestyle',
    category: 'products',
    label: 'Product Lifestyle Shot',
    description: 'Product shown in real-world context or being used',
    icon: 'Heart',
    examples: ['Lotion on bathroom counter', 'Supplements next to breakfast'],
    usageContext: ['lifestyle', 'context', 'in-use'],
    requirements: {
      recommendedFormat: ['jpg', 'webp'],
      transparentBackground: false,
      minResolution: { width: 1920, height: 1080 },
      aspectRatio: '16:9-preferred',
    },
    promptKeywords: ['lifestyle', 'using', 'daily routine', 'natural setting'],
    placementRules: {
      canBeComposited: false,
      canBeAnimated: true,
      typicalPosition: 'full-frame',
      typicalScale: 'full',
    },
  },
  
  'product-packaging-front': {
    id: 'product-packaging-front',
    category: 'products',
    label: 'Packaging (Front Label)',
    description: 'Front-facing product label, clearly readable',
    icon: 'Tag',
    examples: ['Bottle front label', 'Box front panel'],
    usageContext: ['detail', 'label', 'ingredients'],
    requirements: {
      recommendedFormat: ['png', 'jpg'],
      transparentBackground: 'optional',
      minResolution: { width: 1200, height: 1200 },
      aspectRatio: 'flexible',
    },
    promptKeywords: ['label', 'packaging', 'front', 'details'],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'center',
      typicalScale: 'large',
    },
  },
  
  'product-packaging-back': {
    id: 'product-packaging-back',
    category: 'products',
    label: 'Packaging (Back/Ingredients)',
    description: 'Back label showing ingredients, directions, or details',
    icon: 'FileText',
    examples: ['Supplement facts panel', 'Ingredient list', 'Usage directions'],
    usageContext: ['ingredients', 'details', 'transparency'],
    requirements: {
      recommendedFormat: ['png', 'jpg'],
      transparentBackground: false,
      minResolution: { width: 1200, height: 1500 },
      aspectRatio: 'portrait-preferred',
    },
    promptKeywords: ['ingredients', 'supplement facts', 'directions', 'back label'],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'center',
      typicalScale: 'large',
    },
  },
  
  'product-ingredient-raw': {
    id: 'product-ingredient-raw',
    category: 'products',
    label: 'Raw Ingredient',
    description: 'Photo of actual ingredient (herb, extract, etc.)',
    icon: 'Leaf',
    examples: ['Black cohosh plant', 'Lavender sprigs', 'Honey in jar'],
    usageContext: ['ingredient-showcase', 'natural', 'sourcing'],
    requirements: {
      recommendedFormat: ['png', 'jpg', 'webp'],
      transparentBackground: 'recommended',
      minResolution: { width: 800, height: 800 },
      aspectRatio: 'flexible',
    },
    promptKeywords: ['ingredient', 'natural', 'herb', 'plant', 'extract', 'source'],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'flexible',
      typicalScale: 'medium',
    },
  },
  
  'product-size-comparison': {
    id: 'product-size-comparison',
    category: 'products',
    label: 'Size Comparison',
    description: 'Product shown with reference object for scale',
    icon: 'Ruler',
    examples: ['Bottle next to hand', 'Product next to coin'],
    usageContext: ['scale', 'size', 'comparison'],
    requirements: {
      recommendedFormat: ['jpg', 'png'],
      transparentBackground: false,
      minResolution: { width: 1200, height: 1200 },
      aspectRatio: 'flexible',
    },
    promptKeywords: ['size', 'scale', 'how big', 'comparison'],
    placementRules: {
      canBeComposited: false,
      canBeAnimated: true,
      typicalPosition: 'center',
      typicalScale: 'medium-large',
    },
  },
  
  'product-bundle-kit': {
    id: 'product-bundle-kit',
    category: 'products',
    label: 'Bundle/Kit',
    description: 'Gift set, starter kit, or bundled products',
    icon: 'Gift',
    examples: ['Wellness starter kit', 'Gift box set', 'Travel bundle'],
    usageContext: ['bundle', 'gift', 'kit', 'set'],
    requirements: {
      recommendedFormat: ['png', 'jpg'],
      transparentBackground: 'optional',
      minResolution: { width: 1500, height: 1000 },
      aspectRatio: 'landscape-preferred',
    },
    promptKeywords: ['bundle', 'kit', 'set', 'gift', 'collection'],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'center',
      typicalScale: 'large',
    },
  },
};
```

### Category 2: Location & Facility

```typescript
const LOCATION_ASSET_TYPES = {
  'location-exterior-sign': {
    id: 'location-exterior-sign',
    category: 'location',
    label: 'Exterior Building Sign',
    description: 'Outdoor signage, storefront, or building identification',
    icon: 'Building',
    examples: ['Pine Hill Farm entrance sign', 'Storefront with logo'],
    usageContext: ['establishing-shot', 'intro', 'location'],
    requirements: {
      recommendedFormat: ['jpg', 'webp'],
      transparentBackground: false,
      minResolution: { width: 1920, height: 1080 },
      aspectRatio: '16:9-preferred',
    },
    promptKeywords: ['sign', 'building', 'exterior', 'storefront', 'entrance', 'facility'],
    placementRules: {
      canBeComposited: false,
      canBeAnimated: true,
      typicalPosition: 'full-frame',
      typicalScale: 'full',
    },
  },
  
  'location-exterior-building': {
    id: 'location-exterior-building',
    category: 'location',
    label: 'Exterior Building Shot',
    description: 'Full building exterior without focus on signage',
    icon: 'Home',
    examples: ['Facility from parking lot', 'Building aerial view'],
    usageContext: ['establishing-shot', 'overview', 'facility'],
    requirements: {
      recommendedFormat: ['jpg', 'webp'],
      transparentBackground: false,
      minResolution: { width: 1920, height: 1080 },
      aspectRatio: '16:9-preferred',
    },
    promptKeywords: ['building', 'facility', 'headquarters', 'location', 'premises'],
    placementRules: {
      canBeComposited: false,
      canBeAnimated: true,
      typicalPosition: 'full-frame',
      typicalScale: 'full',
    },
  },
  
  'location-interior-workspace': {
    id: 'location-interior-workspace',
    category: 'location',
    label: 'Interior Workspace',
    description: 'Office, lab, or work area inside facility',
    icon: 'Briefcase',
    examples: ['Lab where products are made', 'Office space', 'Quality control area'],
    usageContext: ['behind-the-scenes', 'process', 'facility-tour'],
    requirements: {
      recommendedFormat: ['jpg', 'webp'],
      transparentBackground: false,
      minResolution: { width: 1920, height: 1080 },
      aspectRatio: '16:9-preferred',
    },
    promptKeywords: ['inside', 'facility', 'lab', 'workspace', 'behind the scenes'],
    placementRules: {
      canBeComposited: false,
      canBeAnimated: true,
      typicalPosition: 'full-frame',
      typicalScale: 'full',
    },
  },
  
  'location-interior-retail': {
    id: 'location-interior-retail',
    category: 'location',
    label: 'Interior Retail/Display',
    description: 'Showroom, retail space, or product display area',
    icon: 'Store',
    examples: ['Product showroom', 'Retail display', 'Customer-facing area'],
    usageContext: ['retail', 'display', 'shopping'],
    requirements: {
      recommendedFormat: ['jpg', 'webp'],
      transparentBackground: false,
      minResolution: { width: 1920, height: 1080 },
      aspectRatio: '16:9-preferred',
    },
    promptKeywords: ['store', 'showroom', 'display', 'retail', 'shop'],
    placementRules: {
      canBeComposited: false,
      canBeAnimated: true,
      typicalPosition: 'full-frame',
      typicalScale: 'full',
    },
  },
  
  'location-farm-grounds': {
    id: 'location-farm-grounds',
    category: 'location',
    label: 'Farm/Outdoor Grounds',
    description: 'Outdoor property, farm land, gardens, or natural areas',
    icon: 'Trees',
    examples: ['Herb garden', 'Farm fields', 'Natural surroundings'],
    usageContext: ['nature', 'sourcing', 'organic', 'natural'],
    requirements: {
      recommendedFormat: ['jpg', 'webp'],
      transparentBackground: false,
      minResolution: { width: 1920, height: 1080 },
      aspectRatio: '16:9-preferred',
    },
    promptKeywords: ['farm', 'garden', 'outdoor', 'nature', 'field', 'organic', 'grounds'],
    placementRules: {
      canBeComposited: false,
      canBeAnimated: true,
      typicalPosition: 'full-frame',
      typicalScale: 'full',
    },
  },
  
  'location-manufacturing': {
    id: 'location-manufacturing',
    category: 'location',
    label: 'Manufacturing/Production',
    description: 'Production line, manufacturing equipment, or processing area',
    icon: 'Factory',
    examples: ['Bottling line', 'Mixing equipment', 'Packaging station'],
    usageContext: ['process', 'manufacturing', 'quality'],
    requirements: {
      recommendedFormat: ['jpg', 'webp'],
      transparentBackground: false,
      minResolution: { width: 1920, height: 1080 },
      aspectRatio: '16:9-preferred',
    },
    promptKeywords: ['manufacturing', 'production', 'making', 'process', 'equipment'],
    placementRules: {
      canBeComposited: false,
      canBeAnimated: true,
      typicalPosition: 'full-frame',
      typicalScale: 'full',
    },
  },
  
  'location-warehouse': {
    id: 'location-warehouse',
    category: 'location',
    label: 'Warehouse/Storage',
    description: 'Storage facility, inventory, or shipping area',
    icon: 'Warehouse',
    examples: ['Product warehouse', 'Shipping department', 'Inventory shelves'],
    usageContext: ['operations', 'scale', 'fulfillment'],
    requirements: {
      recommendedFormat: ['jpg', 'webp'],
      transparentBackground: false,
      minResolution: { width: 1920, height: 1080 },
      aspectRatio: '16:9-preferred',
    },
    promptKeywords: ['warehouse', 'storage', 'inventory', 'shipping', 'fulfillment'],
    placementRules: {
      canBeComposited: false,
      canBeAnimated: true,
      typicalPosition: 'full-frame',
      typicalScale: 'full',
    },
  },
};
```

### Category 3: People

```typescript
const PEOPLE_ASSET_TYPES = {
  'people-founder-portrait': {
    id: 'people-founder-portrait',
    category: 'people',
    label: 'Founder/Owner Portrait',
    description: 'Professional portrait of company founder or owner',
    icon: 'Crown',
    examples: ['CEO headshot', 'Founder professional photo'],
    usageContext: ['authority', 'story', 'leadership', 'about-us'],
    requirements: {
      recommendedFormat: ['jpg', 'png'],
      transparentBackground: 'optional',
      minResolution: { width: 800, height: 1000 },
      aspectRatio: 'portrait-preferred',
    },
    promptKeywords: ['founder', 'owner', 'CEO', 'leadership', 'started by'],
    personMetadata: {
      requiresName: true,
      requiresTitle: true,
      requiresConsent: true,
    },
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'center-left',
      typicalScale: 'medium-large',
    },
  },
  
  'people-executive-portrait': {
    id: 'people-executive-portrait',
    category: 'people',
    label: 'Executive/Leadership Portrait',
    description: 'Professional portrait of executive team member',
    icon: 'UserCheck',
    examples: ['VP headshot', 'Director portrait', 'Management team member'],
    usageContext: ['leadership', 'team', 'about-us'],
    requirements: {
      recommendedFormat: ['jpg', 'png'],
      transparentBackground: 'optional',
      minResolution: { width: 800, height: 1000 },
      aspectRatio: 'portrait-preferred',
    },
    promptKeywords: ['executive', 'leadership', 'director', 'VP', 'management'],
    personMetadata: {
      requiresName: true,
      requiresTitle: true,
      requiresConsent: true,
    },
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'center',
      typicalScale: 'medium',
    },
  },
  
  'people-employee-headshot': {
    id: 'people-employee-headshot',
    category: 'people',
    label: 'Employee Headshot',
    description: 'Professional portrait of staff member',
    icon: 'User',
    examples: ['Team member photo', 'Staff headshot'],
    usageContext: ['team', 'testimonial', 'about-us'],
    requirements: {
      recommendedFormat: ['jpg', 'png'],
      transparentBackground: 'optional',
      minResolution: { width: 600, height: 800 },
      aspectRatio: 'portrait-preferred',
    },
    promptKeywords: ['employee', 'team member', 'staff', 'our team'],
    personMetadata: {
      requiresName: true,
      requiresTitle: 'optional',
      requiresConsent: true,
    },
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'center',
      typicalScale: 'medium',
    },
  },
  
  'people-employee-action': {
    id: 'people-employee-action',
    category: 'people',
    label: 'Employee at Work',
    description: 'Staff member performing their job or in work context',
    icon: 'UserCog',
    examples: ['Lab tech working', 'Customer service helping', 'Packaging products'],
    usageContext: ['behind-the-scenes', 'process', 'culture'],
    requirements: {
      recommendedFormat: ['jpg', 'webp'],
      transparentBackground: false,
      minResolution: { width: 1920, height: 1080 },
      aspectRatio: '16:9-preferred',
    },
    promptKeywords: ['working', 'making', 'team at work', 'behind the scenes'],
    personMetadata: {
      requiresName: 'optional',
      requiresTitle: 'optional',
      requiresConsent: true,
    },
    placementRules: {
      canBeComposited: false,
      canBeAnimated: true,
      typicalPosition: 'full-frame',
      typicalScale: 'full',
    },
  },
  
  'people-expert-portrait': {
    id: 'people-expert-portrait',
    category: 'people',
    label: 'Expert/Specialist Portrait',
    description: 'Photo of credentialed expert (doctor, nutritionist, etc.)',
    icon: 'GraduationCap',
    examples: ['Staff nutritionist', 'Medical advisor', 'Formulation scientist'],
    usageContext: ['authority', 'expertise', 'credibility'],
    requirements: {
      recommendedFormat: ['jpg', 'png'],
      transparentBackground: 'optional',
      minResolution: { width: 800, height: 1000 },
      aspectRatio: 'portrait-preferred',
    },
    promptKeywords: ['expert', 'doctor', 'specialist', 'scientist', 'nutritionist', 'formulated by'],
    personMetadata: {
      requiresName: true,
      requiresTitle: true,
      requiresCredentials: true,
      requiresConsent: true,
    },
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'center',
      typicalScale: 'medium-large',
    },
  },
  
  'people-customer-portrait': {
    id: 'people-customer-portrait',
    category: 'people',
    label: 'Customer Portrait',
    description: 'Real customer photo (with permission) for testimonials',
    icon: 'Heart',
    examples: ['Happy customer photo', 'Testimonial portrait'],
    usageContext: ['testimonial', 'social-proof', 'reviews'],
    requirements: {
      recommendedFormat: ['jpg', 'png'],
      transparentBackground: 'optional',
      minResolution: { width: 600, height: 800 },
      aspectRatio: 'flexible',
    },
    promptKeywords: ['customer', 'testimonial', 'review', 'real people', 'results'],
    personMetadata: {
      requiresName: 'optional',
      requiresConsent: true,
      requiresTestimonialRelease: true,
    },
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'center',
      typicalScale: 'medium',
    },
  },
  
  'people-customer-beforeafter': {
    id: 'people-customer-beforeafter',
    category: 'people',
    label: 'Customer Before/After',
    description: 'Before and after photos showing results (with permission)',
    icon: 'ArrowRightLeft',
    examples: ['Skin improvement', 'Wellness transformation'],
    usageContext: ['results', 'transformation', 'proof'],
    requirements: {
      recommendedFormat: ['jpg', 'png'],
      transparentBackground: false,
      minResolution: { width: 1200, height: 800 },
      aspectRatio: 'landscape-preferred',
    },
    promptKeywords: ['before', 'after', 'results', 'transformation', 'improvement'],
    personMetadata: {
      requiresConsent: true,
      requiresTestimonialRelease: true,
      requiresMedicalDisclaimer: true,
    },
    placementRules: {
      canBeComposited: false,
      canBeAnimated: true,
      typicalPosition: 'full-frame',
      typicalScale: 'full',
    },
  },
  
  'people-group-team': {
    id: 'people-group-team',
    category: 'people',
    label: 'Team Group Photo',
    description: 'Multiple team members together',
    icon: 'Users',
    examples: ['Full team photo', 'Department group shot'],
    usageContext: ['about-us', 'culture', 'team'],
    requirements: {
      recommendedFormat: ['jpg', 'webp'],
      transparentBackground: false,
      minResolution: { width: 1920, height: 1080 },
      aspectRatio: 'landscape-preferred',
    },
    promptKeywords: ['team', 'group', 'our people', 'staff'],
    personMetadata: {
      requiresConsent: true,
    },
    placementRules: {
      canBeComposited: false,
      canBeAnimated: true,
      typicalPosition: 'full-frame',
      typicalScale: 'full',
    },
  },
  
  'people-spokesperson': {
    id: 'people-spokesperson',
    category: 'people',
    label: 'Brand Spokesperson',
    description: 'Official brand representative or ambassador',
    icon: 'Mic',
    examples: ['Brand ambassador', 'Paid spokesperson', 'Influencer partner'],
    usageContext: ['promotion', 'endorsement', 'campaign'],
    requirements: {
      recommendedFormat: ['jpg', 'png'],
      transparentBackground: 'optional',
      minResolution: { width: 1000, height: 1200 },
      aspectRatio: 'portrait-preferred',
    },
    promptKeywords: ['spokesperson', 'ambassador', 'endorsement', 'partner'],
    personMetadata: {
      requiresName: true,
      requiresConsent: true,
      requiresEndorsementDisclosure: true,
    },
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'center',
      typicalScale: 'large',
    },
  },
};
```

### Category 4: Logos & Branding

```typescript
const LOGO_ASSET_TYPES = {
  'logo-primary-color': {
    id: 'logo-primary-color',
    category: 'logos',
    label: 'Primary Logo (Full Color)',
    description: 'Main brand logo in full color, for hero placement',
    icon: 'Hexagon',
    examples: ['Pine Hill Farm main logo', 'Full color brand mark'],
    usageContext: ['hero', 'intro', 'outro', 'prominent'],
    requirements: {
      recommendedFormat: ['png', 'svg'],
      transparentBackground: true,
      minResolution: { width: 1000, height: 500 },
      aspectRatio: 'flexible',
    },
    promptKeywords: ['logo', 'brand', 'Pine Hill Farm'],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'center',
      typicalScale: 'large',
      animationStyle: 'scale-up',
    },
  },
  
  'logo-primary-white': {
    id: 'logo-primary-white',
    category: 'logos',
    label: 'Primary Logo (White/Light)',
    description: 'Main logo in white/light color for dark backgrounds',
    icon: 'Hexagon',
    examples: ['White version of logo', 'Reversed logo'],
    usageContext: ['dark-background', 'overlay', 'cinematic'],
    requirements: {
      recommendedFormat: ['png', 'svg'],
      transparentBackground: true,
      minResolution: { width: 1000, height: 500 },
      aspectRatio: 'flexible',
    },
    promptKeywords: ['logo', 'brand'],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'center',
      typicalScale: 'large',
      backgroundRequirement: 'dark',
    },
  },
  
  'logo-primary-dark': {
    id: 'logo-primary-dark',
    category: 'logos',
    label: 'Primary Logo (Dark/Black)',
    description: 'Main logo in dark/black color for light backgrounds',
    icon: 'Hexagon',
    examples: ['Black version of logo', 'Dark single-color logo'],
    usageContext: ['light-background', 'print-style'],
    requirements: {
      recommendedFormat: ['png', 'svg'],
      transparentBackground: true,
      minResolution: { width: 1000, height: 500 },
      aspectRatio: 'flexible',
    },
    promptKeywords: ['logo', 'brand'],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'center',
      typicalScale: 'large',
      backgroundRequirement: 'light',
    },
  },
  
  'logo-watermark': {
    id: 'logo-watermark',
    category: 'logos',
    label: 'Watermark Logo',
    description: 'Simplified logo for corner watermark placement',
    icon: 'Stamp',
    examples: ['Small corner logo', 'Simplified brand mark'],
    usageContext: ['watermark', 'corner', 'subtle-branding'],
    requirements: {
      recommendedFormat: ['png', 'svg'],
      transparentBackground: true,
      minResolution: { width: 200, height: 200 },
      aspectRatio: 'square-preferred',
    },
    promptKeywords: [], // Watermarks don't match to prompts
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'bottom-right',
      typicalScale: 'small',
      typicalOpacity: 0.5,
      animationStyle: 'fade-in',
    },
  },
  
  'logo-icon-only': {
    id: 'logo-icon-only',
    category: 'logos',
    label: 'Logo Icon/Symbol Only',
    description: 'Just the icon/symbol portion without text',
    icon: 'Circle',
    examples: ['Brand symbol', 'App icon', 'Favicon-style mark'],
    usageContext: ['icon', 'small-space', 'social-media'],
    requirements: {
      recommendedFormat: ['png', 'svg'],
      transparentBackground: true,
      minResolution: { width: 500, height: 500 },
      aspectRatio: 'square',
    },
    promptKeywords: ['icon', 'symbol'],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'flexible',
      typicalScale: 'small-medium',
    },
  },
  
  'logo-wordmark': {
    id: 'logo-wordmark',
    category: 'logos',
    label: 'Wordmark/Text Logo',
    description: 'Text-only version of logo without icon',
    icon: 'Type',
    examples: ['Brand name in logo font', 'Text-only logo'],
    usageContext: ['text-heavy', 'signature', 'formal'],
    requirements: {
      recommendedFormat: ['png', 'svg'],
      transparentBackground: true,
      minResolution: { width: 800, height: 200 },
      aspectRatio: 'wide',
    },
    promptKeywords: ['Pine Hill Farm', 'brand name'],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'center-bottom',
      typicalScale: 'medium',
    },
  },
  
  'logo-tagline': {
    id: 'logo-tagline',
    category: 'logos',
    label: 'Logo with Tagline',
    description: 'Logo including brand tagline/slogan',
    icon: 'Quote',
    examples: ['Logo + "Naturally Better"', 'Full brand lockup with tagline'],
    usageContext: ['intro', 'outro', 'formal'],
    requirements: {
      recommendedFormat: ['png', 'svg'],
      transparentBackground: true,
      minResolution: { width: 1200, height: 600 },
      aspectRatio: 'landscape',
    },
    promptKeywords: ['logo', 'tagline', 'slogan'],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'center',
      typicalScale: 'large',
    },
  },
  
  'logo-animated': {
    id: 'logo-animated',
    category: 'logos',
    label: 'Animated Logo',
    description: 'Pre-animated logo (GIF, video, or Lottie)',
    icon: 'Play',
    examples: ['Logo reveal animation', 'Animated brand intro'],
    usageContext: ['intro', 'outro', 'transition'],
    requirements: {
      recommendedFormat: ['gif', 'mp4', 'webm', 'json'],
      transparentBackground: 'recommended',
      minResolution: { width: 1000, height: 500 },
      aspectRatio: 'flexible',
    },
    promptKeywords: [],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: false, // Already animated
      typicalPosition: 'center',
      typicalScale: 'large',
    },
  },
};
```

### Category 5: Trust & Credibility

```typescript
const TRUST_ASSET_TYPES = {
  'trust-certification-usda': {
    id: 'trust-certification-usda',
    category: 'trust',
    label: 'USDA Organic Certification',
    description: 'Official USDA Organic seal',
    icon: 'ShieldCheck',
    examples: ['USDA Organic badge'],
    usageContext: ['certification', 'organic', 'compliance'],
    requirements: {
      recommendedFormat: ['png', 'svg'],
      transparentBackground: true,
      minResolution: { width: 300, height: 300 },
      aspectRatio: 'square',
    },
    promptKeywords: ['USDA', 'organic', 'certified', 'certification'],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'bottom-left',
      typicalScale: 'small',
      animationStyle: 'fade-in',
    },
  },
  
  'trust-certification-nongmo': {
    id: 'trust-certification-nongmo',
    category: 'trust',
    label: 'Non-GMO Certification',
    description: 'Non-GMO Project Verified or similar seal',
    icon: 'ShieldCheck',
    examples: ['Non-GMO Project Verified badge'],
    usageContext: ['certification', 'non-gmo', 'compliance'],
    requirements: {
      recommendedFormat: ['png', 'svg'],
      transparentBackground: true,
      minResolution: { width: 300, height: 300 },
      aspectRatio: 'square',
    },
    promptKeywords: ['non-GMO', 'GMO-free', 'certified'],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'bottom-left',
      typicalScale: 'small',
    },
  },
  
  'trust-certification-gmp': {
    id: 'trust-certification-gmp',
    category: 'trust',
    label: 'GMP Certified',
    description: 'Good Manufacturing Practice certification',
    icon: 'ShieldCheck',
    examples: ['GMP Certified badge', 'cGMP seal'],
    usageContext: ['quality', 'manufacturing', 'compliance'],
    requirements: {
      recommendedFormat: ['png', 'svg'],
      transparentBackground: true,
      minResolution: { width: 300, height: 300 },
      aspectRatio: 'flexible',
    },
    promptKeywords: ['GMP', 'certified', 'quality', 'manufacturing'],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'bottom-left',
      typicalScale: 'small',
    },
  },
  
  'trust-certification-thirdparty': {
    id: 'trust-certification-thirdparty',
    category: 'trust',
    label: 'Third-Party Tested Badge',
    description: 'Independent lab testing certification',
    icon: 'FlaskConical',
    examples: ['Third-party tested seal', 'Lab verified badge'],
    usageContext: ['testing', 'verification', 'purity'],
    requirements: {
      recommendedFormat: ['png', 'svg'],
      transparentBackground: true,
      minResolution: { width: 300, height: 300 },
      aspectRatio: 'flexible',
    },
    promptKeywords: ['tested', 'third-party', 'lab', 'verified', 'purity'],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'bottom-left',
      typicalScale: 'small',
    },
  },
  
  'trust-certification-vegan': {
    id: 'trust-certification-vegan',
    category: 'trust',
    label: 'Vegan/Cruelty-Free Certification',
    description: 'Vegan Society, Leaping Bunny, or similar',
    icon: 'Leaf',
    examples: ['Vegan certified badge', 'Cruelty-free seal'],
    usageContext: ['vegan', 'cruelty-free', 'ethical'],
    requirements: {
      recommendedFormat: ['png', 'svg'],
      transparentBackground: true,
      minResolution: { width: 300, height: 300 },
      aspectRatio: 'flexible',
    },
    promptKeywords: ['vegan', 'cruelty-free', 'animal-free'],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'bottom-left',
      typicalScale: 'small',
    },
  },
  
  'trust-certification-other': {
    id: 'trust-certification-other',
    category: 'trust',
    label: 'Other Certification',
    description: 'Any other industry certification or seal',
    icon: 'Award',
    examples: ['Gluten-free certified', 'Kosher', 'Halal', 'B-Corp'],
    usageContext: ['certification', 'compliance'],
    requirements: {
      recommendedFormat: ['png', 'svg'],
      transparentBackground: true,
      minResolution: { width: 300, height: 300 },
      aspectRatio: 'flexible',
    },
    promptKeywords: ['certified', 'certification'],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'bottom-left',
      typicalScale: 'small',
    },
  },
  
  'trust-award-badge': {
    id: 'trust-award-badge',
    category: 'trust',
    label: 'Award/Recognition Badge',
    description: 'Industry award, "Best of" recognition, etc.',
    icon: 'Trophy',
    examples: ['Best of 2024 winner', 'Editor\'s Choice', 'Industry award'],
    usageContext: ['awards', 'recognition', 'credibility'],
    requirements: {
      recommendedFormat: ['png', 'svg'],
      transparentBackground: true,
      minResolution: { width: 400, height: 400 },
      aspectRatio: 'flexible',
    },
    promptKeywords: ['award', 'winner', 'best', 'recognition'],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'top-right',
      typicalScale: 'small-medium',
    },
  },
  
  'trust-partnership-logo': {
    id: 'trust-partnership-logo',
    category: 'trust',
    label: 'Partner Organization Logo',
    description: 'Logo of partner, affiliate, or collaborating organization',
    icon: 'Handshake',
    examples: ['Charity partner logo', 'Industry association', 'Retailer logo'],
    usageContext: ['partnership', 'collaboration', 'distribution'],
    requirements: {
      recommendedFormat: ['png', 'svg'],
      transparentBackground: true,
      minResolution: { width: 400, height: 200 },
      aspectRatio: 'flexible',
    },
    promptKeywords: ['partner', 'partnership', 'collaboration', 'available at'],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'bottom',
      typicalScale: 'small',
    },
  },
  
  'trust-press-logo': {
    id: 'trust-press-logo',
    category: 'trust',
    label: 'Press/Media Logo',
    description: 'Logo of media outlet that featured the brand',
    icon: 'Newspaper',
    examples: ['As seen in Forbes', 'Featured on GMA', 'NYT mention'],
    usageContext: ['press', 'media', 'as-seen-in'],
    requirements: {
      recommendedFormat: ['png', 'svg'],
      transparentBackground: true,
      minResolution: { width: 300, height: 100 },
      aspectRatio: 'landscape',
    },
    promptKeywords: ['featured', 'as seen in', 'press', 'media'],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'bottom',
      typicalScale: 'small',
    },
  },
  
  'trust-testimonial-quote': {
    id: 'trust-testimonial-quote',
    category: 'trust',
    label: 'Testimonial Quote Card',
    description: 'Pre-designed testimonial quote graphic',
    icon: 'MessageSquareQuote',
    examples: ['Customer quote card', '5-star review graphic'],
    usageContext: ['testimonial', 'review', 'social-proof'],
    requirements: {
      recommendedFormat: ['png', 'jpg'],
      transparentBackground: 'optional',
      minResolution: { width: 1080, height: 1080 },
      aspectRatio: 'square-preferred',
    },
    promptKeywords: ['testimonial', 'review', 'customer says'],
    placementRules: {
      canBeComposited: false,
      canBeAnimated: true,
      typicalPosition: 'full-frame',
      typicalScale: 'full',
    },
  },
  
  'trust-rating-stars': {
    id: 'trust-rating-stars',
    category: 'trust',
    label: 'Rating/Stars Graphic',
    description: 'Star rating visualization (e.g., 4.8 stars)',
    icon: 'Star',
    examples: ['4.9 star rating graphic', 'Amazon rating badge'],
    usageContext: ['rating', 'reviews', 'social-proof'],
    requirements: {
      recommendedFormat: ['png', 'svg'],
      transparentBackground: true,
      minResolution: { width: 400, height: 100 },
      aspectRatio: 'landscape',
    },
    promptKeywords: ['rating', 'stars', 'reviews', 'rated'],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'bottom',
      typicalScale: 'small',
    },
  },
};
```

### Category 6: Creative Assets

```typescript
const CREATIVE_ASSET_TYPES = {
  'creative-background-texture': {
    id: 'creative-background-texture',
    category: 'creative',
    label: 'Background Texture/Pattern',
    description: 'Brand texture, pattern, or abstract background',
    icon: 'Palette',
    examples: ['Brand pattern', 'Textured background', 'Abstract brand art'],
    usageContext: ['background', 'motion-graphics', 'texture'],
    requirements: {
      recommendedFormat: ['jpg', 'png', 'webp'],
      transparentBackground: false,
      minResolution: { width: 1920, height: 1080 },
      aspectRatio: '16:9-preferred',
      tileable: 'optional',
    },
    promptKeywords: ['background', 'texture', 'pattern'],
    placementRules: {
      canBeComposited: false,
      canBeAnimated: true,
      typicalPosition: 'background',
      typicalScale: 'full',
    },
  },
  
  'creative-icon-set': {
    id: 'creative-icon-set',
    category: 'creative',
    label: 'Custom Icon Set',
    description: 'Brand-styled icons for infographics',
    icon: 'Shapes',
    examples: ['Ingredient icons', 'Benefit icons', 'Process step icons'],
    usageContext: ['infographic', 'icons', 'motion-graphics'],
    requirements: {
      recommendedFormat: ['svg', 'png'],
      transparentBackground: true,
      minResolution: { width: 200, height: 200 },
      aspectRatio: 'square',
    },
    promptKeywords: ['icon', 'graphic', 'symbol'],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'flexible',
      typicalScale: 'small',
    },
  },
  
  'creative-illustration': {
    id: 'creative-illustration',
    category: 'creative',
    label: 'Custom Illustration',
    description: 'Brand illustration, artwork, or custom graphic',
    icon: 'PenTool',
    examples: ['Hand-drawn illustration', 'Brand artwork', 'Custom graphic'],
    usageContext: ['illustration', 'artistic', 'brand-story'],
    requirements: {
      recommendedFormat: ['png', 'svg', 'jpg'],
      transparentBackground: 'optional',
      minResolution: { width: 1000, height: 1000 },
      aspectRatio: 'flexible',
    },
    promptKeywords: ['illustration', 'artwork', 'graphic'],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'flexible',
      typicalScale: 'medium-large',
    },
  },
  
  'creative-infographic': {
    id: 'creative-infographic',
    category: 'creative',
    label: 'Infographic/Data Viz',
    description: 'Pre-designed infographic or data visualization',
    icon: 'BarChart',
    examples: ['Ingredient comparison chart', 'Process infographic'],
    usageContext: ['education', 'data', 'comparison'],
    requirements: {
      recommendedFormat: ['png', 'svg', 'jpg'],
      transparentBackground: 'optional',
      minResolution: { width: 1920, height: 1080 },
      aspectRatio: 'flexible',
    },
    promptKeywords: ['infographic', 'chart', 'data', 'comparison'],
    placementRules: {
      canBeComposited: false,
      canBeAnimated: true,
      typicalPosition: 'full-frame',
      typicalScale: 'full',
    },
  },
  
  'creative-social-template': {
    id: 'creative-social-template',
    category: 'creative',
    label: 'Social Media Template',
    description: 'Pre-designed social post template',
    icon: 'Share2',
    examples: ['Instagram post template', 'Story template'],
    usageContext: ['social-media', 'template'],
    requirements: {
      recommendedFormat: ['png', 'psd', 'fig'],
      transparentBackground: false,
      minResolution: { width: 1080, height: 1080 },
      aspectRatio: 'platform-specific',
    },
    promptKeywords: [],
    placementRules: {
      canBeComposited: false,
      canBeAnimated: false,
      typicalPosition: 'full-frame',
      typicalScale: 'full',
    },
  },
  
  'creative-lower-third': {
    id: 'creative-lower-third',
    category: 'creative',
    label: 'Lower Third Template',
    description: 'Pre-designed lower third graphic for names/titles',
    icon: 'RectangleHorizontal',
    examples: ['Speaker name lower third', 'Title card template'],
    usageContext: ['lower-third', 'name-title', 'motion-graphics'],
    requirements: {
      recommendedFormat: ['png', 'svg'],
      transparentBackground: true,
      minResolution: { width: 1920, height: 300 },
      aspectRatio: 'wide',
    },
    promptKeywords: [],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'bottom',
      typicalScale: 'full-width',
    },
  },
  
  'creative-transition': {
    id: 'creative-transition',
    category: 'creative',
    label: 'Transition/Wipe',
    description: 'Pre-designed transition animation',
    icon: 'ArrowLeftRight',
    examples: ['Brand wipe transition', 'Logo reveal transition'],
    usageContext: ['transition', 'scene-change'],
    requirements: {
      recommendedFormat: ['mp4', 'webm', 'mov'],
      transparentBackground: 'recommended',
      minResolution: { width: 1920, height: 1080 },
      aspectRatio: '16:9',
    },
    promptKeywords: [],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: false,
      typicalPosition: 'full-frame',
      typicalScale: 'full',
    },
  },
  
  'creative-intro-video': {
    id: 'creative-intro-video',
    category: 'creative',
    label: 'Video Intro/Bumper',
    description: 'Pre-made video intro or bumper',
    icon: 'Film',
    examples: ['5-second logo intro', 'Brand bumper'],
    usageContext: ['intro', 'opener'],
    requirements: {
      recommendedFormat: ['mp4', 'mov'],
      transparentBackground: false,
      minResolution: { width: 1920, height: 1080 },
      aspectRatio: '16:9',
      maxDuration: 10,
    },
    promptKeywords: [],
    placementRules: {
      canBeComposited: false,
      canBeAnimated: false,
      typicalPosition: 'full-frame',
      typicalScale: 'full',
    },
  },
  
  'creative-outro-video': {
    id: 'creative-outro-video',
    category: 'creative',
    label: 'Video Outro/End Card',
    description: 'Pre-made video outro or end card',
    icon: 'Film',
    examples: ['End card with CTA', 'Closing animation'],
    usageContext: ['outro', 'closer', 'cta'],
    requirements: {
      recommendedFormat: ['mp4', 'mov'],
      transparentBackground: false,
      minResolution: { width: 1920, height: 1080 },
      aspectRatio: '16:9',
      maxDuration: 15,
    },
    promptKeywords: [],
    placementRules: {
      canBeComposited: false,
      canBeAnimated: false,
      typicalPosition: 'full-frame',
      typicalScale: 'full',
    },
  },
  
  'creative-music-audio': {
    id: 'creative-music-audio',
    category: 'creative',
    label: 'Brand Music/Jingle',
    description: 'Custom brand music, jingle, or audio signature',
    icon: 'Music',
    examples: ['Brand jingle', 'Sonic logo', 'Custom background music'],
    usageContext: ['audio', 'music', 'branding'],
    requirements: {
      recommendedFormat: ['mp3', 'wav', 'aac'],
      transparentBackground: false,
      minResolution: null,
      aspectRatio: null,
    },
    promptKeywords: [],
    placementRules: {
      canBeComposited: false,
      canBeAnimated: false,
      typicalPosition: null,
      typicalScale: null,
    },
  },
};
```

### Category 7: Services & Programs

```typescript
const SERVICES_ASSET_TYPES = {
  // === FUNCTIONAL HEALTH SERVICES ===
  'service-functional-health-hero': {
    id: 'service-functional-health-hero',
    category: 'services',
    label: 'Functional Health Services Hero',
    description: 'Main promotional image for Functional Health Services',
    icon: 'Activity',
    examples: ['Consultation room', 'Health assessment in progress'],
    usageContext: ['service-promotion', 'functional-health', 'hero'],
    requirements: {
      recommendedFormat: ['jpg', 'webp'],
      transparentBackground: false,
      minResolution: { width: 1920, height: 1080 },
      aspectRatio: '16:9-preferred',
    },
    promptKeywords: ['functional health', 'health services', 'consultation', 'assessment', 'holistic health'],
    placementRules: {
      canBeComposited: false,
      canBeAnimated: true,
      typicalPosition: 'full-frame',
      typicalScale: 'full',
    },
  },
  
  'service-lab-testing-hero': {
    id: 'service-lab-testing-hero',
    category: 'services',
    label: 'Lab Testing Services Hero',
    description: 'Main promotional image for Lab Testing services',
    icon: 'FlaskConical',
    examples: ['Lab equipment', 'Test kits display', 'Sample collection'],
    usageContext: ['service-promotion', 'lab-testing', 'hero'],
    requirements: {
      recommendedFormat: ['jpg', 'webp'],
      transparentBackground: false,
      minResolution: { width: 1920, height: 1080 },
      aspectRatio: '16:9-preferred',
    },
    promptKeywords: ['lab testing', 'laboratory', 'test', 'analysis', 'diagnostic'],
    placementRules: {
      canBeComposited: false,
      canBeAnimated: true,
      typicalPosition: 'full-frame',
      typicalScale: 'full',
    },
  },
  
  'service-lab-test-kit': {
    id: 'service-lab-test-kit',
    category: 'services',
    label: 'Lab Test Kit Photo',
    description: 'Photo of specific lab test kit or collection materials',
    icon: 'Package',
    examples: ['Hormone test kit', 'Food sensitivity kit', 'At-home collection kit'],
    usageContext: ['product-display', 'lab-testing', 'kit'],
    requirements: {
      recommendedFormat: ['png', 'jpg'],
      transparentBackground: 'recommended',
      minResolution: { width: 1000, height: 1000 },
      aspectRatio: 'flexible',
    },
    promptKeywords: ['test kit', 'collection kit', 'lab kit', 'testing supplies'],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'center',
      typicalScale: 'medium-large',
    },
  },
  
  // === BIOSCAN SRT ===
  'service-bioscan-device': {
    id: 'service-bioscan-device',
    category: 'services',
    label: 'BioScan SRT Device',
    description: 'Photo of BioScan SRT equipment/device',
    icon: 'Cpu',
    examples: ['BioScan machine', 'SRT device close-up', 'Equipment in use'],
    usageContext: ['equipment', 'bioscan', 'technology'],
    requirements: {
      recommendedFormat: ['png', 'jpg'],
      transparentBackground: 'optional',
      minResolution: { width: 1200, height: 1200 },
      aspectRatio: 'flexible',
    },
    promptKeywords: ['BioScan', 'SRT', 'biofeedback', 'scanning', 'device', 'technology'],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'center',
      typicalScale: 'medium-large',
    },
  },
  
  'service-bioscan-session': {
    id: 'service-bioscan-session',
    category: 'services',
    label: 'BioScan SRT Session',
    description: 'Photo of BioScan SRT session in progress with client',
    icon: 'Users',
    examples: ['Client using BioScan', 'Practitioner conducting scan', 'Session in progress'],
    usageContext: ['service-in-action', 'bioscan', 'client-experience'],
    requirements: {
      recommendedFormat: ['jpg', 'webp'],
      transparentBackground: false,
      minResolution: { width: 1920, height: 1080 },
      aspectRatio: '16:9-preferred',
    },
    promptKeywords: ['BioScan session', 'SRT treatment', 'biofeedback session', 'scanning'],
    personMetadata: {
      requiresConsent: true,
    },
    placementRules: {
      canBeComposited: false,
      canBeAnimated: true,
      typicalPosition: 'full-frame',
      typicalScale: 'full',
    },
  },
  
  'service-bioscan-results': {
    id: 'service-bioscan-results',
    category: 'services',
    label: 'BioScan SRT Results Screen',
    description: 'Screenshot or photo of BioScan results/report interface',
    icon: 'MonitorCheck',
    examples: ['Results dashboard', 'Scan output', 'Analysis screen'],
    usageContext: ['results', 'technology', 'data-display'],
    requirements: {
      recommendedFormat: ['png', 'jpg'],
      transparentBackground: false,
      minResolution: { width: 1920, height: 1080 },
      aspectRatio: '16:9-preferred',
    },
    promptKeywords: ['results', 'scan results', 'BioScan report', 'analysis'],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'center',
      typicalScale: 'medium-large',
    },
  },
  
  // === WEIGHT MANAGEMENT ===
  'service-weight-management-hero': {
    id: 'service-weight-management-hero',
    category: 'services',
    label: 'Weight Management Program Hero',
    description: 'Main promotional image for Weight Management program',
    icon: 'Scale',
    examples: ['Healthy lifestyle imagery', 'Fitness/nutrition combo', 'Transformation journey'],
    usageContext: ['program-promotion', 'weight-management', 'hero'],
    requirements: {
      recommendedFormat: ['jpg', 'webp'],
      transparentBackground: false,
      minResolution: { width: 1920, height: 1080 },
      aspectRatio: '16:9-preferred',
    },
    promptKeywords: ['weight management', 'weight loss', 'healthy weight', 'metabolism', 'body composition'],
    placementRules: {
      canBeComposited: false,
      canBeAnimated: true,
      typicalPosition: 'full-frame',
      typicalScale: 'full',
    },
  },
  
  'service-weight-management-tools': {
    id: 'service-weight-management-tools',
    category: 'services',
    label: 'Weight Management Tools/Products',
    description: 'Products, supplements, or tools used in weight management program',
    icon: 'Package',
    examples: ['Program supplements', 'Meal plans', 'Tracking tools'],
    usageContext: ['product-display', 'weight-management', 'tools'],
    requirements: {
      recommendedFormat: ['png', 'jpg'],
      transparentBackground: 'optional',
      minResolution: { width: 1200, height: 1200 },
      aspectRatio: 'flexible',
    },
    promptKeywords: ['weight management products', 'supplements', 'program materials'],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'center',
      typicalScale: 'medium',
    },
  },
  
  // === WOMEN'S HORMONE HEALTH ===
  'service-hormone-health-hero': {
    id: 'service-hormone-health-hero',
    category: 'services',
    label: "Women's Hormone Health Hero",
    description: "Main promotional image for Women's Hormone Health program",
    icon: 'Heart',
    examples: ['Woman in wellness setting', 'Hormone balance imagery', 'Vitality/energy representation'],
    usageContext: ['program-promotion', 'hormone-health', 'hero'],
    requirements: {
      recommendedFormat: ['jpg', 'webp'],
      transparentBackground: false,
      minResolution: { width: 1920, height: 1080 },
      aspectRatio: '16:9-preferred',
    },
    promptKeywords: ['hormone health', 'women\'s health', 'hormone balance', 'menopause', 'perimenopause', 'hormones'],
    placementRules: {
      canBeComposited: false,
      canBeAnimated: true,
      typicalPosition: 'full-frame',
      typicalScale: 'full',
    },
  },
  
  'service-hormone-health-products': {
    id: 'service-hormone-health-products',
    category: 'services',
    label: 'Hormone Health Products',
    description: 'Products specific to hormone health program',
    icon: 'Package',
    examples: ['Hormone support supplements', 'Program kit', 'Specific formulations'],
    usageContext: ['product-display', 'hormone-health', 'supplements'],
    requirements: {
      recommendedFormat: ['png', 'jpg'],
      transparentBackground: 'optional',
      minResolution: { width: 1200, height: 1200 },
      aspectRatio: 'flexible',
    },
    promptKeywords: ['hormone supplements', 'women\'s supplements', 'hormone support'],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'center',
      typicalScale: 'medium',
    },
  },
  
  // === DETOXIFICATION ===
  'service-detox-hero': {
    id: 'service-detox-hero',
    category: 'services',
    label: 'Detoxification Program Hero',
    description: 'Main promotional image for Detoxification program',
    icon: 'Sparkles',
    examples: ['Cleanse/detox imagery', 'Renewal/fresh start', 'Clean eating'],
    usageContext: ['program-promotion', 'detox', 'hero'],
    requirements: {
      recommendedFormat: ['jpg', 'webp'],
      transparentBackground: false,
      minResolution: { width: 1920, height: 1080 },
      aspectRatio: '16:9-preferred',
    },
    promptKeywords: ['detox', 'detoxification', 'cleanse', 'purify', 'toxin', 'cleansing'],
    placementRules: {
      canBeComposited: false,
      canBeAnimated: true,
      typicalPosition: 'full-frame',
      typicalScale: 'full',
    },
  },
  
  'service-detox-products': {
    id: 'service-detox-products',
    category: 'services',
    label: 'Detoxification Products',
    description: 'Products used in detox program',
    icon: 'Package',
    examples: ['Detox supplements', 'Cleanse kit', 'Detox protocol products'],
    usageContext: ['product-display', 'detox', 'supplements'],
    requirements: {
      recommendedFormat: ['png', 'jpg'],
      transparentBackground: 'optional',
      minResolution: { width: 1200, height: 1200 },
      aspectRatio: 'flexible',
    },
    promptKeywords: ['detox products', 'cleanse supplements', 'detox kit'],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'center',
      typicalScale: 'medium',
    },
  },
  
  // === CHILDREN'S NATURAL HEALTH ===
  'service-childrens-health-hero': {
    id: 'service-childrens-health-hero',
    category: 'services',
    label: "Children's Natural Health Hero",
    description: "Main promotional image for Children's Natural Health program",
    icon: 'Baby',
    examples: ['Happy healthy child', 'Family wellness', 'Natural kids health'],
    usageContext: ['program-promotion', 'childrens-health', 'hero'],
    requirements: {
      recommendedFormat: ['jpg', 'webp'],
      transparentBackground: false,
      minResolution: { width: 1920, height: 1080 },
      aspectRatio: '16:9-preferred',
    },
    promptKeywords: ['children\'s health', 'kids health', 'pediatric', 'child wellness', 'family health'],
    placementRules: {
      canBeComposited: false,
      canBeAnimated: true,
      typicalPosition: 'full-frame',
      typicalScale: 'full',
    },
  },
  
  'service-childrens-health-products': {
    id: 'service-childrens-health-products',
    category: 'services',
    label: "Children's Health Products",
    description: 'Products for children\'s health program',
    icon: 'Package',
    examples: ['Kids supplements', 'Children\'s vitamins', 'Kid-friendly formulations'],
    usageContext: ['product-display', 'childrens-health', 'supplements'],
    requirements: {
      recommendedFormat: ['png', 'jpg'],
      transparentBackground: 'optional',
      minResolution: { width: 1200, height: 1200 },
      aspectRatio: 'flexible',
    },
    promptKeywords: ['children\'s supplements', 'kids vitamins', 'pediatric supplements'],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'center',
      typicalScale: 'medium',
    },
  },
  
  // === STRESS MANAGEMENT ===
  'service-stress-management-hero': {
    id: 'service-stress-management-hero',
    category: 'services',
    label: 'Stress Management Program Hero',
    description: 'Main promotional image for Stress Management program',
    icon: 'Brain',
    examples: ['Calm/relaxation imagery', 'Meditation', 'Peaceful setting'],
    usageContext: ['program-promotion', 'stress-management', 'hero'],
    requirements: {
      recommendedFormat: ['jpg', 'webp'],
      transparentBackground: false,
      minResolution: { width: 1920, height: 1080 },
      aspectRatio: '16:9-preferred',
    },
    promptKeywords: ['stress management', 'stress relief', 'relaxation', 'calm', 'anxiety', 'cortisol'],
    placementRules: {
      canBeComposited: false,
      canBeAnimated: true,
      typicalPosition: 'full-frame',
      typicalScale: 'full',
    },
  },
  
  'service-stress-management-products': {
    id: 'service-stress-management-products',
    category: 'services',
    label: 'Stress Management Products',
    description: 'Products for stress management program',
    icon: 'Package',
    examples: ['Adaptogens', 'Calming supplements', 'Stress support formulas'],
    usageContext: ['product-display', 'stress-management', 'supplements'],
    requirements: {
      recommendedFormat: ['png', 'jpg'],
      transparentBackground: 'optional',
      minResolution: { width: 1200, height: 1200 },
      aspectRatio: 'flexible',
    },
    promptKeywords: ['stress supplements', 'adaptogens', 'calming', 'anxiety support'],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'center',
      typicalScale: 'medium',
    },
  },
  
  // === FERTILITY HEALTH ===
  'service-fertility-health-hero': {
    id: 'service-fertility-health-hero',
    category: 'services',
    label: 'Fertility Health Program Hero',
    description: 'Main promotional image for Fertility Health program',
    icon: 'HeartPulse',
    examples: ['Hopeful parents imagery', 'Family planning', 'Fertility journey'],
    usageContext: ['program-promotion', 'fertility', 'hero'],
    requirements: {
      recommendedFormat: ['jpg', 'webp'],
      transparentBackground: false,
      minResolution: { width: 1920, height: 1080 },
      aspectRatio: '16:9-preferred',
    },
    promptKeywords: ['fertility', 'conception', 'pregnancy', 'reproductive health', 'trying to conceive'],
    placementRules: {
      canBeComposited: false,
      canBeAnimated: true,
      typicalPosition: 'full-frame',
      typicalScale: 'full',
    },
  },
  
  'service-fertility-health-products': {
    id: 'service-fertility-health-products',
    category: 'services',
    label: 'Fertility Health Products',
    description: 'Products for fertility health program',
    icon: 'Package',
    examples: ['Prenatal supplements', 'Fertility support', 'Conception aids'],
    usageContext: ['product-display', 'fertility', 'supplements'],
    requirements: {
      recommendedFormat: ['png', 'jpg'],
      transparentBackground: 'optional',
      minResolution: { width: 1200, height: 1200 },
      aspectRatio: 'flexible',
    },
    promptKeywords: ['fertility supplements', 'prenatal', 'conception support'],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'center',
      typicalScale: 'medium',
    },
  },
  
  // === MOLD EXPOSURE ===
  'service-mold-hero': {
    id: 'service-mold-hero',
    category: 'services',
    label: 'Mold Exposure Program Hero',
    description: 'Main promotional image for Mold exposure/recovery program',
    icon: 'Shield',
    examples: ['Recovery imagery', 'Environmental health', 'Clean air/home'],
    usageContext: ['program-promotion', 'mold', 'hero'],
    requirements: {
      recommendedFormat: ['jpg', 'webp'],
      transparentBackground: false,
      minResolution: { width: 1920, height: 1080 },
      aspectRatio: '16:9-preferred',
    },
    promptKeywords: ['mold', 'mold exposure', 'mycotoxin', 'mold illness', 'environmental toxins'],
    placementRules: {
      canBeComposited: false,
      canBeAnimated: true,
      typicalPosition: 'full-frame',
      typicalScale: 'full',
    },
  },
  
  'service-mold-products': {
    id: 'service-mold-products',
    category: 'services',
    label: 'Mold Recovery Products',
    description: 'Products for mold recovery program',
    icon: 'Package',
    examples: ['Binders', 'Detox support', 'Mold recovery protocol products'],
    usageContext: ['product-display', 'mold', 'supplements'],
    requirements: {
      recommendedFormat: ['png', 'jpg'],
      transparentBackground: 'optional',
      minResolution: { width: 1200, height: 1200 },
      aspectRatio: 'flexible',
    },
    promptKeywords: ['mold supplements', 'binders', 'mycotoxin support'],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'center',
      typicalScale: 'medium',
    },
  },
  
  'service-mold-testing': {
    id: 'service-mold-testing',
    category: 'services',
    label: 'Mold Testing Kit/Equipment',
    description: 'Mold testing kits or equipment photos',
    icon: 'FlaskConical',
    examples: ['Mold test kit', 'Environmental testing', 'Mycotoxin test'],
    usageContext: ['testing', 'mold', 'diagnostic'],
    requirements: {
      recommendedFormat: ['png', 'jpg'],
      transparentBackground: 'optional',
      minResolution: { width: 1000, height: 1000 },
      aspectRatio: 'flexible',
    },
    promptKeywords: ['mold test', 'mycotoxin test', 'environmental test'],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'center',
      typicalScale: 'medium',
    },
  },
  
  // === CBD 101 ===
  'service-cbd-hero': {
    id: 'service-cbd-hero',
    category: 'services',
    label: 'CBD 101 Program Hero',
    description: 'Main promotional image for CBD education program',
    icon: 'Leaf',
    examples: ['CBD education', 'Hemp imagery', 'Wellness with CBD'],
    usageContext: ['program-promotion', 'cbd', 'hero'],
    requirements: {
      recommendedFormat: ['jpg', 'webp'],
      transparentBackground: false,
      minResolution: { width: 1920, height: 1080 },
      aspectRatio: '16:9-preferred',
    },
    promptKeywords: ['CBD', 'cannabidiol', 'hemp', 'CBD education', 'CBD 101'],
    placementRules: {
      canBeComposited: false,
      canBeAnimated: true,
      typicalPosition: 'full-frame',
      typicalScale: 'full',
    },
  },
  
  'service-cbd-products': {
    id: 'service-cbd-products',
    category: 'services',
    label: 'CBD Products',
    description: 'CBD product photos',
    icon: 'Package',
    examples: ['CBD oil', 'CBD tinctures', 'Hemp products'],
    usageContext: ['product-display', 'cbd', 'supplements'],
    requirements: {
      recommendedFormat: ['png', 'jpg'],
      transparentBackground: 'optional',
      minResolution: { width: 1200, height: 1200 },
      aspectRatio: 'flexible',
    },
    promptKeywords: ['CBD oil', 'CBD products', 'hemp oil', 'cannabidiol'],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'center',
      typicalScale: 'medium',
    },
  },
  
  // === PET HEALTH ===
  'service-pet-health-hero': {
    id: 'service-pet-health-hero',
    category: 'services',
    label: 'Pet Health Program Hero',
    description: 'Main promotional image for Pet Health program',
    icon: 'Dog',
    examples: ['Healthy pets', 'Pet wellness', 'Dogs/cats with supplements'],
    usageContext: ['program-promotion', 'pet-health', 'hero'],
    requirements: {
      recommendedFormat: ['jpg', 'webp'],
      transparentBackground: false,
      minResolution: { width: 1920, height: 1080 },
      aspectRatio: '16:9-preferred',
    },
    promptKeywords: ['pet health', 'dog health', 'cat health', 'animal wellness', 'pet supplements'],
    placementRules: {
      canBeComposited: false,
      canBeAnimated: true,
      typicalPosition: 'full-frame',
      typicalScale: 'full',
    },
  },
  
  'service-pet-health-products': {
    id: 'service-pet-health-products',
    category: 'services',
    label: 'Pet Health Products',
    description: 'Pet supplements and health products',
    icon: 'Package',
    examples: ['Pet supplements', 'Animal vitamins', 'Pet wellness products'],
    usageContext: ['product-display', 'pet-health', 'supplements'],
    requirements: {
      recommendedFormat: ['png', 'jpg'],
      transparentBackground: 'optional',
      minResolution: { width: 1200, height: 1200 },
      aspectRatio: 'flexible',
    },
    promptKeywords: ['pet supplements', 'dog vitamins', 'cat supplements', 'animal health'],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'center',
      typicalScale: 'medium',
    },
  },
  
  // === PAIN MANAGEMENT ===
  'service-pain-management-hero': {
    id: 'service-pain-management-hero',
    category: 'services',
    label: 'Pain Management Program Hero',
    description: 'Main promotional image for Pain Management program',
    icon: 'Zap',
    examples: ['Relief imagery', 'Active/pain-free living', 'Natural pain solutions'],
    usageContext: ['program-promotion', 'pain-management', 'hero'],
    requirements: {
      recommendedFormat: ['jpg', 'webp'],
      transparentBackground: false,
      minResolution: { width: 1920, height: 1080 },
      aspectRatio: '16:9-preferred',
    },
    promptKeywords: ['pain management', 'pain relief', 'chronic pain', 'inflammation', 'joint pain'],
    placementRules: {
      canBeComposited: false,
      canBeAnimated: true,
      typicalPosition: 'full-frame',
      typicalScale: 'full',
    },
  },
  
  'service-pain-management-products': {
    id: 'service-pain-management-products',
    category: 'services',
    label: 'Pain Management Products',
    description: 'Products for pain management program',
    icon: 'Package',
    examples: ['Anti-inflammatory supplements', 'Joint support', 'Topical pain relief'],
    usageContext: ['product-display', 'pain-management', 'supplements'],
    requirements: {
      recommendedFormat: ['png', 'jpg'],
      transparentBackground: 'optional',
      minResolution: { width: 1200, height: 1200 },
      aspectRatio: 'flexible',
    },
    promptKeywords: ['pain supplements', 'anti-inflammatory', 'joint support'],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'center',
      typicalScale: 'medium',
    },
  },
  
  // === VAGUS NERVE RESET ===
  'service-vagus-nerve-hero': {
    id: 'service-vagus-nerve-hero',
    category: 'services',
    label: 'Vagus Nerve Reset Program Hero',
    description: 'Main promotional image for Vagus Nerve Reset program',
    icon: 'Workflow',
    examples: ['Nervous system health', 'Mind-body connection', 'Relaxation response'],
    usageContext: ['program-promotion', 'vagus-nerve', 'hero'],
    requirements: {
      recommendedFormat: ['jpg', 'webp'],
      transparentBackground: false,
      minResolution: { width: 1920, height: 1080 },
      aspectRatio: '16:9-preferred',
    },
    promptKeywords: ['vagus nerve', 'nervous system', 'parasympathetic', 'vagal tone', 'nerve reset'],
    placementRules: {
      canBeComposited: false,
      canBeAnimated: true,
      typicalPosition: 'full-frame',
      typicalScale: 'full',
    },
  },
  
  'service-vagus-nerve-techniques': {
    id: 'service-vagus-nerve-techniques',
    category: 'services',
    label: 'Vagus Nerve Techniques/Tools',
    description: 'Images of vagus nerve reset techniques or tools',
    icon: 'Hand',
    examples: ['Breathing exercises', 'Cold exposure', 'Stimulation devices'],
    usageContext: ['techniques', 'vagus-nerve', 'education'],
    requirements: {
      recommendedFormat: ['jpg', 'png'],
      transparentBackground: false,
      minResolution: { width: 1200, height: 800 },
      aspectRatio: 'flexible',
    },
    promptKeywords: ['vagus nerve exercises', 'breathing', 'vagal stimulation'],
    placementRules: {
      canBeComposited: false,
      canBeAnimated: true,
      typicalPosition: 'center',
      typicalScale: 'medium',
    },
  },
  
  // === FOOD SENSITIVITIES ===
  'service-food-sensitivities-hero': {
    id: 'service-food-sensitivities-hero',
    category: 'services',
    label: 'Food Sensitivities Program Hero',
    description: 'Main promotional image for Food Sensitivities program',
    icon: 'Utensils',
    examples: ['Food testing imagery', 'Elimination diet', 'Food awareness'],
    usageContext: ['program-promotion', 'food-sensitivities', 'hero'],
    requirements: {
      recommendedFormat: ['jpg', 'webp'],
      transparentBackground: false,
      minResolution: { width: 1920, height: 1080 },
      aspectRatio: '16:9-preferred',
    },
    promptKeywords: ['food sensitivities', 'food intolerance', 'food allergy', 'elimination diet', 'food reactions'],
    placementRules: {
      canBeComposited: false,
      canBeAnimated: true,
      typicalPosition: 'full-frame',
      typicalScale: 'full',
    },
  },
  
  'service-food-sensitivities-testing': {
    id: 'service-food-sensitivities-testing',
    category: 'services',
    label: 'Food Sensitivity Test Kit',
    description: 'Food sensitivity testing kit or results',
    icon: 'FlaskConical',
    examples: ['Food sensitivity panel', 'IgG test kit', 'Allergy test'],
    usageContext: ['testing', 'food-sensitivities', 'diagnostic'],
    requirements: {
      recommendedFormat: ['png', 'jpg'],
      transparentBackground: 'optional',
      minResolution: { width: 1000, height: 1000 },
      aspectRatio: 'flexible',
    },
    promptKeywords: ['food sensitivity test', 'allergy test', 'IgG test', 'food panel'],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'center',
      typicalScale: 'medium',
    },
  },
  
  // === LIVING WITH CHRONIC DISEASE ===
  'service-chronic-disease-hero': {
    id: 'service-chronic-disease-hero',
    category: 'services',
    label: 'Chronic Disease Program Hero',
    description: 'Main promotional image for Living with Chronic Disease program',
    icon: 'HeartHandshake',
    examples: ['Supportive care imagery', 'Living well', 'Chronic condition management'],
    usageContext: ['program-promotion', 'chronic-disease', 'hero'],
    requirements: {
      recommendedFormat: ['jpg', 'webp'],
      transparentBackground: false,
      minResolution: { width: 1920, height: 1080 },
      aspectRatio: '16:9-preferred',
    },
    promptKeywords: ['chronic disease', 'chronic illness', 'autoimmune', 'disease management', 'living with'],
    placementRules: {
      canBeComposited: false,
      canBeAnimated: true,
      typicalPosition: 'full-frame',
      typicalScale: 'full',
    },
  },
  
  'service-chronic-disease-support': {
    id: 'service-chronic-disease-support',
    category: 'services',
    label: 'Chronic Disease Support Products',
    description: 'Products for chronic disease management',
    icon: 'Package',
    examples: ['Support supplements', 'Immune support', 'Condition-specific products'],
    usageContext: ['product-display', 'chronic-disease', 'supplements'],
    requirements: {
      recommendedFormat: ['png', 'jpg'],
      transparentBackground: 'optional',
      minResolution: { width: 1200, height: 1200 },
      aspectRatio: 'flexible',
    },
    promptKeywords: ['chronic disease supplements', 'immune support', 'autoimmune support'],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'center',
      typicalScale: 'medium',
    },
  },
  
  // === GENERIC SERVICE ASSETS ===
  'service-consultation-room': {
    id: 'service-consultation-room',
    category: 'services',
    label: 'Consultation Room',
    description: 'Generic consultation or treatment room photo',
    icon: 'DoorOpen',
    examples: ['Client meeting room', 'Consultation space', 'Treatment area'],
    usageContext: ['location', 'services', 'consultation'],
    requirements: {
      recommendedFormat: ['jpg', 'webp'],
      transparentBackground: false,
      minResolution: { width: 1920, height: 1080 },
      aspectRatio: '16:9-preferred',
    },
    promptKeywords: ['consultation', 'appointment', 'meeting', 'session'],
    placementRules: {
      canBeComposited: false,
      canBeAnimated: true,
      typicalPosition: 'full-frame',
      typicalScale: 'full',
    },
  },
  
  'service-practitioner-action': {
    id: 'service-practitioner-action',
    category: 'services',
    label: 'Practitioner with Client',
    description: 'Photo of practitioner working with client (generic services)',
    icon: 'UserCheck',
    examples: ['Consultation in progress', 'Health assessment', 'Client education'],
    usageContext: ['services', 'consultation', 'client-experience'],
    requirements: {
      recommendedFormat: ['jpg', 'webp'],
      transparentBackground: false,
      minResolution: { width: 1920, height: 1080 },
      aspectRatio: '16:9-preferred',
    },
    promptKeywords: ['consultation', 'practitioner', 'appointment', 'health professional'],
    personMetadata: {
      requiresConsent: true,
    },
    placementRules: {
      canBeComposited: false,
      canBeAnimated: true,
      typicalPosition: 'full-frame',
      typicalScale: 'full',
    },
  },
  
  'service-program-icon': {
    id: 'service-program-icon',
    category: 'services',
    label: 'Program Icon/Badge',
    description: 'Custom icon or badge for a specific program',
    icon: 'Badge',
    examples: ['Weight management icon', 'Detox program badge', 'Service logo'],
    usageContext: ['icon', 'branding', 'program-identity'],
    requirements: {
      recommendedFormat: ['png', 'svg'],
      transparentBackground: true,
      minResolution: { width: 500, height: 500 },
      aspectRatio: 'square',
    },
    promptKeywords: [],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'corner',
      typicalScale: 'small',
    },
  },
  
  'service-infographic': {
    id: 'service-infographic',
    category: 'services',
    label: 'Service/Program Infographic',
    description: 'Infographic explaining a service or program',
    icon: 'BarChart',
    examples: ['Program process diagram', 'Service benefits infographic', 'How it works visual'],
    usageContext: ['education', 'infographic', 'program-explanation'],
    requirements: {
      recommendedFormat: ['png', 'jpg'],
      transparentBackground: 'optional',
      minResolution: { width: 1920, height: 1080 },
      aspectRatio: 'flexible',
    },
    promptKeywords: ['how it works', 'process', 'steps', 'benefits'],
    placementRules: {
      canBeComposited: false,
      canBeAnimated: true,
      typicalPosition: 'full-frame',
      typicalScale: 'full',
    },
  },
};
```

### Category 8: Documents & Screenshots

```typescript
const DOCUMENT_ASSET_TYPES = {
  'document-certificate': {
    id: 'document-certificate',
    category: 'documents',
    label: 'Certificate/License',
    description: 'Official certificate, license, or permit image',
    icon: 'FileCheck',
    examples: ['Business license', 'FDA registration', 'Organic certificate'],
    usageContext: ['compliance', 'credibility', 'legal'],
    requirements: {
      recommendedFormat: ['jpg', 'png', 'pdf'],
      transparentBackground: false,
      minResolution: { width: 1200, height: 900 },
      aspectRatio: 'document',
    },
    promptKeywords: ['certificate', 'license', 'certified', 'registered'],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'center',
      typicalScale: 'medium',
    },
  },
  
  'document-lab-report': {
    id: 'document-lab-report',
    category: 'documents',
    label: 'Lab Report/COA',
    description: 'Certificate of Analysis or lab test results',
    icon: 'FileText',
    examples: ['Third-party lab report', 'Purity test results'],
    usageContext: ['testing', 'transparency', 'quality'],
    requirements: {
      recommendedFormat: ['jpg', 'png', 'pdf'],
      transparentBackground: false,
      minResolution: { width: 1200, height: 1600 },
      aspectRatio: 'document',
    },
    promptKeywords: ['lab report', 'test results', 'COA', 'analysis'],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'center',
      typicalScale: 'medium',
    },
  },
  
  'document-screenshot-website': {
    id: 'document-screenshot-website',
    category: 'documents',
    label: 'Website Screenshot',
    description: 'Screenshot of company website or product page',
    icon: 'Monitor',
    examples: ['Homepage screenshot', 'Product page capture'],
    usageContext: ['website', 'digital', 'ecommerce'],
    requirements: {
      recommendedFormat: ['png', 'jpg'],
      transparentBackground: false,
      minResolution: { width: 1920, height: 1080 },
      aspectRatio: '16:9-preferred',
    },
    promptKeywords: ['website', 'online', 'shop', 'order'],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'center',
      typicalScale: 'medium-large',
    },
  },
  
  'document-screenshot-app': {
    id: 'document-screenshot-app',
    category: 'documents',
    label: 'App Screenshot',
    description: 'Screenshot of mobile app or software',
    icon: 'Smartphone',
    examples: ['Mobile app screenshot', 'App store listing'],
    usageContext: ['app', 'mobile', 'digital'],
    requirements: {
      recommendedFormat: ['png', 'jpg'],
      transparentBackground: false,
      minResolution: { width: 1080, height: 1920 },
      aspectRatio: '9:16',
    },
    promptKeywords: ['app', 'mobile', 'download'],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'center',
      typicalScale: 'medium',
    },
  },
  
  'document-screenshot-social': {
    id: 'document-screenshot-social',
    category: 'documents',
    label: 'Social Media Screenshot',
    description: 'Screenshot of social post, review, or comment',
    icon: 'MessageCircle',
    examples: ['Instagram post screenshot', 'Twitter mention'],
    usageContext: ['social-proof', 'ugc', 'reviews'],
    requirements: {
      recommendedFormat: ['png', 'jpg'],
      transparentBackground: false,
      minResolution: { width: 800, height: 800 },
      aspectRatio: 'flexible',
    },
    promptKeywords: ['social media', 'post', 'review', 'comment'],
    placementRules: {
      canBeComposited: true,
      canBeAnimated: true,
      typicalPosition: 'center',
      typicalScale: 'medium',
    },
  },
};
```

---

## Combined Asset Type Registry

```typescript
// server/config/brand-asset-types.ts

export const BRAND_ASSET_TYPES = {
  ...PRODUCT_ASSET_TYPES,
  ...LOCATION_ASSET_TYPES,
  ...PEOPLE_ASSET_TYPES,
  ...LOGO_ASSET_TYPES,
  ...TRUST_ASSET_TYPES,
  ...CREATIVE_ASSET_TYPES,
  ...DOCUMENT_ASSET_TYPES,
};

export const ASSET_CATEGORIES = [
  {
    id: 'products',
    label: 'Products',
    icon: 'Package',
    description: 'Product photos, packaging, ingredients',
    types: Object.values(PRODUCT_ASSET_TYPES),
  },
  {
    id: 'location',
    label: 'Location & Facility',
    icon: 'Building',
    description: 'Building, interior, grounds, manufacturing',
    types: Object.values(LOCATION_ASSET_TYPES),
  },
  {
    id: 'people',
    label: 'People',
    icon: 'Users',
    description: 'Founders, employees, customers, experts',
    types: Object.values(PEOPLE_ASSET_TYPES),
  },
  {
    id: 'logos',
    label: 'Logos & Branding',
    icon: 'Hexagon',
    description: 'Logos, wordmarks, watermarks',
    types: Object.values(LOGO_ASSET_TYPES),
  },
  {
    id: 'trust',
    label: 'Trust & Credibility',
    icon: 'ShieldCheck',
    description: 'Certifications, awards, partnerships, press',
    types: Object.values(TRUST_ASSET_TYPES),
  },
  {
    id: 'services',
    label: 'Services & Programs',
    icon: 'Activity',
    description: 'Functional health, lab testing, BioScan, wellness programs',
    types: Object.values(SERVICES_ASSET_TYPES),
  },
  {
    id: 'creative',
    label: 'Creative Assets',
    icon: 'Palette',
    description: 'Backgrounds, icons, templates, videos',
    types: Object.values(CREATIVE_ASSET_TYPES),
  },
  {
    id: 'documents',
    label: 'Documents & Screenshots',
    icon: 'FileText',
    description: 'Certificates, reports, screenshots',
    types: Object.values(DOCUMENT_ASSET_TYPES),
  },
];

// Helper to get asset type by ID
export function getAssetType(typeId: string) {
  return BRAND_ASSET_TYPES[typeId] || null;
}

// Helper to get types by category
export function getTypesByCategory(categoryId: string) {
  return Object.values(BRAND_ASSET_TYPES).filter(t => t.category === categoryId);
}

// Helper to find matching asset types for a prompt
export function findMatchingAssetTypes(prompt: string): string[] {
  const lower = prompt.toLowerCase();
  const matches: Array<{ typeId: string; score: number }> = [];
  
  for (const [typeId, assetType] of Object.entries(BRAND_ASSET_TYPES)) {
    let score = 0;
    
    for (const keyword of assetType.promptKeywords || []) {
      if (lower.includes(keyword.toLowerCase())) {
        score += 10;
      }
    }
    
    if (score > 0) {
      matches.push({ typeId, score });
    }
  }
  
  return matches
    .sort((a, b) => b.score - a.score)
    .map(m => m.typeId);
}
```

---

## Updated Upload UI Component

```tsx
// client/src/components/brand-media/AssetUploadModal.tsx

import React, { useState, useCallback } from 'react';
import { Upload, X, Check, AlertCircle, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ASSET_CATEGORIES, getAssetType } from '@/config/brand-asset-types';
import * as Icons from 'lucide-react';

interface AssetUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File, metadata: AssetMetadata) => void;
}

interface AssetMetadata {
  assetType: string;
  name: string;
  description?: string;
  tags?: string[];
  personInfo?: {
    name?: string;
    title?: string;
    credentials?: string;
    consentObtained: boolean;
  };
  productInfo?: {
    productName?: string;
    sku?: string;
  };
}

export const AssetUploadModal: React.FC<AssetUploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
}) => {
  // Step management
  const [step, setStep] = useState<'select-type' | 'upload' | 'details'>('select-type');
  
  // Selected asset type
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  
  // File
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  
  // Metadata
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  
  // Person-specific fields
  const [personName, setPersonName] = useState('');
  const [personTitle, setPersonTitle] = useState('');
  const [personCredentials, setPersonCredentials] = useState('');
  const [consentObtained, setConsentObtained] = useState(false);
  
  // Product-specific fields
  const [productName, setProductName] = useState('');
  const [productSku, setProductSku] = useState('');
  
  // Validation
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  const assetType = selectedType ? getAssetType(selectedType) : null;
  
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    
    // Generate preview
    if (selectedFile.type.startsWith('image/') || selectedFile.type.startsWith('video/')) {
      const url = URL.createObjectURL(selectedFile);
      setPreview(url);
    }
    
    // Auto-fill name from filename
    if (!name) {
      setName(selectedFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
    }
    
    setStep('details');
  }, [name]);
  
  const validateUpload = useCallback((): boolean => {
    const errors: string[] = [];
    
    if (!file) {
      errors.push('Please select a file');
    }
    
    if (!name.trim()) {
      errors.push('Please enter a name for this asset');
    }
    
    // Check format requirements
    if (file && assetType?.requirements?.recommendedFormat) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (!assetType.requirements.recommendedFormat.includes(extension)) {
        errors.push(`Recommended formats: ${assetType.requirements.recommendedFormat.join(', ')}`);
      }
    }
    
    // Check person consent for people category
    if (assetType?.category === 'people' && assetType.personMetadata?.requiresConsent) {
      if (!consentObtained) {
        errors.push('Please confirm you have consent to use this person\'s image');
      }
    }
    
    // Check required person fields
    if (assetType?.personMetadata?.requiresName === true && !personName.trim()) {
      errors.push('Person name is required for this asset type');
    }
    
    if (assetType?.personMetadata?.requiresTitle === true && !personTitle.trim()) {
      errors.push('Person title is required for this asset type');
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  }, [file, name, assetType, consentObtained, personName, personTitle]);
  
  const handleUpload = useCallback(() => {
    if (!validateUpload() || !file || !selectedType) return;
    
    const metadata: AssetMetadata = {
      assetType: selectedType,
      name: name.trim(),
      description: description.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
    };
    
    // Add person info if applicable
    if (assetType?.category === 'people') {
      metadata.personInfo = {
        name: personName.trim() || undefined,
        title: personTitle.trim() || undefined,
        credentials: personCredentials.trim() || undefined,
        consentObtained,
      };
    }
    
    // Add product info if applicable
    if (assetType?.category === 'products') {
      metadata.productInfo = {
        productName: productName.trim() || undefined,
        sku: productSku.trim() || undefined,
      };
    }
    
    onUpload(file, metadata);
    handleClose();
  }, [file, selectedType, name, description, tags, assetType, personName, personTitle, personCredentials, consentObtained, productName, productSku]);
  
  const handleClose = () => {
    // Reset state
    setStep('select-type');
    setSelectedCategory(null);
    setSelectedType(null);
    setFile(null);
    setPreview(null);
    setName('');
    setDescription('');
    setTags([]);
    setPersonName('');
    setPersonTitle('');
    setPersonCredentials('');
    setConsentObtained(false);
    setProductName('');
    setProductSku('');
    setValidationErrors([]);
    onClose();
  };
  
  const renderIcon = (iconName: string) => {
    const Icon = Icons[iconName as keyof typeof Icons] as React.FC<{ className?: string }>;
    return Icon ? <Icon className="w-5 h-5" /> : null;
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === 'select-type' && 'What are you uploading?'}
            {step === 'upload' && `Upload ${assetType?.label}`}
            {step === 'details' && 'Asset Details'}
          </DialogTitle>
        </DialogHeader>
        
        {/* Step 1: Select Asset Type */}
        {step === 'select-type' && (
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {ASSET_CATEGORIES.map((category) => (
                <div key={category.id} className="space-y-2">
                  {/* Category Header */}
                  <button
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      selectedCategory === category.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedCategory(
                      selectedCategory === category.id ? null : category.id
                    )}
                  >
                    {renderIcon(category.icon)}
                    <div className="flex-1 text-left">
                      <div className="font-medium">{category.label}</div>
                      <div className="text-sm text-gray-500">{category.description}</div>
                    </div>
                    <ChevronRight className={`w-5 h-5 transition-transform ${
                      selectedCategory === category.id ? 'rotate-90' : ''
                    }`} />
                  </button>
                  
                  {/* Asset Types in Category */}
                  {selectedCategory === category.id && (
                    <div className="ml-4 grid grid-cols-2 gap-2">
                      {category.types.map((type) => (
                        <button
                          key={type.id}
                          className={`p-3 rounded-lg border text-left transition-colors ${
                            selectedType === type.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => {
                            setSelectedType(type.id);
                            setStep('upload');
                          }}
                        >
                          <div className="flex items-center gap-2">
                            {renderIcon(type.icon)}
                            <span className="font-medium text-sm">{type.label}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {type.description}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        
        {/* Step 2: Upload File */}
        {step === 'upload' && assetType && (
          <div className="space-y-4">
            {/* Selected type info */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              {renderIcon(assetType.icon)}
              <div>
                <div className="font-medium">{assetType.label}</div>
                <div className="text-sm text-gray-500">{assetType.description}</div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={() => {
                  setSelectedType(null);
                  setStep('select-type');
                }}
              >
                Change
              </Button>
            </div>
            
            {/* Requirements */}
            {assetType.requirements && (
              <div className="text-sm text-gray-600 space-y-1">
                <p>
                  <strong>Recommended format:</strong>{' '}
                  {assetType.requirements.recommendedFormat?.join(', ').toUpperCase()}
                </p>
                {assetType.requirements.minResolution && (
                  <p>
                    <strong>Min resolution:</strong>{' '}
                    {assetType.requirements.minResolution.width}x
                    {assetType.requirements.minResolution.height}
                  </p>
                )}
                {assetType.requirements.transparentBackground === true && (
                  <p className="text-amber-600">
                    ⚠️ Transparent background required
                  </p>
                )}
                {assetType.requirements.transparentBackground === 'recommended' && (
                  <p className="text-blue-600">
                    💡 Transparent background recommended
                  </p>
                )}
              </div>
            )}
            
            {/* Upload area */}
            <label className="block">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors">
                <Upload className="w-10 h-10 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-600">
                  Click to upload or drag and drop
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  {assetType.requirements?.recommendedFormat?.join(', ').toUpperCase() || 'Any format'}
                </p>
              </div>
              <input
                type="file"
                className="hidden"
                accept={assetType.requirements?.recommendedFormat?.map(f => `.${f}`).join(',')}
                onChange={handleFileSelect}
              />
            </label>
            
            {/* Examples */}
            {assetType.examples && (
              <div className="text-sm">
                <strong>Examples:</strong>
                <ul className="list-disc list-inside text-gray-600 mt-1">
                  {assetType.examples.map((ex, i) => (
                    <li key={i}>{ex}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        
        {/* Step 3: Details */}
        {step === 'details' && assetType && (
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {/* Preview */}
              {preview && (
                <div className="relative">
                  {file?.type.startsWith('image/') ? (
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-full h-48 object-contain bg-gray-100 rounded-lg"
                    />
                  ) : file?.type.startsWith('video/') ? (
                    <video
                      src={preview}
                      controls
                      className="w-full h-48 object-contain bg-gray-100 rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-gray-400">{file?.name}</span>
                    </div>
                  )}
                  <Badge className="absolute top-2 left-2">
                    {assetType.label}
                  </Badge>
                </div>
              )}
              
              {/* Basic fields */}
              <div className="space-y-3">
                <div>
                  <Label htmlFor="name">Asset Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Pine Hill Farm Main Logo"
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description (optional)</Label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of this asset"
                  />
                </div>
              </div>
              
              {/* Product-specific fields */}
              {assetType.category === 'products' && (
                <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-sm">Product Information</h4>
                  <div>
                    <Label htmlFor="productName">Product Name</Label>
                    <Input
                      id="productName"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      placeholder="e.g., Black Cohosh Extract"
                    />
                  </div>
                  <div>
                    <Label htmlFor="productSku">SKU (optional)</Label>
                    <Input
                      id="productSku"
                      value={productSku}
                      onChange={(e) => setProductSku(e.target.value)}
                      placeholder="e.g., PHF-BC-001"
                    />
                  </div>
                </div>
              )}
              
              {/* Person-specific fields */}
              {assetType.category === 'people' && (
                <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-sm">Person Information</h4>
                  <div>
                    <Label htmlFor="personName">
                      Full Name {assetType.personMetadata?.requiresName === true ? '*' : ''}
                    </Label>
                    <Input
                      id="personName"
                      value={personName}
                      onChange={(e) => setPersonName(e.target.value)}
                      placeholder="e.g., Dr. Sarah Johnson"
                    />
                  </div>
                  <div>
                    <Label htmlFor="personTitle">
                      Title/Role {assetType.personMetadata?.requiresTitle === true ? '*' : ''}
                    </Label>
                    <Input
                      id="personTitle"
                      value={personTitle}
                      onChange={(e) => setPersonTitle(e.target.value)}
                      placeholder="e.g., Chief Science Officer"
                    />
                  </div>
                  {assetType.personMetadata?.requiresCredentials && (
                    <div>
                      <Label htmlFor="personCredentials">Credentials</Label>
                      <Input
                        id="personCredentials"
                        value={personCredentials}
                        onChange={(e) => setPersonCredentials(e.target.value)}
                        placeholder="e.g., PhD, RD, CNS"
                      />
                    </div>
                  )}
                  
                  {/* Consent checkbox */}
                  {assetType.personMetadata?.requiresConsent && (
                    <div className="flex items-start gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="consent"
                        checked={consentObtained}
                        onChange={(e) => setConsentObtained(e.target.checked)}
                        className="mt-1"
                      />
                      <label htmlFor="consent" className="text-sm text-gray-700">
                        I confirm that I have obtained permission from this person 
                        to use their image in video content. *
                      </label>
                    </div>
                  )}
                </div>
              )}
              
              {/* Validation errors */}
              {validationErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    <ul className="list-disc list-inside">
                      {validationErrors.map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </ScrollArea>
        )}
        
        {/* Footer */}
        <div className="flex justify-between pt-4 border-t">
          {step !== 'select-type' && (
            <Button
              variant="ghost"
              onClick={() => setStep(step === 'details' ? 'upload' : 'select-type')}
            >
              Back
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            {step === 'details' && (
              <Button onClick={handleUpload}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Asset
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AssetUploadModal;
```

---

## Updated Asset Matcher Integration

```typescript
// server/services/brand-asset-matcher.ts - Update to use asset types

import { BRAND_ASSET_TYPES, findMatchingAssetTypes, getAssetType } from '../config/brand-asset-types';

interface MatchResult {
  asset: BrandAsset;
  score: number;
  matchReason: string;
  assetType: typeof BRAND_ASSET_TYPES[string];
}

class BrandAssetMatcher {
  
  /**
   * Find matching assets for a visual direction
   */
  async findMatches(
    visualDirection: string,
    projectId: string,
    options?: {
      category?: string;
      limit?: number;
    }
  ): Promise<MatchResult[]> {
    
    // Find which asset types match the prompt
    const matchingTypeIds = findMatchingAssetTypes(visualDirection);
    
    console.log(`[AssetMatcher] Visual direction matches types: ${matchingTypeIds.join(', ')}`);
    
    // Query assets from database
    let query = db.select().from(brandAssets).where(eq(brandAssets.projectId, projectId));
    
    // Filter by category if specified
    if (options?.category) {
      query = query.where(eq(brandAssets.category, options.category));
    }
    
    const assets = await query;
    
    // Score each asset
    const scored: MatchResult[] = [];
    
    for (const asset of assets) {
      const assetType = getAssetType(asset.assetType);
      if (!assetType) continue;
      
      let score = 0;
      let matchReason = '';
      
      // Type match bonus
      const typeMatchIndex = matchingTypeIds.indexOf(asset.assetType);
      if (typeMatchIndex >= 0) {
        score += 100 - (typeMatchIndex * 10); // First match = 100, second = 90, etc.
        matchReason = `Asset type "${assetType.label}" matches prompt`;
      }
      
      // Name/description match
      const lower = visualDirection.toLowerCase();
      if (asset.name && lower.includes(asset.name.toLowerCase())) {
        score += 50;
        matchReason = matchReason || `Asset name matches: ${asset.name}`;
      }
      
      // Product name match
      if (asset.productInfo?.productName) {
        if (lower.includes(asset.productInfo.productName.toLowerCase())) {
          score += 80;
          matchReason = `Product "${asset.productInfo.productName}" mentioned in prompt`;
        }
      }
      
      // Person name match
      if (asset.personInfo?.name) {
        if (lower.includes(asset.personInfo.name.toLowerCase())) {
          score += 80;
          matchReason = `Person "${asset.personInfo.name}" mentioned in prompt`;
        }
      }
      
      // Tag match
      for (const tag of asset.tags || []) {
        if (lower.includes(tag.toLowerCase())) {
          score += 20;
        }
      }
      
      // Keyword match from asset type
      for (const keyword of assetType.promptKeywords || []) {
        if (lower.includes(keyword.toLowerCase())) {
          score += 15;
        }
      }
      
      if (score > 0) {
        scored.push({
          asset,
          score,
          matchReason,
          assetType,
        });
      }
    }
    
    // Sort by score and return top matches
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, options?.limit || 5);
  }
  
  /**
   * Get placement rules for an asset
   */
  getPlacementRules(assetTypeId: string) {
    const assetType = getAssetType(assetTypeId);
    return assetType?.placementRules || null;
  }
  
  /**
   * Check if asset meets requirements
   */
  validateAsset(
    file: { width?: number; height?: number; format?: string; hasTransparency?: boolean },
    assetTypeId: string
  ): { valid: boolean; warnings: string[] } {
    const assetType = getAssetType(assetTypeId);
    if (!assetType) return { valid: true, warnings: [] };
    
    const warnings: string[] = [];
    const req = assetType.requirements;
    
    // Check format
    if (req?.recommendedFormat && file.format) {
      if (!req.recommendedFormat.includes(file.format.toLowerCase())) {
        warnings.push(`Recommended format: ${req.recommendedFormat.join(', ')}`);
      }
    }
    
    // Check resolution
    if (req?.minResolution && file.width && file.height) {
      if (file.width < req.minResolution.width || file.height < req.minResolution.height) {
        warnings.push(`Minimum resolution: ${req.minResolution.width}x${req.minResolution.height}`);
      }
    }
    
    // Check transparency
    if (req?.transparentBackground === true && !file.hasTransparency) {
      warnings.push('Transparent background required');
    }
    
    return {
      valid: warnings.length === 0,
      warnings,
    };
  }
}

export const brandAssetMatcher = new BrandAssetMatcher();
```

---

## Database Schema Update

```typescript
// server/db/schema.ts - Add asset type and metadata columns

export const brandAssets = pgTable('brand_assets', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  
  // Asset classification
  assetType: text('asset_type').notNull(), // From BRAND_ASSET_TYPES
  category: text('category').notNull(),    // products, location, people, logos, etc.
  
  // Basic info
  name: text('name').notNull(),
  description: text('description'),
  tags: text('tags').array(),
  
  // File info
  fileUrl: text('file_url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  fileName: text('file_name'),
  fileSize: integer('file_size'),
  mimeType: text('mime_type'),
  width: integer('width'),
  height: integer('height'),
  duration: integer('duration'), // For video/audio
  hasTransparency: boolean('has_transparency'),
  
  // Product-specific metadata (JSON)
  productInfo: text('product_info'), // { productName, sku }
  
  // Person-specific metadata (JSON)
  personInfo: text('person_info'), // { name, title, credentials, consentObtained }
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Index for fast lookups
CREATE INDEX idx_brand_assets_project_type ON brand_assets(project_id, asset_type);
CREATE INDEX idx_brand_assets_category ON brand_assets(category);
```

---

## Summary: Asset Type Count

| Category | Types | Total |
|----------|-------|-------|
| Products | 8 | 8 |
| Location | 7 | 15 |
| People | 9 | 24 |
| Logos | 8 | 32 |
| Trust | 12 | 44 |
| **Services & Programs** | **38** | **82** |
| Creative | 10 | 92 |
| Documents | 5 | **97 types** |

### Services & Programs Breakdown

| Program | Asset Types |
|---------|-------------|
| Functional Health Services | 2 |
| Lab Testing | 2 |
| BioScan SRT | 3 |
| Weight Management | 2 |
| Women's Hormone Health | 2 |
| Detoxification | 2 |
| Children's Natural Health | 2 |
| Stress Management | 2 |
| Fertility Health | 2 |
| Mold Exposure | 3 |
| CBD 101 | 2 |
| Pet Health | 2 |
| Pain Management | 2 |
| Vagus Nerve Reset | 2 |
| Food Sensitivities | 2 |
| Chronic Disease | 2 |
| Generic Service Assets | 4 |

This comprehensive taxonomy covers virtually any brand asset a wellness/supplement company (or similar business) might need, including all Pine Hill Farm service lines.

---

## Verification Checklist

- [ ] Asset type registry created with all 59 types
- [ ] Asset categories defined with icons and descriptions
- [ ] Upload modal shows category → type selection flow
- [ ] Type-specific requirements displayed during upload
- [ ] Person consent checkbox appears for people assets
- [ ] Product info fields appear for product assets
- [ ] Validation checks format, resolution, transparency
- [ ] Asset matcher uses declared types for scoring
- [ ] Placement rules available per asset type
- [ ] Database schema updated with new columns
- [ ] Existing assets can be bulk-categorized
