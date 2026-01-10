# Phase 15A: Database Schema for Asset Taxonomy

## Objective

Add two new columns to the `brand_assets` table to support the 97-type asset taxonomy system. This is a prerequisite for all other Phase 15 work.

---

## Current Schema

The `brand_assets` table currently has these relevant fields:

```sql
-- Current fields (approximate)
id              UUID PRIMARY KEY
project_id      UUID REFERENCES projects(id)
name            TEXT                          -- "Pine Hill Farm Interior"
description     TEXT                          -- Optional user notes
file_url        TEXT                          -- URL to uploaded file
thumbnail_url   TEXT                          -- URL to thumbnail
media_type      TEXT                          -- "photo" | "logo" | "video"
entity_type     TEXT                          -- "Brand" | "Product" | "Person" | "Location"
entity_name     TEXT                          -- "Pine Hill Farm"
match_keywords  TEXT                          -- "consultation, interior, workspace"
usage_contexts  TEXT                          -- "intro, outro, overlay"
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

---

## Schema Changes Required

### Add Two New Columns

```sql
-- Migration: add_asset_taxonomy_columns.sql

ALTER TABLE brand_assets 
ADD COLUMN IF NOT EXISTS asset_category TEXT;

ALTER TABLE brand_assets 
ADD COLUMN IF NOT EXISTS asset_type TEXT;

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_brand_assets_category 
ON brand_assets(asset_category);

CREATE INDEX IF NOT EXISTS idx_brand_assets_type 
ON brand_assets(asset_type);

CREATE INDEX IF NOT EXISTS idx_brand_assets_category_type 
ON brand_assets(asset_category, asset_type);

-- Add index for project + category queries
CREATE INDEX IF NOT EXISTS idx_brand_assets_project_category 
ON brand_assets(project_id, asset_category);
```

---

## Column Definitions

### `asset_category`

**Type:** TEXT (nullable initially, required after migration)

**Valid Values:**
- `products`
- `location`
- `people`
- `logos`
- `trust`
- `services`
- `creative`
- `documents`

**Purpose:** High-level grouping for filtering and UI organization.

---

### `asset_type`

**Type:** TEXT (nullable initially, required after migration)

**Valid Values:** One of 97 predefined type IDs (see examples below)

**Purpose:** Specific classification that determines:
- Which `promptKeywords` to use for matching
- Which `placementRules` to apply during rendering
- Which conditional fields to show in the edit modal

**Example Values:**
```
products:
  - product-hero-single
  - product-hero-group
  - product-lifestyle
  - product-packaging-front

location:
  - location-exterior-sign
  - location-exterior-building
  - location-interior-workspace
  - location-interior-retail
  - location-farm-grounds

people:
  - people-founder-portrait
  - people-employee-headshot
  - people-customer-portrait

logos:
  - logo-primary-color
  - logo-primary-white
  - logo-primary-dark
  - logo-watermark

trust:
  - trust-certification-usda
  - trust-certification-nongmo
  - trust-certification-gmp
  - trust-certification-other
  - trust-partnership-logo

services:
  - service-bioscan-device
  - service-bioscan-session
  - service-lab-testing-hero
  - service-functional-health-hero
```

---

## Drizzle Schema Update

If using Drizzle ORM, update the schema file:

```typescript
// server/db/schema.ts

export const brandAssets = pgTable('brand_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  
  // Basic info
  name: text('name').notNull(),
  description: text('description'),
  fileUrl: text('file_url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  
  // NEW: Asset Taxonomy
  assetCategory: text('asset_category'),  // 'products' | 'location' | 'people' | etc.
  assetType: text('asset_type'),          // 'product-hero-single' | 'location-interior-workspace' | etc.
  
  // Legacy fields (keep for backward compatibility, will be deprecated)
  mediaType: text('media_type'),          // 'photo' | 'logo' | 'video'
  entityType: text('entity_type'),        // 'Brand' | 'Product' | 'Person' | 'Location'
  entityName: text('entity_name'),
  matchKeywords: text('match_keywords'),  // TO BE DEPRECATED
  usageContexts: text('usage_contexts'),  // TO BE DEPRECATED
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

---

## TypeScript Type Update

```typescript
// shared/types/brand-assets.ts

export interface BrandAsset {
  id: string;
  projectId: string;
  
  // Basic info
  name: string;
  description?: string;
  fileUrl: string;
  thumbnailUrl?: string;
  
  // NEW: Asset Taxonomy
  assetCategory?: AssetCategory;
  assetType?: string;  // One of 97 predefined types
  
  // Legacy fields (deprecated but still present)
  mediaType?: 'photo' | 'logo' | 'video';
  entityType?: 'Brand' | 'Product' | 'Person' | 'Location';
  entityName?: string;
  matchKeywords?: string;
  usageContexts?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
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
```

---

## Migration Script

Create a script to run the migration:

```typescript
// scripts/migrate-add-taxonomy-columns.ts

import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function migrate() {
  console.log('Adding asset taxonomy columns...');
  
  // Add columns
  await db.execute(sql`
    ALTER TABLE brand_assets 
    ADD COLUMN IF NOT EXISTS asset_category TEXT;
  `);
  
  await db.execute(sql`
    ALTER TABLE brand_assets 
    ADD COLUMN IF NOT EXISTS asset_type TEXT;
  `);
  
  // Add indexes
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_brand_assets_category 
    ON brand_assets(asset_category);
  `);
  
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_brand_assets_type 
    ON brand_assets(asset_type);
  `);
  
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_brand_assets_project_category 
    ON brand_assets(project_id, asset_category);
  `);
  
  console.log('Migration complete!');
}

migrate().catch(console.error);
```

---

## Verification

After running the migration, verify with:

```sql
-- Check columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'brand_assets' 
AND column_name IN ('asset_category', 'asset_type');

-- Should return 2 rows

-- Check indexes exist
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'brand_assets' 
AND indexname LIKE '%category%' OR indexname LIKE '%type%';

-- Should return 3 rows
```

---

## DO NOT Do Yet

- ❌ Do not remove legacy columns (`matchKeywords`, `usageContexts`, `entityType`)
- ❌ Do not populate the new columns yet (that's Phase 15C/15D)
- ❌ Do not modify any UI yet (that's Phase 15C)

---

## Success Criteria

Phase 15A is complete when:

1. ✅ `asset_category` column exists on `brand_assets` table
2. ✅ `asset_type` column exists on `brand_assets` table
3. ✅ Indexes created for both columns
4. ✅ Drizzle schema updated with new fields
5. ✅ TypeScript types updated
6. ✅ Application still works (no breaking changes)

---

## Next Step

Proceed to **Phase 15B: Asset Type Configuration File**
