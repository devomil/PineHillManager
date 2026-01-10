# Phase 14C: Image-to-Image Composition

## Objective

Build the system that places real product photos into AI-generated environments. This handles scenes where the visual direction calls for products in context (on a desk, in a room, on a shelf) and the output is a **still image** rather than video.

## Why Image-to-Image?

Not every scene needs video. Many use cases include:
- Thumbnail generation
- Social media stills
- Print materials
- Scenes that will later be animated with subtle motion
- Hero shots that need perfect composition before animation

The Image-to-Image pipeline:
1. Generates an AI environment (background/context)
2. Composites real product photos into that environment
3. Applies color matching, shadows, and blending
4. Outputs a broadcast-quality still that can optionally feed into Image-to-Video

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Image-to-Image Pipeline                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │  Environment │    │   Product    │    │  Composite   │       │
│  │  Generation  │───▶│  Preparation │───▶│   Engine     │       │
│  │  (AI Scene)  │    │  (Asset Prep)│    │  (Blend)     │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│         │                   │                   │                │
│         ▼                   ▼                   ▼                │
│    Flux/SDXL          PNG with           Final composed         │
│    background         transparency        image output          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Step 1: Define Composition Types

```typescript
// shared/types/image-composition-types.ts

export interface CompositionRequest {
  // Scene information
  sceneId: string;
  visualDirection: string;
  
  // Environment generation
  environment: {
    prompt: string;           // AI prompt for background
    style: 'photorealistic' | 'lifestyle' | 'studio' | 'natural';
    lighting: 'warm' | 'cool' | 'natural' | 'dramatic' | 'soft';
    colorPalette?: string[];  // Brand colors to incorporate
  };
  
  // Product placement
  products: ProductPlacement[];
  
  // Logo overlay (optional)
  logoOverlay?: {
    assetId: string;
    position: LogoPosition;
    size: 'small' | 'medium' | 'large';
    opacity: number;
  };
  
  // Output settings
  output: {
    width: number;
    height: number;
    format: 'png' | 'jpg' | 'webp';
    quality: number;
  };
}

export interface ProductPlacement {
  assetId: string;
  assetUrl: string;
  
  // Placement
  position: {
    x: number;      // 0-100 percentage from left
    y: number;      // 0-100 percentage from top
    anchor: 'center' | 'bottom-center' | 'top-center';
  };
  
  // Sizing
  scale: number;    // 0.1 to 2.0 relative to natural size
  maxWidth?: number;  // Percentage of frame width
  maxHeight?: number; // Percentage of frame height
  
  // Transformation
  rotation?: number;  // Degrees
  flip?: 'horizontal' | 'vertical' | 'none';
  
  // Blending
  shadow: {
    enabled: boolean;
    angle: number;
    blur: number;
    opacity: number;
  };
  
  // Layer order
  zIndex: number;
}

export type LogoPosition = 
  | 'top-left' | 'top-center' | 'top-right'
  | 'center-left' | 'center' | 'center-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

export interface CompositionResult {
  success: boolean;
  imageUrl: string;
  width: number;
  height: number;
  
  // For feeding into Image-to-Video
  compositionData: {
    productRegions: Array<{
      productId: string;
      bounds: { x: number; y: number; width: number; height: number };
    }>;
    environmentPrompt: string;
  };
  
  error?: string;
}
```

---

## Step 2: Environment Generation Service

