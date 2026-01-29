// server/utils/url-validation.ts

interface SceneForValidation {
  id?: number | string;
  videoUrl?: string;
  imageUrl?: string;
  voiceoverUrl?: string;
}

/**
 * Validate URLs before sending to Remotion Lambda
 * Returns list of issues found with scene URLs
 */
export function validateRenderUrls(scenes: SceneForValidation[]): string[] {
  const issues: string[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const sceneId = scene.id ?? i + 1;

    // Check video URL
    if (scene.videoUrl) {
      if (scene.videoUrl.includes('.picard.replit.dev')) {
        issues.push(`Scene ${sceneId}: videoUrl is a Replit dev URL`);
      }
      if (scene.videoUrl.startsWith('/')) {
        issues.push(`Scene ${sceneId}: videoUrl is relative`);
      }
      if (!scene.videoUrl.startsWith('https://')) {
        issues.push(`Scene ${sceneId}: videoUrl is not HTTPS`);
      }
    }

    // Check image URL
    if (scene.imageUrl) {
      if (scene.imageUrl.includes('.picard.replit.dev')) {
        issues.push(`Scene ${sceneId}: imageUrl is a Replit dev URL`);
      }
      if (scene.imageUrl.startsWith('/')) {
        issues.push(`Scene ${sceneId}: imageUrl is relative`);
      }
    }

    // Check voiceover URL
    if (scene.voiceoverUrl) {
      if (scene.voiceoverUrl.includes('.picard.replit.dev')) {
        issues.push(`Scene ${sceneId}: voiceoverUrl is a Replit dev URL`);
      }
      if (scene.voiceoverUrl.startsWith('/')) {
        issues.push(`Scene ${sceneId}: voiceoverUrl is relative`);
      }
    }
  }

  return issues;
}

/**
 * Check if URL is accessible from Lambda
 */
export function isLambdaAccessible(url: string): boolean {
  if (!url) return false;
  
  const blockedPatterns = [
    '.picard.replit.dev',
    '.repl.co',
    'localhost',
    '127.0.0.1',
    '/api/',
    '/uploads/',
  ];

  return !blockedPatterns.some(pattern => url.includes(pattern));
}

/**
 * Check if a URL is publicly accessible (not a dev URL)
 */
export function isPublicUrl(url: string): boolean {
  if (!url) return false;
  
  // Valid public URL patterns
  const publicPatterns = [
    'https://storage.googleapis.com/',
    'https://storage.cloud.google.com/',
    'https://storage.theapi.app/',
    '.s3.amazonaws.com/',
    'https://s3.',
    'https://cdn.',
    'https://res.cloudinary.com/',
    '.r2.cloudflarestorage.com',
  ];

  // Invalid patterns (Replit dev URLs)
  const invalidPatterns = [
    '.picard.replit.dev',
    '.repl.co',
    'localhost:',
    '127.0.0.1',
  ];

  // Check for invalid patterns first
  for (const pattern of invalidPatterns) {
    if (url.includes(pattern)) {
      return false;
    }
  }

  // Check for known public patterns
  for (const pattern of publicPatterns) {
    if (url.includes(pattern)) {
      return true;
    }
  }

  // HTTPS URLs without invalid patterns are considered public
  return url.startsWith('https://');
}

/**
 * Validate brand asset URLs for Lambda accessibility
 */
export function validateBrandAssetUrls(assets: {
  logoUrl?: string;
  watermarkUrl?: string;
  ctaImageUrl?: string;
}): string[] {
  const issues: string[] = [];

  if (assets.logoUrl && !isLambdaAccessible(assets.logoUrl)) {
    issues.push(`Logo URL is not Lambda accessible: ${assets.logoUrl}`);
  }

  if (assets.watermarkUrl && !isLambdaAccessible(assets.watermarkUrl)) {
    issues.push(`Watermark URL is not Lambda accessible: ${assets.watermarkUrl}`);
  }

  if (assets.ctaImageUrl && !isLambdaAccessible(assets.ctaImageUrl)) {
    issues.push(`CTA image URL is not Lambda accessible: ${assets.ctaImageUrl}`);
  }

  return issues;
}
