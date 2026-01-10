# Phase 15: Implementation Gap Consolidation

## Executive Summary

Testing of the Universal Video Producer revealed critical gaps between the Phase 14 design documents and the current implementation. The system is not using the Asset Type Taxonomy, not triggering Image-to-Video (I2V) for brand assets, and not displaying the Quality Tier selector.

This phase consists of **6 focused sub-phases**, each addressing one specific issue. Complete them in order.

---

## Current State vs. Expected State

### Asset Classification

| Current State | Expected State |
|---------------|----------------|
| Assets labeled as generic `photo` or `logo` | Assets classified with 97-type taxonomy |
| Manual keyword entry (comma-separated) | Automatic keywords from asset type |
| No category grouping | 8 categories (Products, Logos, Trust, Services, etc.) |

### Asset Matching

| Current State | Expected State |
|---------------|----------------|
| Keyword string matching | Taxonomy-based promptKeyword matching |
| "consultation space" matches random farm photo | "consultation space" matches `location-interior-workspace` |
| BioScan text detected but wrong asset shown | BioScan matches `service-bioscan-device` |

### Media Generation

| Current State | Expected State |
|---------------|----------------|
| Always generates new AI images | Uses uploaded brand assets via I2V when matched |
| Brand Asset Workflow shows AI-generated content | Brand Asset Workflow uses REAL uploaded photos |
| No quality tier selection | Ultra/Premium/Standard selector on Generation Preview |

---

## Sub-Phase Overview

| Phase | Focus | Complexity | Dependencies |
|-------|-------|------------|--------------|
| **15A** | Database Schema for Asset Taxonomy | Low | None |
| **15B** | Asset Type Configuration File | Medium | 15A |
| **15C** | Edit Asset Modal UI Update | Medium | 15A, 15B |
| **15D** | Asset Matching Logic Rewrite | High | 15A, 15B, 15C |
| **15E** | I2V Trigger for Brand Assets | High | 15D |
| **15F** | Quality Tier Selector UI | Medium | None (parallel) |
| **15G** | Force Video Generation for Premium/Ultra | High | 15F |

---

## Verification Test Cases

After completing all sub-phases, these scenarios must work:

### Test 1: Interior Location Match
**Visual Direction:** "Welcoming Pine Hill Farm consultation space with warm lighting"
**Expected:**
- Matches `location-interior-workspace` asset type
- Finds "Pine Hill Farm Interior" photo
- Uses I2V to animate the REAL photo
- Does NOT generate random AI image

### Test 2: BioScan Service Match
**Visual Direction:** "BioScan equipment in warm wellness space"
**Expected:**
- Matches `service-bioscan-device` asset type
- Finds "Pine Hill Farm BioScan SRT" photo
- Uses I2V to animate the REAL photo

### Test 3: Product Display Match
**Visual Direction:** "Pine Hill Farm products arranged beautifully"
**Expected:**
- Matches `product-hero-group` asset type
- Finds "Pine Hill Farm Products" photo
- Uses I2V or composites REAL product photo

### Test 4: Logo Overlay
**Visual Direction:** "...with PHF logo visible"
**Expected:**
- Matches `logo-primary-color` or `logo-primary-white`
- Overlays REAL logo (not AI-generated logo)

### Test 5: Quality Tier Selection
**On Generation Preview page:**
- User sees Ultra / Premium / Standard selector
- Cost estimate changes based on selection
- Selected tier is passed to generation pipeline

### Test 6: Premium/Ultra Forces Real Video
**When Premium or Ultra tier selected:**
- ALL scenes use T2V (Text-to-Video) or I2V (Image-to-Video)
- NO scenes use Image + Ken Burns effect
- Console shows `[T2V] Generating...` for each scene
- Generated content has actual AI motion, not slideshow effects

---

## Files to Reference

These Phase 14 documents contain the detailed specifications:

| Document | Contains |
|----------|----------|
| `Phase_14_Addendum_A_Asset_Type_Taxonomy.md` | 97 asset types, categories, promptKeywords |
| `Phase_14_Addendum_B_UI_Migration_AI_Updates.md` | Edit Modal UI, AI system updates |
| `Phase_14_Addendum_C_Premium_Quality_First.md` | Quality tiers, selector UI, cost calculation |
| `Phase_14_Addendum_D_LegNext_Midjourney.md` | Image provider registry |

---

## Current Pine Hill Farm Assets to Migrate

These existing assets need taxonomy assignment:

| Asset Name | Current Type | Target Taxonomy Type |
|------------|--------------|---------------------|
| USDA Organic LOGO | `photo` | `trust-certification-usda` |
| Functional Medicine Logo | `photo` | `trust-partnership-logo` |
| American Holistic Nurses Association Logo | `photo` | `trust-partnership-logo` |
| The Menopause Society Logo | `photo` | `trust-partnership-logo` |
| Salt Therapy Association Logo | `photo` | `trust-partnership-logo` |
| Women Owned Logo | `photo` | `trust-certification-other` |
| Large logo | `logo` | `logo-primary-dark` |
| Pine Hill Farm white light | `logo` | `logo-primary-white` |
| Pine Hill Farm logo | `logo` | `logo-primary-color` |
| Pine Hill Farm Exterior | `photo` | `location-exterior-building` |
| Pine Hill Farm Products | `photo` | `product-hero-group` |
| Founders | `photo` | `people-founder-portrait` |
| Pine Hill Farm Interior | `photo` | `location-interior-workspace` |
| Pine Hill Farm Exterior 1 | `photo` | `location-exterior-sign` |
| Pine Hill Farm 1 | `photo` | `location-farm-grounds` |
| Pine Hill Farm 2 | `photo` | `location-farm-grounds` |
| Pine Hill Farm BioScan SRT | `photo` | `service-bioscan-device` |
| Pine Hill Farm Retail | `photo` | `location-interior-retail` |

---

## Success Criteria

Phase 15 is complete when:

1. ✅ All brand assets have `assetCategory` and `assetType` fields populated
2. ✅ Edit Asset Modal shows Category → Asset Type dropdowns (no keyword fields)
3. ✅ Asset matching uses taxonomy `promptKeywords` not manual keywords
4. ✅ Brand Asset Workflow triggers I2V with real uploaded photos
5. ✅ Quality Tier selector visible on Generation Preview
6. ✅ All 5 test cases pass

---

## Next Steps

Begin with **Phase 15A: Database Schema for Asset Taxonomy**