```typescript
// server/services/environment-generation-service.ts

import { CompositionRequest } from '../../shared/types/image-composition-types';

class EnvironmentGenerationService {
  
  /**
   * Generate AI background environment for product placement
   */
  async generateEnvironment(request: CompositionRequest): Promise<string> {
    console.log(`[EnvironmentGen] Generating environment for scene ${request.sceneId}`);
    
    // Build optimized prompt for product placement background
    const prompt = this.buildEnvironmentPrompt(request);
    
    // Select best provider for environment generation
    const provider = this.selectProvider(request.environment.style);
    
    // Generate the environment image
    const environmentUrl = await this.generate(provider, prompt, request.output);
    
    console.log(`[EnvironmentGen] Environment generated: ${environmentUrl}`);
    
    return environmentUrl;
  }
  
  /**
   * Build prompt optimized for product placement
   */
  private buildEnvironmentPrompt(request: CompositionRequest): string {
    const { environment, products } = request;
    
    // Start with base visual direction
    let prompt = environment.prompt;
    
    // Add instructions for product placement areas
    if (products.length > 0) {
      // Determine where products will be placed
      const placementAreas = products.map(p => {
        if (p.position.y > 70) return 'foreground surface';
        if (p.position.y > 40) return 'middle ground';
        return 'background area';
      });
      
      const uniqueAreas = [...new Set(placementAreas)];
      prompt += `, with clear ${uniqueAreas.join(' and ')} for product placement`;
    }
    
    // Add lighting instructions
    const lightingMap = {
      warm: 'warm golden lighting, soft shadows',
      cool: 'cool natural lighting, soft diffused light',
      natural: 'natural daylight, balanced exposure',
      dramatic: 'dramatic lighting with depth',
      soft: 'soft diffused lighting, minimal shadows',
    };
    prompt += `, ${lightingMap[environment.lighting]}`;
    
    // Add style modifiers
    const styleMap = {
      photorealistic: 'photorealistic, 8k, professional photography',
      lifestyle: 'lifestyle photography, editorial style, magazine quality',
      studio: 'studio photography, clean background, professional product photography',
      natural: 'natural setting, organic feel, authentic environment',
    };
    prompt += `, ${styleMap[environment.style]}`;
    
    // Add brand color hints if provided
    if (environment.colorPalette && environment.colorPalette.length > 0) {
      prompt += `, earth tone color palette with greens and warm browns`;
    }
    
    // Critical: Ensure space for products
    prompt += `, empty space in composition for product placement, no text or logos`;
    
    return prompt;
  }
  
  /**
   * Select best provider for environment generation
   */
  private selectProvider(style: string): 'flux' | 'sdxl' | 'dalle' {
    // Flux.1 is best for photorealistic environments
    if (style === 'photorealistic' || style === 'studio') {
      return 'flux';
    }
    
    // SDXL good for lifestyle and natural
    return 'flux'; // Default to Flux for quality
  }
  
  /**
   * Generate image using selected provider
   */
  private async generate(
    provider: string,
    prompt: string,
    output: CompositionRequest['output']
  ): Promise<string> {
    // This would call the actual AI provider
    // Using existing infrastructure from universal-video-service
    
    console.log(`[EnvironmentGen] Using ${provider} with prompt: ${prompt.substring(0, 100)}...`);
    
    // TODO: Integrate with existing Flux.1 provider
    // const result = await fluxProvider.generateImage({
    //   prompt,
    //   width: output.width,
    //   height: output.height,
    // });
    // return result.imageUrl;
    
    // Placeholder - actual implementation uses existing providers
    return 'generated-environment-url';
  }
}

export const environmentGenerationService = new EnvironmentGenerationService();
```

---

## Step 3: Image Composition Service

