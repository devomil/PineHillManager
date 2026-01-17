import sharp from 'sharp';
import {
  CompositionRequest,
  CompositionResult,
  ProductPlacement,
  PreparedProductLayer,
} from '../../shared/types/image-composition-types';
import { environmentGenerationService } from './environment-generation-service';
import { brandAssetMatcher } from './brand-asset-matcher';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const S3_BUCKET = process.env.S3_BUCKET || 'remotionlambda-useast1-refjo5giq5';

class ImageCompositionService {
  
  async compose(request: CompositionRequest): Promise<CompositionResult> {
    console.log(`[ImageComposition] Starting composition for scene ${request.sceneId}`);
    
    try {
      const environmentUrl = await environmentGenerationService.generateEnvironment(request);
      
      const environmentBuffer = await this.downloadImage(environmentUrl);
      
      const productLayers = await this.prepareProductLayers(request.products, request.output);
      
      const composedBuffer = await this.composeLayers(
        environmentBuffer,
        productLayers,
        request.output
      );
      
      let finalBuffer = composedBuffer;
      if (request.logoOverlay) {
        finalBuffer = await this.addLogoOverlay(composedBuffer, request.logoOverlay, request.output);
      }
      
      const outputUrl = await this.uploadResult(finalBuffer, request.sceneId, request.output.format);
      
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
  
  private async downloadImage(url: string): Promise<Buffer> {
    if (!url || url.startsWith('placeholder:')) {
      throw new Error(`Image generation failed - no valid API keys configured. Please check FAL_KEY or LEGNEXT_API_KEY secrets.`);
    }
    
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      throw new Error(`Invalid image URL: ${url.substring(0, 50)}`);
    }
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
  
  private async prepareProductLayers(
    products: ProductPlacement[],
    output: CompositionRequest['output']
  ): Promise<PreparedProductLayer[]> {
    
    const layers: PreparedProductLayer[] = [];
    
    for (const product of products) {
      try {
        const productBuffer = await this.downloadImage(product.assetUrl);
        
        const metadata = await sharp(productBuffer).metadata();
        const originalWidth = metadata.width || 500;
        const originalHeight = metadata.height || 500;
        
        let finalWidth = originalWidth * product.scale;
        let finalHeight = originalHeight * product.scale;
        
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
        
        let processedBuffer = await sharp(productBuffer)
          .resize(Math.round(finalWidth), Math.round(finalHeight), {
            fit: 'inside',
            withoutEnlargement: false,
          })
          .png()
          .toBuffer();
        
        if (product.rotation && product.rotation !== 0) {
          processedBuffer = await sharp(processedBuffer)
            .rotate(product.rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .toBuffer();
        }
        
        if (product.flip === 'horizontal') {
          processedBuffer = await sharp(processedBuffer).flop().toBuffer();
        } else if (product.flip === 'vertical') {
          processedBuffer = await sharp(processedBuffer).flip().toBuffer();
        }
        
        if (product.shadow.enabled) {
          processedBuffer = await this.addShadow(processedBuffer, product.shadow);
        }
        
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
      } catch (error) {
        console.error(`[ImageComposition] Failed to prepare product ${product.assetId}:`, error);
      }
    }
    
    return layers.sort((a, b) => a.zIndex - b.zIndex);
  }
  
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
  
  private async addShadow(
    imageBuffer: Buffer,
    shadow: ProductPlacement['shadow']
  ): Promise<Buffer> {
    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 500;
    const height = metadata.height || 500;
    
    const shadowOffset = Math.round(shadow.blur * 0.5);
    const shadowBlur = Math.max(1, Math.round(shadow.blur));
    
    const canvasWidth = width + shadowBlur * 2 + shadowOffset;
    const canvasHeight = height + shadowBlur * 2 + shadowOffset;
    
    try {
      const shadowBuffer = await sharp(imageBuffer)
        .greyscale()
        .modulate({ brightness: 0 })
        .blur(shadowBlur)
        .ensureAlpha(shadow.opacity)
        .toBuffer();
      
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
    } catch (error) {
      console.warn('[ImageComposition] Shadow generation failed, using original:', error);
      return imageBuffer;
    }
  }
  
  private async composeLayers(
    environmentBuffer: Buffer,
    productLayers: PreparedProductLayer[],
    output: CompositionRequest['output']
  ): Promise<Buffer> {
    
    let composition = sharp(environmentBuffer).resize(output.width, output.height, {
      fit: 'cover',
    });
    
    const compositeOps = productLayers.map(layer => ({
      input: layer.buffer,
      top: Math.max(0, layer.finalBounds.y),
      left: Math.max(0, layer.finalBounds.x),
    }));
    
    if (compositeOps.length > 0) {
      composition = composition.composite(compositeOps);
    }
    
    return composition.png().toBuffer();
  }
  
  private async addLogoOverlay(
    imageBuffer: Buffer,
    logoConfig: NonNullable<CompositionRequest['logoOverlay']>,
    output: CompositionRequest['output']
  ): Promise<Buffer> {
    
    try {
      const logoAsset = await brandAssetMatcher.getBestAsset('logo-overlay');
      if (!logoAsset || !logoAsset.url) {
        console.warn('[ImageComposition] No logo asset found for overlay');
        return imageBuffer;
      }
      
      const logoBuffer = await this.downloadImage(logoAsset.url);
      
      const sizeMap: Record<string, number> = {
        small: 0.08,
        medium: 0.12,
        large: 0.18,
      };
      const logoWidth = Math.round(output.width * (sizeMap[logoConfig.size] || 0.12));
      
      const resizedLogo = await sharp(logoBuffer)
        .resize(logoWidth, null, { fit: 'inside' })
        .ensureAlpha(logoConfig.opacity)
        .toBuffer();
      
      const logoMetadata = await sharp(resizedLogo).metadata();
      
      const margin = 30;
      const pos = this.calculateLogoPosition(
        logoConfig.position,
        output.width,
        output.height,
        logoMetadata.width || logoWidth,
        logoMetadata.height || logoWidth,
        margin
      );
      
      return sharp(imageBuffer)
        .composite([{
          input: resizedLogo,
          top: pos.y,
          left: pos.x,
        }])
        .png()
        .toBuffer();
    } catch (error) {
      console.error('[ImageComposition] Logo overlay failed:', error);
      return imageBuffer;
    }
  }
  
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
      'top-center': { x: Math.round((canvasWidth - logoWidth) / 2), y: margin },
      'top-right': { x: canvasWidth - logoWidth - margin, y: margin },
      'center-left': { x: margin, y: Math.round((canvasHeight - logoHeight) / 2) },
      'center': { x: Math.round((canvasWidth - logoWidth) / 2), y: Math.round((canvasHeight - logoHeight) / 2) },
      'center-right': { x: canvasWidth - logoWidth - margin, y: Math.round((canvasHeight - logoHeight) / 2) },
      'bottom-left': { x: margin, y: canvasHeight - logoHeight - margin },
      'bottom-center': { x: Math.round((canvasWidth - logoWidth) / 2), y: canvasHeight - logoHeight - margin },
      'bottom-right': { x: canvasWidth - logoWidth - margin, y: canvasHeight - logoHeight - margin },
    };
    
    return positions[position] || positions['bottom-right'];
  }
  
  private async uploadResult(
    buffer: Buffer,
    sceneId: string,
    format: string
  ): Promise<string> {
    const filename = `compositions/composed-${sceneId}-${Date.now()}.${format}`;
    
    try {
      await s3Client.send(new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: filename,
        Body: buffer,
        ContentType: `image/${format}`,
        ACL: 'public-read',
      }));
      
      const url = `https://${S3_BUCKET}.s3.amazonaws.com/${filename}`;
      console.log(`[ImageComposition] Uploaded to S3: ${url}`);
      return url;
    } catch (error) {
      console.error('[ImageComposition] S3 upload failed:', error);
      const base64 = buffer.toString('base64');
      console.log('[ImageComposition] Returning base64 data URL as fallback');
      return `data:image/${format};base64,${base64}`;
    }
  }
}

export const imageCompositionService = new ImageCompositionService();
