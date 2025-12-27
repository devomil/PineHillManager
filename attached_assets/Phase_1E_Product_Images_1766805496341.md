# Phase 1E: Product Image Generation with Flux.1

## Objective
Generate professional product photography and lifestyle images using Flux.1 via PiAPI. This provides perfect product shots for overlays, hero images, and scenes where uploaded product photos aren't ideal.

## Prerequisites
- Phase 1A-1D complete (video, sound, music working)
- PIAPI_API_KEY configured
- Product information available (names, descriptions)

## What Success Looks Like
- Professional product shots generated on demand
- Lifestyle images showing products in context
- Consistent brand aesthetic across generated images
- Images optimized for video overlay use

---

## Why AI Product Images Matter

**Uploaded product photos often have issues:**
- Inconsistent lighting
- Wrong background for video
- Low resolution
- Awkward angles
- Busy backgrounds that clash with text

**AI-generated product images provide:**
- Perfect studio lighting
- Clean backgrounds (or contextual scenes)
- Consistent style across all products
- Optimized for text overlay (clear space)
- Multiple angles on demand

---

## Step 1: Create Product Image Service

Create `server/services/product-image-service.ts`:

```typescript
// server/services/product-image-service.ts

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export interface ProductImageOptions {
  productName: string;
  productDescription?: string;
  imageType: 'product-shot' | 'lifestyle' | 'hero' | 'overlay';
  style?: 'studio' | 'natural' | 'dramatic' | 'minimal';
  background?: 'white' | 'gradient' | 'natural' | 'transparent' | 'custom';
  customBackground?: string;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3';
  lighting?: 'soft' | 'dramatic' | 'natural' | 'studio';
}

export interface GeneratedProductImage {
  url: string;
  s3Url: string;
  type: string;
  style: string;
  cost: number;
}

// Pre-defined prompts for wellness products
const PRODUCT_PROMPT_TEMPLATES = {
  'product-shot': {
    studio: '{product}, professional product photography, studio lighting, clean white background, high-end commercial quality, sharp focus, 8k resolution',
    natural: '{product}, professional product photography, soft natural lighting, light wood surface, minimal props, wellness aesthetic, commercial quality',
    dramatic: '{product}, dramatic product photography, dark moody background, spotlight lighting, luxury feel, high contrast, commercial quality',
    minimal: '{product}, minimalist product photography, pure white background, soft shadows, clean aesthetic, e-commerce style, high resolution',
  },
  'lifestyle': {
    studio: '{product}, lifestyle photography, wellness spa setting, soft morning light, healthy lifestyle context, aspirational, commercial quality',
    natural: '{product}, lifestyle photography, natural home setting, window light, cozy wellness atmosphere, authentic feel, editorial style',
    dramatic: '{product}, lifestyle photography, dramatic natural lighting, golden hour, inspirational setting, magazine quality',
    minimal: '{product}, lifestyle flat lay, clean marble surface, minimal wellness props, instagram aesthetic, bright and airy',
  },
  'hero': {
    studio: '{product}, hero shot, dramatic studio lighting, floating effect, gradient background, premium brand feel, advertising quality',
    natural: '{product}, hero shot, nature backdrop, soft focus background, product in focus, wellness brand aesthetic, cinematic quality',
    dramatic: '{product}, hero shot, epic dramatic lighting, moody atmosphere, luxury product feel, high-end advertising',
    minimal: '{product}, hero shot, clean gradient background, centered composition, space for text overlay, modern brand aesthetic',
  },
  'overlay': {
    studio: '{product}, product cutout, transparent background style, clean edges, no shadow, suitable for compositing, high resolution PNG style',
    natural: '{product}, product with soft shadow, clean simple background, ready for video overlay, clear edges, professional quality',
    dramatic: '{product}, product with dramatic shadow, dark gradient fade at bottom, suitable for lower third overlay, premium look',
    minimal: '{product}, product floating, subtle shadow, maximum negative space, designed for text overlay, clean composition',
  },
};

// Negative prompts to avoid common issues
const NEGATIVE_PROMPTS = {
  general: 'blurry, low quality, distorted, ugly, watermark, text, logo, people, hands, fingers',
  product: 'damaged product, dirty, dusty, fingerprints, reflections of photographer, messy background',
  wellness: 'unhealthy, junk food, artificial, clinical, cold, sterile',
};

class ProductImageService {
  private s3Client: S3Client;
  private bucket = process.env.REMOTION_AWS_BUCKET || 'remotionlambda-useast1-refjo5giq5';
  private apiKey = process.env.PIAPI_API_KEY || '';
  private baseUrl = 'https://api.piapi.ai/api/v1';

  constructor() {
    this.s3Client = new S3Client({
      region: 'us-east-1',
      credentials: {
        accessKeyId: process.env.REMOTION_AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.REMOTION_AWS_SECRET_ACCESS_KEY!,
      },
    });
  }

  isAvailable(): boolean {
    return this.apiKey.length > 0;
  }

  /**
   * Generate a product image
   */
  async generateProductImage(options: ProductImageOptions): Promise<GeneratedProductImage | null> {
    if (!this.isAvailable()) {
      console.warn('[ProductImage] PiAPI not configured');
      return null;
    }

    const startTime = Date.now();
    
    // Build prompt
    const prompt = this.buildPrompt(options);
    const negativePrompt = this.buildNegativePrompt(options);
    
    console.log(`[ProductImage] Generating ${options.imageType} for "${options.productName}"...`);
    console.log(`[ProductImage] Prompt: "${prompt.substring(0, 100)}..."`);

    try {
      // Create generation task
      const taskResponse = await this.createImageTask(prompt, negativePrompt, options);
      
      if (!taskResponse.success || !taskResponse.taskId) {
        console.error('[ProductImage] Failed to create task:', taskResponse.error);
        return null;
      }

      console.log(`[ProductImage] Task created: ${taskResponse.taskId}`);

      // Poll for completion
      const result = await this.pollForCompletion(taskResponse.taskId);
      
      if (!result.success || !result.imageUrl) {
        console.error('[ProductImage] Generation failed:', result.error);
        return null;
      }

      // Upload to S3
      const s3Url = await this.uploadToS3(result.imageUrl, options.imageType);
      
      const generationTime = Date.now() - startTime;
      const cost = 0.03;  // Estimated cost per image

      console.log(`[ProductImage] Complete! Time: ${(generationTime / 1000).toFixed(1)}s`);

      return {
        url: result.imageUrl,
        s3Url,
        type: options.imageType,
        style: options.style || 'studio',
        cost,
      };

    } catch (error: any) {
      console.error('[ProductImage] Generation failed:', error.message);
      return null;
    }
  }

  /**
   * Generate multiple product images for a video project
   */
  async generateProjectImages(
    products: Array<{
      name: string;
      description?: string;
      needsOverlay?: boolean;
      needsHero?: boolean;
      needsLifestyle?: boolean;
    }>,
    brandStyle: 'studio' | 'natural' | 'dramatic' | 'minimal' = 'natural'
  ): Promise<Map<string, GeneratedProductImage[]>> {
    const results = new Map<string, GeneratedProductImage[]>();

    console.log(`[ProductImage] Generating images for ${products.length} products...`);

    for (const product of products) {
      const images: GeneratedProductImage[] = [];

      // Generate overlay image (for product overlays in video)
      if (product.needsOverlay !== false) {
        const overlay = await this.generateProductImage({
          productName: product.name,
          productDescription: product.description,
          imageType: 'overlay',
          style: 'minimal',
          aspectRatio: '1:1',
        });
        if (overlay) images.push(overlay);
      }

      // Generate hero image (for dramatic scenes)
      if (product.needsHero) {
        const hero = await this.generateProductImage({
          productName: product.name,
          productDescription: product.description,
          imageType: 'hero',
          style: brandStyle,
          aspectRatio: '16:9',
        });
        if (hero) images.push(hero);
      }

      // Generate lifestyle image (for context scenes)
      if (product.needsLifestyle) {
        const lifestyle = await this.generateProductImage({
          productName: product.name,
          productDescription: product.description,
          imageType: 'lifestyle',
          style: 'natural',
          aspectRatio: '16:9',
        });
        if (lifestyle) images.push(lifestyle);
      }

      results.set(product.name, images);
      
      console.log(`[ProductImage] Generated ${images.length} images for "${product.name}"`);
    }

    return results;
  }

  /**
   * Build the generation prompt
   */
  private buildPrompt(options: ProductImageOptions): string {
    const templates = PRODUCT_PROMPT_TEMPLATES[options.imageType];
    const style = options.style || 'studio';
    
    let template = templates[style as keyof typeof templates] || templates.studio;
    
    // Replace product placeholder
    let productDesc = options.productName;
    if (options.productDescription) {
      productDesc += `, ${options.productDescription}`;
    }
    
    let prompt = template.replace('{product}', productDesc);
    
    // Add custom background if specified
    if (options.background === 'custom' && options.customBackground) {
      prompt += `, ${options.customBackground} background`;
    } else if (options.background && options.background !== 'white') {
      const backgroundDescriptions: Record<string, string> = {
        gradient: 'soft gradient background transitioning from light to dark',
        natural: 'natural organic background with soft bokeh',
        transparent: 'clean edges suitable for transparent background',
      };
      prompt += `, ${backgroundDescriptions[options.background] || ''}`;
    }
    
    // Add lighting specification
    if (options.lighting) {
      const lightingDescriptions: Record<string, string> = {
        soft: 'soft diffused lighting',
        dramatic: 'dramatic directional lighting with deep shadows',
        natural: 'natural window lighting',
        studio: 'professional three-point studio lighting',
      };
      prompt += `, ${lightingDescriptions[options.lighting]}`;
    }
    
    // Add wellness brand context
    prompt += ', wellness brand aesthetic, health and vitality';
    
    return prompt;
  }

  /**
   * Build negative prompt
   */
  private buildNegativePrompt(options: ProductImageOptions): string {
    const parts = [
      NEGATIVE_PROMPTS.general,
      NEGATIVE_PROMPTS.product,
      NEGATIVE_PROMPTS.wellness,
    ];
    
    // Add type-specific negatives
    if (options.imageType === 'overlay') {
      parts.push('complex background, busy scene, multiple products');
    }
    
    return parts.join(', ');
  }

  /**
   * Create image generation task via Flux.1
   */
  private async createImageTask(
    prompt: string,
    negativePrompt: string,
    options: ProductImageOptions
  ): Promise<{ success: boolean; taskId?: string; error?: string }> {
    try {
      // Map aspect ratio to dimensions
      const dimensions = this.getImageDimensions(options.aspectRatio || '1:1');
      
      const response = await fetch(`${this.baseUrl}/task`, {
        method: 'POST',
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'flux.1',  // Flux.1 model
          task_type: 'text_to_image',
          input: {
            prompt: prompt,
            negative_prompt: negativePrompt,
            width: dimensions.width,
            height: dimensions.height,
            num_inference_steps: 30,
            guidance_scale: 7.5,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `API error: ${response.status} - ${errorText}` };
      }

      const data = await response.json();
      const taskId = data.data?.task_id || data.task_id;

      if (!taskId) {
        return { success: false, error: 'No task ID in response' };
      }

      return { success: true, taskId };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get image dimensions from aspect ratio
   */
  private getImageDimensions(aspectRatio: string): { width: number; height: number } {
    const dimensions: Record<string, { width: number; height: number }> = {
      '1:1': { width: 1024, height: 1024 },
      '16:9': { width: 1344, height: 768 },
      '9:16': { width: 768, height: 1344 },
      '4:3': { width: 1152, height: 896 },
    };
    return dimensions[aspectRatio] || dimensions['1:1'];
  }

  /**
   * Poll for task completion
   */
  private async pollForCompletion(
    taskId: string
  ): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
    const maxAttempts = 60;
    const pollInterval = 2000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await this.sleep(pollInterval);

      try {
        const response = await fetch(`${this.baseUrl}/task/${taskId}`, {
          headers: { 'X-API-Key': this.apiKey },
        });

        if (!response.ok) continue;

        const data = await response.json();
        const status = data.data?.status || data.status;

        if (status === 'completed' || status === 'success' || status === 'SUCCESS') {
          const imageUrl = this.extractImageUrl(data);
          
          if (imageUrl) {
            return { success: true, imageUrl };
          }
          return { success: false, error: 'No image URL in response' };
        }

        if (status === 'failed' || status === 'error') {
          return { success: false, error: data.data?.error || 'Generation failed' };
        }

      } catch (error) {
        // Continue polling
      }
    }

    return { success: false, error: 'Generation timed out' };
  }

  /**
   * Extract image URL from response
   */
  private extractImageUrl(data: any): string | null {
    const possiblePaths = [
      data.data?.output?.image_url,
      data.data?.output?.image,
      data.data?.output?.[0]?.url,
      data.data?.image_url,
      data.output?.image_url,
      data.image_url,
    ];

    for (const path of possiblePaths) {
      if (path && typeof path === 'string' && path.startsWith('http')) {
        return path;
      }
    }

    // Check for array of outputs
    if (Array.isArray(data.data?.output)) {
      const image = data.data.output.find((o: any) => o.image_url || o.url);
      return image?.image_url || image?.url || null;
    }

    return null;
  }

  /**
   * Upload to S3
   */
  private async uploadToS3(imageUrl: string, type: string): Promise<string> {
    try {
      const response = await fetch(imageUrl);
      const buffer = Buffer.from(await response.arrayBuffer());
      
      const key = `product-images/${type}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.png`;

      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: 'image/png',
      }));

      return `https://${this.bucket}.s3.us-east-1.amazonaws.com/${key}`;

    } catch (error: any) {
      console.warn('[ProductImage] S3 upload failed:', error.message);
      return imageUrl;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const productImageService = new ProductImageService();
```

---

## Step 2: Integrate with Universal Video Service

Update `server/services/universal-video-service.ts`:

### Add import:
```typescript
import { productImageService, GeneratedProductImage } from './product-image-service';
```

### Add product image generation after other assets:

```typescript
// In generateProjectAssets, add product image generation:

// Check if project has products that need images
const productsNeedingImages = this.identifyProductsNeedingImages(updatedProject);

if (productsNeedingImages.length > 0) {
  console.log(`[Assets] Generating product images for ${productsNeedingImages.length} products...`);

  if (updatedProject.progress?.steps) {
    updatedProject.progress.steps['product-images'] = {
      status: 'in-progress',
      progress: 0,
      message: 'Generating product images...',
    };
  }

  try {
    const productImages = await productImageService.generateProjectImages(
      productsNeedingImages,
      'natural'  // Pine Hill Farm brand style
    );

    // Store generated images in project
    updatedProject.generatedProductImages = {};
    
    for (const [productName, images] of productImages) {
      updatedProject.generatedProductImages[productName] = images;
      
      // Update scenes that use this product
      for (let i = 0; i < updatedProject.scenes.length; i++) {
        const scene = updatedProject.scenes[i];
        
        // Check if scene references this product
        if (this.sceneUsesProduct(scene, productName)) {
          const overlayImage = images.find(img => img.type === 'overlay');
          const heroImage = images.find(img => img.type === 'hero');
          
          updatedProject.scenes[i].assets = updatedProject.scenes[i].assets || {};
          
          if (overlayImage) {
            updatedProject.scenes[i].assets.productOverlayImage = overlayImage.s3Url;
          }
          if (heroImage && scene.type === 'product') {
            updatedProject.scenes[i].assets.productHeroImage = heroImage.s3Url;
          }
        }
      }
    }

    console.log(`[Assets] Product images complete`);

    if (updatedProject.progress?.steps?.['product-images']) {
      updatedProject.progress.steps['product-images'].status = 'complete';
      updatedProject.progress.steps['product-images'].progress = 100;
    }

  } catch (error: any) {
    console.error(`[Assets] Product image generation failed:`, error.message);
    if (updatedProject.progress?.steps?.['product-images']) {
      updatedProject.progress.steps['product-images'].status = 'error';
      updatedProject.progress.steps['product-images'].message = error.message;
    }
  }
}
```

### Add helper methods:

```typescript
/**
 * Identify products that need AI-generated images
 */
private identifyProductsNeedingImages(project: any): Array<{
  name: string;
  description?: string;
  needsOverlay: boolean;
  needsHero: boolean;
  needsLifestyle: boolean;
}> {
  const products: Array<any> = [];
  const seenProducts = new Set<string>();

  // Check project-level products
  if (project.products) {
    for (const product of project.products) {
      if (!seenProducts.has(product.name)) {
        seenProducts.add(product.name);
        products.push({
          name: product.name,
          description: product.description,
          needsOverlay: !product.hasUploadedImage,
          needsHero: product.featured,
          needsLifestyle: product.showInContext,
        });
      }
    }
  }

  // Check scenes for product references
  for (const scene of project.scenes || []) {
    const productName = scene.productName || scene.assets?.productName;
    
    if (productName && !seenProducts.has(productName)) {
      seenProducts.add(productName);
      products.push({
        name: productName,
        description: scene.productDescription,
        needsOverlay: true,
        needsHero: scene.type === 'product',
        needsLifestyle: scene.type === 'lifestyle',
      });
    }
  }

  return products;
}

/**
 * Check if a scene uses a specific product
 */
private sceneUsesProduct(scene: any, productName: string): boolean {
  return (
    scene.productName === productName ||
    scene.assets?.productName === productName ||
    scene.narration?.toLowerCase().includes(productName.toLowerCase())
  );
}
```

---

## Step 3: Add Product Image Regeneration Endpoint

Add to `server/routes/universal-video-routes.ts`:

```typescript
// POST generate/regenerate product image
router.post('/projects/:projectId/generate-product-image', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { 
      productName, 
      productDescription, 
      imageType = 'overlay',
      style = 'natural',
      aspectRatio = '1:1',
    } = req.body;
    
    if (!productName) {
      return res.status(400).json({ error: 'Product name is required' });
    }

    const project = await storage.getItem(`project:${projectId}`);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Generate image
    const image = await productImageService.generateProductImage({
      productName,
      productDescription,
      imageType,
      style,
      aspectRatio,
    });

    if (!image) {
      return res.status(500).json({ error: 'Image generation failed' });
    }

    // Store in project
    project.generatedProductImages = project.generatedProductImages || {};
    project.generatedProductImages[productName] = project.generatedProductImages[productName] || [];
    project.generatedProductImages[productName].push(image);

    await storage.setItem(`project:${projectId}`, project);

    res.json({
      success: true,
      image,
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET available product image styles
router.get('/product-image-styles', (req, res) => {
  res.json({
    imageTypes: ['product-shot', 'lifestyle', 'hero', 'overlay'],
    styles: ['studio', 'natural', 'dramatic', 'minimal'],
    aspectRatios: ['1:1', '16:9', '9:16', '4:3'],
    backgrounds: ['white', 'gradient', 'natural', 'transparent'],
    lighting: ['soft', 'dramatic', 'natural', 'studio'],
  });
});
```

---

## Step 4: Update Remotion for Generated Product Images

In `remotion/UniversalVideoComposition.tsx`, update product overlay to use generated images:

```tsx
const ProductOverlay: React.FC<{
  scene: any;
  instruction: any;
  fps: number;
}> = ({ scene, instruction, fps }) => {
  const frame = useCurrentFrame();
  
  // Use generated image if available, fall back to uploaded
  const productImage = scene.assets?.productOverlayImage || 
                       scene.assets?.generatedProductImage ||
                       scene.assets?.productImage ||
                       scene.assets?.uploadedProductImage;
  
  if (!productImage || !instruction?.enabled) {
    return null;
  }

  // Animation
  const enterFrames = 0.5 * fps;
  const exitFrames = 0.3 * fps;
  const sceneFrames = scene.duration * fps;
  
  let opacity = 1;
  if (frame < enterFrames) {
    opacity = frame / enterFrames;
  } else if (frame > sceneFrames - exitFrames) {
    opacity = (sceneFrames - frame) / exitFrames;
  }

  const { x, y } = instruction.position;
  const scale = instruction.scale || 0.25;

  return (
    <div
      style={{
        position: 'absolute',
        right: `${100 - x}%`,
        bottom: `${100 - y}%`,
        opacity,
        transform: `scale(${scale})`,
        filter: instruction.shadow ? 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))' : undefined,
        transformOrigin: 'bottom right',
      }}
    >
      <Img
        src={productImage}
        style={{
          maxWidth: '300px',
          maxHeight: '300px',
          objectFit: 'contain',
        }}
      />
    </div>
  );
};
```

---

## Step 5: Frontend Product Image Controls (Optional)

Add to `client/src/components/universal-video-producer.tsx`:

```tsx
const ProductImageGenerator: React.FC<{
  projectId: string;
  onImageGenerated: (image: any) => void;
}> = ({ projectId, onImageGenerated }) => {
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [imageType, setImageType] = useState<string>('overlay');
  const [style, setStyle] = useState<string>('natural');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!productName.trim()) return;
    
    setIsGenerating(true);
    setGeneratedImage(null);

    try {
      const response = await fetch(`/api/universal-video/projects/${projectId}/generate-product-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName,
          productDescription,
          imageType,
          style,
        }),
      });

      const data = await response.json();
      
      if (data.success && data.image) {
        setGeneratedImage(data.image.s3Url);
        onImageGenerated(data.image);
      }
    } catch (error) {
      console.error('Failed to generate image:', error);
    }

    setIsGenerating(false);
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h3 className="font-semibold mb-3">Generate Product Image</h3>
      
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">Product Name *</label>
          <input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="e.g., Pine Hill Farm Detox Supplement"
            className="w-full p-2 border rounded"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Description (optional)</label>
          <input
            type="text"
            value={productDescription}
            onChange={(e) => setProductDescription(e.target.value)}
            placeholder="e.g., green bottle with natural herbs"
            className="w-full p-2 border rounded"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Image Type</label>
            <select 
              value={imageType} 
              onChange={(e) => setImageType(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="overlay">Overlay (for video)</option>
              <option value="product-shot">Product Shot</option>
              <option value="hero">Hero Image</option>
              <option value="lifestyle">Lifestyle</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Style</label>
            <select 
              value={style} 
              onChange={(e) => setStyle(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="natural">Natural</option>
              <option value="studio">Studio</option>
              <option value="minimal">Minimal</option>
              <option value="dramatic">Dramatic</option>
            </select>
          </div>
        </div>
        
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !productName.trim()}
          className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {isGenerating ? 'Generating...' : 'Generate Image'}
        </button>
        
        {generatedImage && (
          <div className="mt-3">
            <p className="text-sm text-gray-600 mb-2">Generated Image:</p>
            <img 
              src={generatedImage} 
              alt="Generated product" 
              className="max-w-full rounded shadow"
            />
          </div>
        )}
      </div>
    </div>
  );
};
```

---

## Step 6: Test Product Image Generation

1. Create a new video project with product references
2. Generate assets
3. Watch console for:
   ```
   [Assets] Generating product images for 2 products...
   [ProductImage] Generating overlay for "Pine Hill Farm Detox"...
   [ProductImage] Task created: task_abc123
   [ProductImage] Complete! Time: 12.3s
   [ProductImage] Generated 1 images for "Pine Hill Farm Detox"
   [ProductImage] Generating overlay for "Wellness Support"...
   [ProductImage] Complete! Time: 11.8s
   [ProductImage] Generated 1 images for "Wellness Support"
   [Assets] Product images complete
   ```
4. Verify images appear in rendered video
5. Test manual generation via API endpoint

---

## Verification Checklist

- [ ] `product-image-service.ts` created and exports service
- [ ] `universal-video-service.ts` identifies products needing images
- [ ] Product images generated during asset generation
- [ ] Images uploaded to S3
- [ ] Scene assets updated with generated image URLs
- [ ] Remotion uses generated images for overlays
- [ ] Manual generation endpoint works
- [ ] Frontend controls work (if implemented)

---

## Image Types Reference

| Type | Use Case | Best Style | Aspect Ratio |
|------|----------|------------|--------------|
| `overlay` | Product overlay in video corner | minimal | 1:1 |
| `product-shot` | Standalone product image | studio/natural | 1:1 |
| `hero` | Full-screen product reveal | dramatic | 16:9 |
| `lifestyle` | Product in context/use | natural | 16:9 |

---

## Cost Estimate

| Image Type | Cost Each | Typical Per Video |
|------------|-----------|-------------------|
| Overlay | ~$0.03 | 1-2 images |
| Hero | ~$0.03 | 0-1 images |
| Lifestyle | ~$0.03 | 0-1 images |
| **Total** | | **~$0.06-0.12** |

---

## Fallback Strategy

```
1. Try Flux.1 (PiAPI) - AI-generated product image
   ↓ (if fails)
2. Use uploaded product image (if available)
   ↓ (if not available)
3. Use fal.ai for generic product visualization
   ↓ (if fails)
4. Skip product overlay
```

---

## Pine Hill Farm Product Prompt Examples

```
"Pine Hill Farm Detox Supplement bottle, green glass bottle with natural herb label, 
professional product photography, soft natural lighting, wellness aesthetic"

"Pine Hill Farm Weight Loss Support, white bottle with green accents, 
clean minimal product shot, studio lighting, health supplement"

"Pine Hill Farm products arranged together, wellness lifestyle flat lay, 
marble surface, natural herbs and plants as props, spa atmosphere"
```

---

## Next Phase

With all asset generation complete (video, sound, music, images), proceed to **Phase 2A: Claude Vision Scene Analysis** for intelligent composition.