```typescript
// server/services/image-composition-service.ts

import sharp from 'sharp';
import {
  CompositionRequest,
  CompositionResult,
  ProductPlacement,
} from '../../shared/types/image-composition-types';
import { environmentGenerationService } from './environment-generation-service';
import { brandAssetMatcher } from './brand-asset-matcher';
import { storageService } from './storage-service';

class ImageCompositionService {
  
  /**
   * Main composition pipeline
   */
  async compose(request: CompositionRequest): Promise<CompositionResult> {
    console.log(`[ImageComposition] Starting composition for scene ${request.sceneId}`);
    
    try {
      // Step 1: Generate or retrieve environment
      const environmentUrl = await environmentGenerationService.generateEnvironment(request);
      
      // Step 2: Download environment image
      const environmentBuffer = await this.downloadImage(environmentUrl);
      
      // Step 3: Prepare product images
      const productLayers = await this.prepareProductLayers(request.products, request.output);
      
      // Step 4: Compose all layers
      const composedBuffer = await this.composeLayers(
        environmentBuffer,
        productLayers,
        request.output
      );
      
      // Step 5: Add logo overlay if requested
      let finalBuffer = composedBuffer;
      if (request.logoOverlay) {
        finalBuffer = await this.addLogoOverlay(composedBuffer, request.logoOverlay, request.output);
      }
      
      // Step 6: Upload final image
      const outputUrl = await this.uploadResult(finalBuffer, request.sceneId, request.output.format);
      
      // Build result with composition data for potential video animation
      const result: CompositionResult = {
        success: true,
        imageUrl: outputUrl,
        width: request.output.width,
        height: request.output.height,
        compositionData: {
          productRegions: productLayers.map(layer => ({
            productId: layer.assetId,
            bounds: layer.finalBounds,
          })),
          environmentPrompt: request.environment.prompt,
        },
      };
      
      console.log(`[ImageComposition] Composition complete: ${outputUrl}`);
      return result;
      
    } catch (error) {
      console.error(`[ImageComposition] Failed:`, error);
      return {
        success: false,
        imageUrl: '',
        width: 0,
        height: 0,
        compositionData: { productRegions: [], environmentPrompt: '' },
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  /**
   * Download image to buffer
   */
  private async downloadImage(url: string): Promise<Buffer> {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
  
  /**
   * Prepare product images for composition
   */
  private async prepareProductLayers(
    products: ProductPlacement[],
    output: CompositionRequest['output']
  ): Promise<Array<ProductPlacement & { buffer: Buffer; finalBounds: any }>> {
    
    const layers = [];
    
    for (const product of products) {
      // Download product image
      const productBuffer = await this.downloadImage(product.assetUrl);
      
      // Get product image metadata
      const metadata = await sharp(productBuffer).metadata();
      const originalWidth = metadata.width || 500;
      const originalHeight = metadata.height || 500;
      
      // Calculate final size based on scale and constraints
      let finalWidth = originalWidth * product.scale;
      let finalHeight = originalHeight * product.scale;
      
      // Apply max constraints
      if (product.maxWidth) {
        const maxPx = output.width * (product.maxWidth / 100);
        if (finalWidth > maxPx) {
          const ratio = maxPx / finalWidth;
          finalWidth = maxPx;
          finalHeight *= ratio;
        }
      }
      
      if (product.maxHeight) {
        const maxPx = output.height * (product.maxHeight / 100);
        if (finalHeight > maxPx) {
          const ratio = maxPx / finalHeight;
          finalHeight = maxPx;
          finalWidth *= ratio;
        }
      }
      
      // Resize product image
      let processedBuffer = await sharp(productBuffer)
        .resize(Math.round(finalWidth), Math.round(finalHeight), {
          fit: 'inside',
          withoutEnlargement: false,
        })
        .png() // Ensure PNG for transparency
        .toBuffer();
      
      // Apply rotation if specified
      if (product.rotation && product.rotation !== 0) {
        processedBuffer = await sharp(processedBuffer)
          .rotate(product.rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .toBuffer();
      }
      
      // Apply flip if specified
      if (product.flip === 'horizontal') {
        processedBuffer = await sharp(processedBuffer).flop().toBuffer();
      } else if (product.flip === 'vertical') {
        processedBuffer = await sharp(processedBuffer).flip().toBuffer();
      }
      
      // Add shadow if enabled
      if (product.shadow.enabled) {
        processedBuffer = await this.addShadow(processedBuffer, product.shadow);
      }
      
      // Calculate final position in pixels
      const finalMetadata = await sharp(processedBuffer).metadata();
      const posX = Math.round((output.width * product.position.x / 100) - (finalMetadata.width || 0) / 2);
      const posY = this.calculateYPosition(
        product.position.y,
        product.position.anchor,
        finalMetadata.height || 0,
        output.height
      );
      
      layers.push({
        ...product,
        buffer: processedBuffer,
        finalBounds: {
          x: posX,
          y: posY,
          width: finalMetadata.width || 0,
          height: finalMetadata.height || 0,
        },
      });
    }
    
    // Sort by zIndex for proper layering
    return layers.sort((a, b) => a.zIndex - b.zIndex);
  }
  
  /**
   * Calculate Y position based on anchor
   */
  private calculateYPosition(
    yPercent: number,
    anchor: string,
    itemHeight: number,
    canvasHeight: number
  ): number {
    const baseY = canvasHeight * yPercent / 100;
    
    switch (anchor) {
      case 'top-center':
        return Math.round(baseY);
      case 'bottom-center':
        return Math.round(baseY - itemHeight);
      case 'center':
      default:
        return Math.round(baseY - itemHeight / 2);
    }
  }
  
  /**
   * Add drop shadow to product image
   */
  private async addShadow(
    imageBuffer: Buffer,
    shadow: ProductPlacement['shadow']
  ): Promise<Buffer> {
    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 500;
    const height = metadata.height || 500;
    
    // Create shadow layer
    const shadowOffset = 10;
    const shadowBlur = shadow.blur;
    
    // Create a larger canvas to accommodate shadow
    const canvasWidth = width + shadowBlur * 2 + shadowOffset;
    const canvasHeight = height + shadowBlur * 2 + shadowOffset;
    
    // For now, use simple composite approach
    // A more sophisticated implementation would use canvas or specialized shadow generation
    
    // Create shadow version (black, blurred, offset)
    const shadowBuffer = await sharp(imageBuffer)
      .greyscale()
      .modulate({ brightness: 0 }) // Make black
      .blur(shadowBlur)
      .ensureAlpha(shadow.opacity)
      .toBuffer();
    
    // Composite shadow behind original
    return sharp({
      create: {
        width: canvasWidth,
        height: canvasHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        {
          input: shadowBuffer,
          top: shadowBlur + shadowOffset,
          left: shadowBlur + shadowOffset,
        },
        {
          input: imageBuffer,
          top: shadowBlur,
          left: shadowBlur,
        },
      ])
      .png()
      .toBuffer();
  }
  
  /**
   * Compose all layers onto environment
   */
  private async composeLayers(
    environmentBuffer: Buffer,
    productLayers: Array<ProductPlacement & { buffer: Buffer; finalBounds: any }>,
    output: CompositionRequest['output']
  ): Promise<Buffer> {
    
    // Start with environment, resize to output dimensions
    let composition = sharp(environmentBuffer).resize(output.width, output.height, {
      fit: 'cover',
    });
    
    // Build composite operations
    const compositeOps = productLayers.map(layer => ({
      input: layer.buffer,
      top: Math.max(0, layer.finalBounds.y),
      left: Math.max(0, layer.finalBounds.x),
    }));
    
    // Apply all product layers
    if (compositeOps.length > 0) {
      composition = composition.composite(compositeOps);
    }
    
    return composition.png().toBuffer();
  }
  
  /**
   * Add logo overlay to composed image
   */
  private async addLogoOverlay(
    imageBuffer: Buffer,
    logoConfig: NonNullable<CompositionRequest['logoOverlay']>,
    output: CompositionRequest['output']
  ): Promise<Buffer> {
    
    // Get logo asset
    const logoAsset = await brandAssetMatcher.getBestAsset('logo-overlay');
    if (!logoAsset || !logoAsset.url) {
      console.warn('[ImageComposition] No logo asset found for overlay');
      return imageBuffer;
    }
    
    // Download logo
    const logoBuffer = await this.downloadImage(logoAsset.url);
    
    // Calculate logo size
    const sizeMap = {
      small: 0.08,   // 8% of width
      medium: 0.12,  // 12% of width
      large: 0.18,   // 18% of width
    };
    const logoWidth = Math.round(output.width * sizeMap[logoConfig.size]);
    
    // Resize logo
    const resizedLogo = await sharp(logoBuffer)
      .resize(logoWidth, null, { fit: 'inside' })
      .ensureAlpha(logoConfig.opacity)
      .toBuffer();
    
    const logoMetadata = await sharp(resizedLogo).metadata();
    
    // Calculate position
    const margin = 30; // Pixels from edge
    const pos = this.calculateLogoPosition(
      logoConfig.position,
      output.width,
      output.height,
      logoMetadata.width || logoWidth,
      logoMetadata.height || logoWidth,
      margin
    );
    
    // Composite logo
    return sharp(imageBuffer)
      .composite([{
        input: resizedLogo,
        top: pos.y,
        left: pos.x,
      }])
      .png()
      .toBuffer();
  }
  
  /**
   * Calculate logo position based on named position
   */
  private calculateLogoPosition(
    position: string,
    canvasWidth: number,
    canvasHeight: number,
    logoWidth: number,
    logoHeight: number,
    margin: number
  ): { x: number; y: number } {
    const positions: Record<string, { x: number; y: number }> = {
      'top-left': { x: margin, y: margin },
      'top-center': { x: (canvasWidth - logoWidth) / 2, y: margin },
      'top-right': { x: canvasWidth - logoWidth - margin, y: margin },
      'center-left': { x: margin, y: (canvasHeight - logoHeight) / 2 },
      'center': { x: (canvasWidth - logoWidth) / 2, y: (canvasHeight - logoHeight) / 2 },
      'center-right': { x: canvasWidth - logoWidth - margin, y: (canvasHeight - logoHeight) / 2 },
      'bottom-left': { x: margin, y: canvasHeight - logoHeight - margin },
      'bottom-center': { x: (canvasWidth - logoWidth) / 2, y: canvasHeight - logoHeight - margin },
      'bottom-right': { x: canvasWidth - logoWidth - margin, y: canvasHeight - logoHeight - margin },
    };
    
    return positions[position] || positions['bottom-right'];
  }
  
  /**
   * Upload composed image to storage
   */
  private async uploadResult(
    buffer: Buffer,
    sceneId: string,
    format: string
  ): Promise<string> {
    const filename = `composed-${sceneId}-${Date.now()}.${format}`;
    
    // TODO: Use actual storage service
    // return storageService.uploadBuffer(buffer, filename, `image/${format}`);
    
    // Placeholder
    return `https://storage.example.com/${filename}`;
  }
}

export const imageCompositionService = new ImageCompositionService();
```

---

## Step 4: Composition Request Builder

```typescript
// server/services/composition-request-builder.ts

import {
  CompositionRequest,
  ProductPlacement,
} from '../../shared/types/image-composition-types';
import { BrandRequirementAnalysis } from '../../shared/types/brand-asset-types';
import { brandAssetMatcher } from './brand-asset-matcher';

class CompositionRequestBuilder {
  
  /**
   * Build composition request from scene and analysis
   */
  async build(
    sceneId: string,
    visualDirection: string,
    analysis: BrandRequirementAnalysis,
    outputType: 'image' | 'video'
  ): Promise<CompositionRequest> {
    
    // Build environment configuration
    const environment = this.buildEnvironmentConfig(visualDirection, analysis);
    
    // Build product placements
    const products = await this.buildProductPlacements(analysis);
    
    // Build logo overlay if needed
    const logoOverlay = await this.buildLogoOverlay(analysis);
    
    return {
      sceneId,
      visualDirection,
      environment,
      products,
      logoOverlay,
      output: {
        width: 1920,
        height: 1080,
        format: 'png',
        quality: 95,
      },
    };
  }
  
  /**
   * Build environment configuration from visual direction
   */
  private buildEnvironmentConfig(
    visualDirection: string,
    analysis: BrandRequirementAnalysis
  ): CompositionRequest['environment'] {
    
    const lower = visualDirection.toLowerCase();
    
    // Determine style
    let style: 'photorealistic' | 'lifestyle' | 'studio' | 'natural' = 'photorealistic';
    if (lower.includes('lifestyle') || lower.includes('editorial')) {
      style = 'lifestyle';
    } else if (lower.includes('studio') || lower.includes('clean background')) {
      style = 'studio';
    } else if (lower.includes('natural') || lower.includes('organic')) {
      style = 'natural';
    }
    
    // Determine lighting
    let lighting: 'warm' | 'cool' | 'natural' | 'dramatic' | 'soft' = 'warm';
    if (lower.includes('cool light') || lower.includes('blue')) {
      lighting = 'cool';
    } else if (lower.includes('dramatic')) {
      lighting = 'dramatic';
    } else if (lower.includes('soft') || lower.includes('diffused')) {
      lighting = 'soft';
    } else if (lower.includes('natural light')) {
      lighting = 'natural';
    }
    
    // Build clean prompt for environment (without product mentions)
    const prompt = this.cleanPromptForEnvironment(visualDirection);
    
    return {
      prompt,
      style,
      lighting,
      colorPalette: ['#2D5A27', '#D4A574', '#8B4513'], // PHF brand colors
    };
  }
  
  /**
   * Remove product-specific terms from prompt for environment generation
   */
  private cleanPromptForEnvironment(visualDirection: string): string {
    // Remove product names and branding terms
    let cleaned = visualDirection
      .replace(/pine hill farm/gi, '')
      .replace(/phf/gi, '')
      .replace(/product[s]?/gi, '')
      .replace(/bottle[s]?/gi, '')
      .replace(/packaging/gi, '')
      .replace(/branding/gi, '')
      .replace(/logo/gi, '')
      .replace(/black cohosh/gi, '')
      .replace(/deep sleep/gi, '')
      .replace(/wonder lotion/gi, '')
      .replace(/supplement[s]?/gi, '')
      .trim();
    
    // Ensure we have a meaningful prompt
    if (cleaned.length < 20) {
      cleaned = 'Clean, organized workspace with natural wood surfaces, warm lighting, plants in background, earth tone color palette';
    }
    
    return cleaned;
  }
  
  /**
   * Build product placement configurations
   */
  private async buildProductPlacements(
    analysis: BrandRequirementAnalysis
  ): Promise<ProductPlacement[]> {
    
    const placements: ProductPlacement[] = [];
    const matchedProducts = analysis.matchedAssets.products;
    
    if (matchedProducts.length === 0) {
      return placements;
    }
    
    // Determine layout based on number of products
    if (matchedProducts.length === 1) {
      // Single product - center featured
      const asset = matchedProducts[0];
      placements.push({
        assetId: asset.id?.toString() || '0',
        assetUrl: asset.url || '',
        position: { x: 50, y: 70, anchor: 'bottom-center' },
        scale: 1.0,
        maxWidth: 40,
        maxHeight: 60,
        shadow: { enabled: true, angle: 135, blur: 15, opacity: 0.3 },
        zIndex: 1,
      });
    } else if (matchedProducts.length === 2) {
      // Two products - side by side
      matchedProducts.slice(0, 2).forEach((asset, i) => {
        placements.push({
          assetId: asset.id?.toString() || i.toString(),
          assetUrl: asset.url || '',
          position: { x: 35 + i * 30, y: 70, anchor: 'bottom-center' },
          scale: 0.85,
          maxWidth: 30,
          maxHeight: 50,
          shadow: { enabled: true, angle: 135, blur: 12, opacity: 0.25 },
          zIndex: i + 1,
        });
      });
    } else {
      // Multiple products - arrangement
      const positions = [
        { x: 30, y: 75, scale: 0.7 },
        { x: 50, y: 65, scale: 0.9 }, // Center product larger/forward
        { x: 70, y: 75, scale: 0.7 },
        { x: 40, y: 80, scale: 0.6 },
        { x: 60, y: 80, scale: 0.6 },
      ];
      
      matchedProducts.slice(0, 5).forEach((asset, i) => {
        const pos = positions[i];
        placements.push({
          assetId: asset.id?.toString() || i.toString(),
          assetUrl: asset.url || '',
          position: { x: pos.x, y: pos.y, anchor: 'bottom-center' },
          scale: pos.scale,
          maxWidth: 25,
          maxHeight: 45,
          shadow: { enabled: true, angle: 135, blur: 10, opacity: 0.2 },
          zIndex: i + 1,
        });
      });
    }
    
    return placements;
  }
  
  /**
   * Build logo overlay configuration if needed
   */
  private async buildLogoOverlay(
    analysis: BrandRequirementAnalysis
  ): Promise<CompositionRequest['logoOverlay'] | undefined> {
    
    if (!analysis.requirements.logoRequired) {
      return undefined;
    }
    
    const logoAsset = analysis.matchedAssets.logos[0];
    if (!logoAsset) {
      return undefined;
    }
    
    // Determine position based on visibility requirement
    let position: CompositionRequest['logoOverlay']['position'] = 'bottom-right';
    let size: 'small' | 'medium' | 'large' = 'medium';
    let opacity = 0.9;
    
    if (analysis.requirements.brandingVisibility === 'prominent') {
      position = 'top-left';
      size = 'large';
      opacity = 1.0;
    } else if (analysis.requirements.brandingVisibility === 'subtle') {
      position = 'bottom-right';
      size = 'small';
      opacity = 0.7;
    }
    
    return {
      assetId: logoAsset.id?.toString() || '0',
      position,
      size,
      opacity,
    };
  }
}

export const compositionRequestBuilder = new CompositionRequestBuilder();
```

---

## Step 5: Integration with Workflow

```typescript
// Update to brand-workflow-orchestrator.ts

import { imageCompositionService } from './image-composition-service';
import { compositionRequestBuilder } from './composition-request-builder';

// When scene type is 'product-in-context' and output is 'image':
async function handleProductImageScene(
  sceneId: string,
  visualDirection: string,
  analysis: BrandRequirementAnalysis
): Promise<{ imageUrl: string; compositionData: any }> {
  
  // Build composition request
  const request = await compositionRequestBuilder.build(
    sceneId,
    visualDirection,
    analysis,
    'image'
  );
  
  // Execute composition
  const result = await imageCompositionService.compose(request);
  
  if (!result.success) {
    throw new Error(`Composition failed: ${result.error}`);
  }
  
  return {
    imageUrl: result.imageUrl,
    compositionData: result.compositionData,
  };
}
```

---

## Verification Checklist

Phase 14C is complete when:

- [ ] Environment generation creates clean backgrounds for product placement
- [ ] Product images are properly resized and positioned
- [ ] Shadows are applied realistically
- [ ] Multiple products arrange correctly
- [ ] Logo overlay positions accurately
- [ ] Output images are high quality (1920x1080+)
- [ ] Composition data is preserved for video pipeline
- [ ] Integration with asset matcher works

---

## Testing

Test with sample request:

```typescript
const testRequest: CompositionRequest = {
  sceneId: 'test-001',
  visualDirection: 'Warm home office with natural wood desk, products arranged aesthetically',
  environment: {
    prompt: 'Warm home office with natural wood desk, plants, warm lighting',
    style: 'lifestyle',
    lighting: 'warm',
    colorPalette: ['#2D5A27', '#D4A574'],
  },
  products: [
    {
      assetId: 'product-1',
      assetUrl: 'https://example.com/deep-sleep.png',
      position: { x: 40, y: 70, anchor: 'bottom-center' },
      scale: 1.0,
      maxWidth: 30,
      shadow: { enabled: true, angle: 135, blur: 15, opacity: 0.3 },
      zIndex: 1,
    },
    {
      assetId: 'product-2',
      assetUrl: 'https://example.com/b-complex.png',
      position: { x: 60, y: 70, anchor: 'bottom-center' },
      scale: 0.9,
      maxWidth: 25,
      shadow: { enabled: true, angle: 135, blur: 12, opacity: 0.25 },
      zIndex: 2,
    },
  ],
  output: {
    width: 1920,
    height: 1080,
    format: 'png',
    quality: 95,
  },
};

const result = await imageCompositionService.compose(testRequest);
console.log('Composed image:', result.imageUrl);
```

---

## Next Phase

Proceed to **Phase 14D: Image-to-Video Pipeline** to animate composed images with environmental motion and subtle camera movement.
