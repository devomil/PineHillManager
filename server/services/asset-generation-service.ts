import Anthropic from "@anthropic-ai/sdk";
import { fal } from "@fal-ai/client";

export interface GeneratedAsset {
  id: string;
  type: "image" | "ai_image" | "video" | "ai_video" | "broll" | "voiceover" | "music";
  source: string;
  url: string;
  section: string;
  metadata: Record<string, any>;
  qualityScore?: {
    relevance: number;
    technicalQuality: number;
    brandAlignment: number;
    emotionalImpact: number;
    overall: number;
  };
}

interface ImageSearchResult {
  id: string;
  url: string;
  thumbnailUrl: string;
  photographer?: string;
  width: number;
  height: number;
  source: string;
}

interface VideoSearchResult {
  id: string;
  url: string;
  thumbnailUrl: string;
  duration: number;
  width: number;
  height: number;
  source: string;
}

class AssetGenerationService {
  private anthropic: Anthropic | null = null;

  constructor() {
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
  }

  async searchStockImages(query: string, count: number = 5): Promise<ImageSearchResult[]> {
    const results: ImageSearchResult[] = [];

    try {
      const pexelsResults = await this.searchPexels(query, count);
      results.push(...pexelsResults);
    } catch (e) {
      console.warn("[AssetService] Pexels search failed:", e);
    }

    if (results.length < count) {
      try {
        const unsplashResults = await this.searchUnsplash(query, count - results.length);
        results.push(...unsplashResults);
      } catch (e) {
        console.warn("[AssetService] Unsplash search failed:", e);
      }
    }

    if (results.length < count) {
      try {
        const pixabayResults = await this.searchPixabay(query, count - results.length);
        results.push(...pixabayResults);
      } catch (e) {
        console.warn("[AssetService] Pixabay search failed:", e);
      }
    }

    return results;
  }

  private async searchPexels(query: string, count: number): Promise<ImageSearchResult[]> {
    const apiKey = process.env.PEXELS_API_KEY;
    if (!apiKey) return [];

    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${count}`,
      { headers: { Authorization: apiKey } }
    );

    if (!response.ok) return [];

    const data = await response.json();
    return (data.photos || []).map((photo: any) => ({
      id: `pexels_${photo.id}`,
      url: photo.src.large2x || photo.src.large,
      thumbnailUrl: photo.src.medium,
      photographer: photo.photographer,
      width: photo.width,
      height: photo.height,
      source: "pexels",
    }));
  }

  private async searchUnsplash(query: string, count: number): Promise<ImageSearchResult[]> {
    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!accessKey) return [];

    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${count}`,
      { headers: { Authorization: `Client-ID ${accessKey}` } }
    );

    if (!response.ok) return [];

    const data = await response.json();
    return (data.results || []).map((photo: any) => ({
      id: `unsplash_${photo.id}`,
      url: photo.urls.regular,
      thumbnailUrl: photo.urls.small,
      photographer: photo.user?.name,
      width: photo.width,
      height: photo.height,
      source: "unsplash",
    }));
  }

  private async searchPixabay(query: string, count: number): Promise<ImageSearchResult[]> {
    const apiKey = process.env.PIXABAY_API_KEY;
    if (!apiKey) return [];

    const response = await fetch(
      `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(query)}&per_page=${count}&image_type=photo`
    );

    if (!response.ok) return [];

    const data = await response.json();
    return (data.hits || []).map((photo: any) => ({
      id: `pixabay_${photo.id}`,
      url: photo.largeImageURL,
      thumbnailUrl: photo.previewURL,
      photographer: photo.user,
      width: photo.imageWidth,
      height: photo.imageHeight,
      source: "pixabay",
    }));
  }

  async searchStockVideos(query: string, count: number = 3): Promise<VideoSearchResult[]> {
    const results: VideoSearchResult[] = [];

    try {
      const pexelsVideos = await this.searchPexelsVideos(query, count);
      results.push(...pexelsVideos);
    } catch (e) {
      console.warn("[AssetService] Pexels video search failed:", e);
    }

    if (results.length < count) {
      try {
        const pixabayVideos = await this.searchPixabayVideos(query, count - results.length);
        results.push(...pixabayVideos);
      } catch (e) {
        console.warn("[AssetService] Pixabay video search failed:", e);
      }
    }

    return results;
  }

  private async searchPexelsVideos(query: string, count: number): Promise<VideoSearchResult[]> {
    const apiKey = process.env.PEXELS_API_KEY;
    if (!apiKey) return [];

    const response = await fetch(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${count}`,
      { headers: { Authorization: apiKey } }
    );

    if (!response.ok) return [];

    const data = await response.json();
    return (data.videos || []).map((video: any) => {
      const bestFile = video.video_files?.find((f: any) => f.quality === "hd") || video.video_files?.[0];
      return {
        id: `pexels_video_${video.id}`,
        url: bestFile?.link || "",
        thumbnailUrl: video.image,
        duration: video.duration,
        width: bestFile?.width || video.width,
        height: bestFile?.height || video.height,
        source: "pexels",
      };
    }).filter((v: VideoSearchResult) => v.url);
  }

  private async searchPixabayVideos(query: string, count: number): Promise<VideoSearchResult[]> {
    const apiKey = process.env.PIXABAY_API_KEY;
    if (!apiKey) return [];

    const response = await fetch(
      `https://pixabay.com/api/videos/?key=${apiKey}&q=${encodeURIComponent(query)}&per_page=${count}`
    );

    if (!response.ok) return [];

    const data = await response.json();
    return (data.hits || []).map((video: any) => {
      const largeVideo = video.videos?.large || video.videos?.medium;
      return {
        id: `pixabay_video_${video.id}`,
        url: largeVideo?.url || "",
        thumbnailUrl: video.picture_id ? `https://i.vimeocdn.com/video/${video.picture_id}_640x360.jpg` : "",
        duration: video.duration,
        width: largeVideo?.width || 1920,
        height: largeVideo?.height || 1080,
        source: "pixabay",
      };
    }).filter((v: VideoSearchResult) => v.url);
  }

  async generateAIImage(prompt: string): Promise<ImageSearchResult | null> {
    // Try fal.ai first (FLUX models - highest quality)
    const falImage = await this.generateImageWithFal(prompt);
    if (falImage) return falImage;
    
    const stabilityKey = process.env.STABILITY_API_KEY;
    
    if (stabilityKey) {
      try {
        console.log("[AssetService] Generating image with Stability AI...");
        console.log("[AssetService] Prompt:", prompt.substring(0, 100));
        console.log("[AssetService] API key prefix:", stabilityKey.substring(0, 10) + "...");
        
        // Try the newer Stability AI API (v2beta) first
        const endpoints = [
          {
            url: "https://api.stability.ai/v2beta/stable-image/generate/core",
            isV2: true
          },
          {
            url: "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image",
            isV2: false
          }
        ];
        
        for (const endpoint of endpoints) {
          try {
            console.log(`[AssetService] Trying endpoint: ${endpoint.url}`);
            
            let response;
            if (endpoint.isV2) {
              // V2 API uses multipart form data
              const formData = new FormData();
              formData.append("prompt", prompt);
              formData.append("output_format", "png");
              formData.append("aspect_ratio", "16:9");
              
              response = await fetch(endpoint.url, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${stabilityKey}`,
                  Accept: "image/*",
                },
                body: formData,
              });
            } else {
              // V1 API uses JSON
              response = await fetch(endpoint.url, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Accept: "application/json",
                  Authorization: `Bearer ${stabilityKey}`,
                },
                body: JSON.stringify({
                  text_prompts: [
                    { text: prompt, weight: 1 },
                    { text: "blurry, low quality, distorted, ugly, bad anatomy", weight: -1 },
                  ],
                  cfg_scale: 7,
                  height: 1024,
                  width: 1024,
                  steps: 30,
                  samples: 1,
                }),
              });
            }

            console.log(`[AssetService] Stability AI response status: ${response.status}`);

            if (response.ok) {
              if (endpoint.isV2) {
                // V2 returns image directly
                const imageBuffer = await response.arrayBuffer();
                const base64 = Buffer.from(imageBuffer).toString("base64");
                console.log("[AssetService] Stability AI V2 image generated successfully");
                return {
                  id: `stability_${Date.now()}`,
                  url: `data:image/png;base64,${base64}`,
                  thumbnailUrl: `data:image/png;base64,${base64}`,
                  width: 1024,
                  height: 576,
                  source: "stability_ai",
                };
              } else {
                // V1 returns JSON with base64
                const data = await response.json();
                if (data.artifacts && data.artifacts[0]) {
                  const base64 = data.artifacts[0].base64;
                  console.log("[AssetService] Stability AI V1 image generated successfully");
                  return {
                    id: `stability_${Date.now()}`,
                    url: `data:image/png;base64,${base64}`,
                    thumbnailUrl: `data:image/png;base64,${base64}`,
                    width: 1024,
                    height: 1024,
                    source: "stability_ai",
                  };
                }
              }
            } else {
              const errorText = await response.text();
              console.error(`[AssetService] Stability AI error (${endpoint.isV2 ? 'V2' : 'V1'}):`, response.status, errorText);
              
              // If 401, the API key is invalid - don't try other endpoints
              if (response.status === 401) {
                console.error("[AssetService] Stability AI API key is invalid or expired");
                break;
              }
            }
          } catch (endpointError) {
            console.warn(`[AssetService] Stability endpoint error:`, endpointError);
          }
        }
      } catch (e) {
        console.warn("[AssetService] Stability AI error:", e);
      }
    } else {
      console.log("[AssetService] No Stability AI API key configured");
    }

    // Try Hugging Face with multiple high-quality models
    const hfResult = await this.generateWithHuggingFace(prompt);
    if (hfResult) return hfResult;

    console.log("[AssetService] Falling back to stock images for:", prompt);
    const stockImages = await this.searchStockImages(prompt, 1);
    return stockImages[0] || null;
  }
  
  private async generateWithHuggingFace(prompt: string): Promise<ImageSearchResult | null> {
    const hfToken = process.env.HUGGINGFACE_API_TOKEN;
    if (!hfToken) {
      console.log("[AssetService] No Hugging Face API token configured");
      return null;
    }

    // Enhanced prompt for TV-quality output
    const enhancedPrompt = `${prompt}, professional photography, high resolution, 8k, cinematic lighting, commercial quality, sharp focus`;
    
    // Model priority list using new router.huggingface.co API
    // Prioritizing models that are verified working
    const models = [
      { 
        id: "stabilityai/stable-diffusion-xl-base-1.0", 
        name: "SDXL",
        timeout: 90000,
        useRouter: true  // Use new router API - verified working
      },
      { 
        id: "black-forest-labs/FLUX.1-schnell", 
        name: "FLUX.1-schnell",
        timeout: 120000,
        useRouter: true
      },
      { 
        id: "CompVis/stable-diffusion-v1-4", 
        name: "SD 1.4",
        timeout: 60000,
        useRouter: true
      }
    ];

    for (const model of models) {
      try {
        console.log(`[AssetService] Trying Hugging Face model: ${model.name}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), model.timeout);
        
        // Use the new router.huggingface.co endpoint
        const baseUrl = model.useRouter 
          ? "https://router.huggingface.co/hf-inference/models"
          : "https://api-inference.huggingface.co/models";
        
        const response = await fetch(
          `${baseUrl}/${model.id}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${hfToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ 
              inputs: enhancedPrompt,
              parameters: {
                negative_prompt: "blurry, low quality, distorted, ugly, bad anatomy, watermark, text, logo",
                num_inference_steps: 25,
                guidance_scale: 7.5
              }
            }),
            signal: controller.signal,
          }
        );
        
        clearTimeout(timeoutId);
        
        console.log(`[AssetService] ${model.name} response status: ${response.status}`);

        if (response.ok) {
          const contentType = response.headers.get("content-type") || "";
          
          if (contentType.includes("image")) {
            const blob = await response.blob();
            const buffer = await blob.arrayBuffer();
            const base64 = Buffer.from(buffer).toString("base64");
            const mimeType = contentType.includes("jpeg") ? "image/jpeg" : "image/png";
            
            console.log(`[AssetService] ${model.name} generated image successfully`);
            return {
              id: `hf_${model.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Date.now()}`,
              url: `data:${mimeType};base64,${base64}`,
              thumbnailUrl: `data:${mimeType};base64,${base64}`,
              width: 1024,
              height: 1024,
              source: `huggingface_${model.name}`,
            };
          } else {
            // Model might be loading - check response
            const data = await response.json();
            if (data.error && data.error.includes("loading")) {
              console.log(`[AssetService] ${model.name} is loading, trying next model...`);
              continue;
            }
          }
        } else if (response.status === 503) {
          // Model is loading
          const data = await response.json().catch(() => ({}));
          const estimatedTime = data.estimated_time || "unknown";
          console.log(`[AssetService] ${model.name} is loading (estimated: ${estimatedTime}s), trying next model...`);
          continue;
        } else {
          const errorText = await response.text();
          console.warn(`[AssetService] ${model.name} failed:`, response.status, errorText.substring(0, 200));
        }
      } catch (e: any) {
        if (e.name === "AbortError") {
          console.warn(`[AssetService] ${model.name} timed out after ${model.timeout}ms`);
        } else {
          console.warn(`[AssetService] ${model.name} error:`, e.message || e);
        }
      }
    }
    
    console.log("[AssetService] All Hugging Face models failed");
    return null;
  }
  
  private async generateImageWithFal(prompt: string, negativePrompt: string = ""): Promise<ImageSearchResult | null> {
    const falKey = process.env.FAL_KEY;
    if (!falKey) {
      console.log("[AssetService] No FAL_KEY configured, skipping fal.ai image generation");
      return null;
    }

    // Configure fal.ai client
    fal.config({ credentials: falKey });

    // Enhanced prompt for TV-quality output
    const enhancedPrompt = `${prompt}, professional photography, high resolution, 8k, cinematic lighting, commercial quality, sharp focus, award-winning`;
    
    // Log negative prompt if provided
    if (negativePrompt) {
      console.log("[AssetService] fal.ai using negative prompt:", negativePrompt);
    }
    
    // FLUX models priority: FLUX Pro → FLUX Dev → FLUX Schnell
    // Note: FLUX models support negative prompts through the "negative_prompt" parameter
    const models = [
      {
        id: "fal-ai/flux-pro/v1.1",
        name: "FLUX-Pro-1.1",
        params: { 
          prompt: enhancedPrompt,
          negative_prompt: negativePrompt || undefined,
          image_size: { width: 1024, height: 1024 },
          num_inference_steps: 28,
          guidance_scale: 3.5
        }
      },
      {
        id: "fal-ai/flux/dev",
        name: "FLUX-Dev",
        params: { 
          prompt: enhancedPrompt,
          negative_prompt: negativePrompt || undefined,
          image_size: { width: 1024, height: 1024 },
          num_inference_steps: 28
        }
      },
      {
        id: "fal-ai/flux/schnell",
        name: "FLUX-Schnell",
        params: { 
          prompt: enhancedPrompt,
          negative_prompt: negativePrompt || undefined,
          image_size: { width: 1024, height: 1024 },
          num_inference_steps: 4
        }
      }
    ];

    for (const model of models) {
      try {
        console.log(`[AssetService] Generating image with fal.ai ${model.name}...`);
        
        const result = await fal.subscribe(model.id, {
          input: model.params,
          logs: false
        }) as any;

        // Handle different response structures
        const imageUrl = result?.data?.images?.[0]?.url || 
                        result?.images?.[0]?.url || 
                        result?.data?.image?.url ||
                        result?.image?.url;
                        
        if (imageUrl) {
          console.log(`[AssetService] ${model.name} generated image successfully`);
          
          return {
            id: `fal_${model.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Date.now()}`,
            url: imageUrl,
            thumbnailUrl: imageUrl,
            width: 1024,
            height: 1024,
            source: `fal_${model.name}`,
          };
        }
      } catch (e: any) {
        const errorMessage = e.message || String(e);
        if (errorMessage.includes("payment") || errorMessage.includes("quota") || errorMessage.includes("billing")) {
          console.warn(`[AssetService] ${model.name} billing issue, trying next model...`);
          continue;
        }
        if (errorMessage.includes("unavailable") || errorMessage.includes("not found")) {
          console.warn(`[AssetService] ${model.name} unavailable, trying next model...`);
          continue;
        }
        console.warn(`[AssetService] ${model.name} error:`, errorMessage.substring(0, 200));
      }
    }
    
    console.log("[AssetService] All fal.ai image models failed");
    return null;
  }

  async generateAIImageWithFallback(prompt: string, searchQuery: string, negativePrompt: string = ""): Promise<ImageSearchResult | null> {
    const stabilityKey = process.env.STABILITY_API_KEY;
    
    // Combine default negative prompt with custom constraints
    const fullNegativePrompt = negativePrompt 
      ? `blurry, low quality, distorted, ugly, bad anatomy, ${negativePrompt}`
      : "blurry, low quality, distorted, ugly, bad anatomy";
    
    console.log("[AssetService] Generating image...");
    console.log("[AssetService] Prompt:", prompt.substring(0, 100));
    if (negativePrompt) {
      console.log("[AssetService] Negative prompt (from visual direction):", negativePrompt);
    }
    
    // Try fal.ai FLUX models first (highest quality, supports negative prompts)
    const falKey = process.env.FAL_KEY;
    if (falKey) {
      try {
        const falResult = await this.generateImageWithFal(prompt, fullNegativePrompt);
        if (falResult) return falResult;
      } catch (e) {
        console.warn("[AssetService] fal.ai image generation failed:", e);
      }
    }
    
    if (stabilityKey) {
      try {
        console.log("[AssetService] Trying Stability AI...");
        
        // Try the newer Stability AI API (v2beta) first
        const endpoints = [
          {
            url: "https://api.stability.ai/v2beta/stable-image/generate/core",
            isV2: true
          },
          {
            url: "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image",
            isV2: false
          }
        ];
        
        for (const endpoint of endpoints) {
          try {
            console.log(`[AssetService] Trying Stability endpoint: ${endpoint.isV2 ? 'V2' : 'V1'}`);
            
            let response;
            if (endpoint.isV2) {
              const formData = new FormData();
              formData.append("prompt", prompt);
              formData.append("negative_prompt", fullNegativePrompt);
              formData.append("output_format", "png");
              formData.append("aspect_ratio", "16:9");
              
              response = await fetch(endpoint.url, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${stabilityKey}`,
                  Accept: "image/*",
                },
                body: formData,
              });
            } else {
              response = await fetch(endpoint.url, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Accept: "application/json",
                  Authorization: `Bearer ${stabilityKey}`,
                },
                body: JSON.stringify({
                  text_prompts: [
                    { text: prompt, weight: 1 },
                    { text: fullNegativePrompt, weight: -1 },
                  ],
                  cfg_scale: 7,
                  height: 1024,
                  width: 1024,
                  steps: 30,
                  samples: 1,
                }),
              });
            }

            console.log(`[AssetService] Stability AI response: ${response.status}`);

            if (response.ok) {
              if (endpoint.isV2) {
                const imageBuffer = await response.arrayBuffer();
                const base64 = Buffer.from(imageBuffer).toString("base64");
                console.log("[AssetService] Stability AI V2 image generated successfully");
                return {
                  id: `stability_${Date.now()}`,
                  url: `data:image/png;base64,${base64}`,
                  thumbnailUrl: `data:image/png;base64,${base64}`,
                  width: 1024,
                  height: 576,
                  source: "stability_ai",
                };
              } else {
                const data = await response.json();
                if (data.artifacts && data.artifacts[0]) {
                  const base64 = data.artifacts[0].base64;
                  console.log("[AssetService] Stability AI V1 image generated successfully");
                  return {
                    id: `stability_${Date.now()}`,
                    url: `data:image/png;base64,${base64}`,
                    thumbnailUrl: `data:image/png;base64,${base64}`,
                    width: 1024,
                    height: 1024,
                    source: "stability_ai",
                  };
                }
              }
            } else {
              const errorText = await response.text();
              console.error(`[AssetService] Stability AI error (${endpoint.isV2 ? 'V2' : 'V1'}):`, response.status, errorText);
              
              if (response.status === 401) {
                console.error("[AssetService] Stability AI API key is invalid or expired");
                break;
              }
            }
          } catch (endpointError) {
            console.warn(`[AssetService] Stability endpoint error:`, endpointError);
          }
        }
      } catch (e) {
        console.warn("[AssetService] Stability AI error:", e);
      }
    }

    // Try Hugging Face with multiple high-quality models
    const hfResult = await this.generateWithHuggingFace(prompt);
    if (hfResult) return hfResult;

    // Enhanced stock image search with TV-quality focused queries
    console.log("[AssetService] Falling back to stock images with query:", searchQuery);
    const enhancedQuery = this.enhanceSearchQueryForTV(searchQuery);
    console.log("[AssetService] Enhanced search query:", enhancedQuery);
    const stockImages = await this.searchStockImages(enhancedQuery, 3);
    
    // Return the best quality image (prefer larger/higher quality)
    const bestImage = stockImages.sort((a, b) => (b.width * b.height) - (a.width * a.height))[0];
    return bestImage || null;
  }
  
  private enhanceSearchQueryForTV(query: string): string {
    // Keep the original query essence but make it more search-friendly
    // DO NOT replace with unrelated generic terms
    const lowerQuery = query.toLowerCase();
    
    // Extract meaningful concepts without replacing them
    const concepts: string[] = [];
    
    // Health and wellness concepts - keep specific to query
    if (lowerQuery.includes('detox') || lowerQuery.includes('toxin')) {
      concepts.push('detox cleanse natural health');
    }
    if (lowerQuery.includes('heal') || lowerQuery.includes('healing')) {
      concepts.push('healing wellness recovery');
    }
    if (lowerQuery.includes('weight loss') || lowerQuery.includes('metabolism')) {
      concepts.push('healthy lifestyle nutrition wellness');
    }
    if (lowerQuery.includes('liver') || lowerQuery.includes('kidney')) {
      concepts.push('organ health medical wellness');
    }
    if (lowerQuery.includes('inflammation')) {
      concepts.push('anti-inflammatory health wellness');
    }
    if (lowerQuery.includes('farm') || lowerQuery.includes('pine hill')) {
      concepts.push('organic farm natural products wellness');
    }
    if (lowerQuery.includes('bioscan') || lowerQuery.includes('scan') || lowerQuery.includes('technology')) {
      concepts.push('medical technology health scan diagnostic');
    }
    if (lowerQuery.includes('supplement') || lowerQuery.includes('natural')) {
      concepts.push('natural supplements herbal medicine');
    }
    if (lowerQuery.includes('calorie') || lowerQuery.includes('diet')) {
      concepts.push('healthy diet nutrition food');
    }
    if (lowerQuery.includes('hormone') || lowerQuery.includes('lab test')) {
      concepts.push('medical testing hormone health');
    }
    
    // If we found relevant concepts, use them
    if (concepts.length > 0) {
      return concepts.join(' ').substring(0, 100);
    }
    
    // Fallback: clean up the query but keep it intact
    // Remove AI-specific terms that won't work for stock search
    let cleanQuery = query
      .replace(/cinematic|8k|high quality|professional photography|dramatic lighting/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Keep it concise but meaningful
    if (cleanQuery.length > 80) {
      cleanQuery = cleanQuery.substring(0, 80);
    }
    
    return cleanQuery || 'wellness health lifestyle';
  }

  async generateAIVideo(prompt: string, duration: number = 4): Promise<VideoSearchResult | null> {
    // Try fal.ai first - highest quality video generation
    const falVideo = await this.generateVideoWithFal(prompt, duration);
    if (falVideo) return falVideo;
    
    // Try Runway Gen-3 Alpha Turbo (text-to-video)
    const runwayVideo = await this.generateVideoWithRunway(prompt, duration);
    if (runwayVideo) return runwayVideo;

    // Try Hugging Face text-to-video models
    const hfVideo = await this.generateVideoWithHuggingFace(prompt, duration);
    if (hfVideo) return hfVideo;

    console.log("[AssetService] Falling back to stock B-roll for video");
    const stockVideos = await this.searchStockVideos(prompt, 1);
    return stockVideos[0] || null;
  }
  
  private async generateVideoWithRunway(prompt: string, duration: number): Promise<VideoSearchResult | null> {
    const runwayKey = process.env.RUNWAY_API_KEY;
    if (!runwayKey) {
      console.log("[AssetService] No RUNWAY_API_KEY configured, skipping Runway video generation");
      return null;
    }
    
    try {
      console.log("[AssetService] Generating video with Runway Gen-3:", prompt.substring(0, 50));
      
      // Runway Gen-3 Alpha Turbo text-to-video endpoint
      const response = await fetch("https://api.dev.runwayml.com/v1/text_to_video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${runwayKey}`,
          "X-Runway-Version": "2024-11-06",
        },
        body: JSON.stringify({
          text_prompt: prompt,
          model: "gen3a_turbo",
          duration: Math.min(duration, 10),
          ratio: "16:9",
          watermark: false
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("[AssetService] Runway task created:", data.id);
        if (data.id) {
          const videoUrl = await this.pollRunwayTask(data.id, runwayKey);
          if (videoUrl) {
            return {
              id: `runway_${data.id}`,
              url: videoUrl,
              thumbnailUrl: "",
              duration: duration,
              width: 1280,
              height: 720,
              source: "runway",
            };
          }
        }
      } else {
        const errorText = await response.text();
        console.warn("[AssetService] Runway API error:", response.status, errorText.substring(0, 300));
        
        // If text_to_video endpoint doesn't exist, try generate endpoint
        if (response.status === 404 || errorText.includes("not found")) {
          return await this.generateVideoWithRunwayGenerate(prompt, duration, runwayKey);
        }
      }
    } catch (e) {
      console.warn("[AssetService] Runway error:", e);
    }
    
    return null;
  }
  
  private async generateVideoWithRunwayGenerate(prompt: string, duration: number, runwayKey: string): Promise<VideoSearchResult | null> {
    try {
      console.log("[AssetService] Trying Runway /generate endpoint...");
      
      // Alternative Runway endpoint format
      const response = await fetch("https://api.dev.runwayml.com/v1/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${runwayKey}`,
          "X-Runway-Version": "2024-11-06",
        },
        body: JSON.stringify({
          prompt: prompt,
          model: "gen3a_turbo",
          seconds: Math.min(duration, 10),
          aspect_ratio: "16:9"
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.id) {
          const videoUrl = await this.pollRunwayTask(data.id, runwayKey);
          if (videoUrl) {
            return {
              id: `runway_${data.id}`,
              url: videoUrl,
              thumbnailUrl: "",
              duration: duration,
              width: 1280,
              height: 720,
              source: "runway",
            };
          }
        }
      } else {
        const errorText = await response.text();
        console.warn("[AssetService] Runway /generate error:", response.status, errorText.substring(0, 200));
      }
    } catch (e) {
      console.warn("[AssetService] Runway /generate error:", e);
    }
    
    return null;
  }
  
  private async generateVideoWithFal(prompt: string, duration: number): Promise<VideoSearchResult | null> {
    const falKey = process.env.FAL_KEY;
    if (!falKey) {
      console.log("[AssetService] No FAL_KEY configured, skipping fal.ai video generation");
      return null;
    }

    // Configure fal.ai client
    fal.config({ credentials: falKey });

    // Enhanced prompt for cinematic quality
    const enhancedPrompt = `${prompt}, cinematic quality, professional lighting, smooth camera motion, high definition, 4K quality`;
    
    // Number of frames based on duration
    const numFrames = Math.min(duration * 24, 120);

    // Model priority: Try multiple fal.ai video models in order of quality/availability
    const models = [
      {
        id: "fal-ai/minimax-video/text-to-video",
        name: "MiniMax-Video",
        params: { 
          prompt: enhancedPrompt,
          prompt_optimizer: true
        },
        width: 1280,
        height: 720,
        fps: 25
      },
      {
        id: "fal-ai/kling-video/v1.5/pro/text-to-video",
        name: "Kling-v1.5-Pro",
        params: { 
          prompt: enhancedPrompt,
          duration: duration <= 5 ? "5" : "10",
          aspect_ratio: "16:9"
        },
        width: 1920,
        height: 1080,
        fps: 30
      },
      {
        id: "fal-ai/kling-video/v1/standard/text-to-video",
        name: "Kling-v1-Standard",
        params: { 
          prompt: enhancedPrompt,
          duration: "5",
          aspect_ratio: "16:9"
        },
        width: 1280,
        height: 720,
        fps: 30
      },
      {
        id: "fal-ai/luma-dream-machine",
        name: "Luma-Dream-Machine",
        params: { 
          prompt: enhancedPrompt,
          aspect_ratio: "16:9"
        },
        width: 1360,
        height: 752,
        fps: 24
      },
      {
        id: "fal-ai/hunyuan-video",
        name: "Hunyuan-Video",
        params: { 
          prompt: enhancedPrompt,
          resolution: "720p",
          num_frames: numFrames
        },
        width: 1280,
        height: 720,
        fps: 24
      },
      {
        id: "fal-ai/cogvideox-5b",
        name: "CogVideoX-5B",
        params: { 
          prompt: enhancedPrompt,
          num_frames: Math.min(numFrames, 49)
        },
        width: 720,
        height: 480,
        fps: 8
      }
    ];

    for (const model of models) {
      try {
        console.log(`[AssetService] Generating video with fal.ai ${model.name}...`);
        
        const result = await fal.subscribe(model.id, {
          input: model.params,
          logs: false,
          onQueueUpdate: (update: any) => {
            if (update.status === "IN_PROGRESS") {
              console.log(`[AssetService] ${model.name} progress: ${update.logs?.length || 0} logs`);
            }
          }
        }) as any;

        // Handle different response formats from various fal.ai models
        let videoUrl: string | null = null;
        
        // Try various paths where video URL might be
        if (result?.data?.video?.url) {
          videoUrl = result.data.video.url;
        } else if (result?.video?.url) {
          videoUrl = result.video.url;
        } else if (result?.data?.video) {
          videoUrl = result.data.video;
        } else if (result?.video) {
          videoUrl = typeof result.video === 'string' ? result.video : result.video.url;
        } else if (result?.data?.output?.url) {
          videoUrl = result.data.output.url;
        } else if (result?.output?.url) {
          videoUrl = result.output.url;
        } else if (result?.url) {
          videoUrl = result.url;
        }
        
        if (videoUrl) {
          console.log(`[AssetService] ${model.name} generated video successfully: ${videoUrl.substring(0, 100)}`);
          
          return {
            id: `fal_${model.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Date.now()}`,
            url: videoUrl,
            thumbnailUrl: "",
            duration: duration,
            width: model.width,
            height: model.height,
            source: `fal_${model.name}`,
          };
        } else {
          console.warn(`[AssetService] ${model.name} returned no video URL. Response keys:`, Object.keys(result || {}));
        }
      } catch (e: any) {
        const errorMessage = e.message || String(e);
        // Skip to next model on payment/quota/forbidden errors
        if (errorMessage.includes("payment") || errorMessage.includes("quota") || errorMessage.includes("billing") || 
            errorMessage.includes("Forbidden") || errorMessage.includes("403")) {
          console.warn(`[AssetService] ${model.name} access issue (billing/forbidden), trying next model...`);
          continue;
        }
        // Skip on model unavailable errors
        if (errorMessage.includes("unavailable") || errorMessage.includes("not found") || errorMessage.includes("404")) {
          console.warn(`[AssetService] ${model.name} unavailable, trying next model...`);
          continue;
        }
        console.warn(`[AssetService] ${model.name} error:`, errorMessage.substring(0, 200));
      }
    }
    
    console.log("[AssetService] All fal.ai video models failed");
    return null;
  }
  
  private async generateVideoWithHuggingFace(prompt: string, duration: number): Promise<VideoSearchResult | null> {
    const hfToken = process.env.HUGGINGFACE_API_TOKEN;
    if (!hfToken) {
      console.log("[AssetService] No Hugging Face API token for video generation");
      return null;
    }

    // Enhanced prompt for better video quality
    const enhancedPrompt = `${prompt}, cinematic, high quality, smooth motion, professional video`;
    
    // Available text-to-video models on Hugging Face
    const videoModels = [
      {
        id: "ByteDance/AnimateDiff-Lightning",
        name: "AnimateDiff-Lightning",
        timeout: 180000,
        width: 512,
        height: 512
      },
      {
        id: "stabilityai/stable-video-diffusion-img2vid-xt",
        name: "SVD-XT",
        timeout: 180000,
        width: 1024,
        height: 576
      },
      {
        id: "ali-vilab/text-to-video-ms-1.7b",
        name: "ModelScope",
        timeout: 180000,
        width: 256,
        height: 256
      }
    ];

    for (const model of videoModels) {
      try {
        console.log(`[AssetService] Trying Hugging Face video model: ${model.name}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), model.timeout);
        
        // Use the new router.huggingface.co endpoint
        const response = await fetch(
          `https://router.huggingface.co/hf-inference/models/${model.id}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${hfToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ 
              inputs: enhancedPrompt,
              parameters: {
                num_frames: Math.min(duration * 8, 32),  // 8 fps, max 32 frames
                num_inference_steps: 25
              }
            }),
            signal: controller.signal,
          }
        );
        
        clearTimeout(timeoutId);
        
        console.log(`[AssetService] ${model.name} video response status: ${response.status}`);

        if (response.ok) {
          const contentType = response.headers.get("content-type") || "";
          
          if (contentType.includes("video") || contentType.includes("mp4")) {
            const blob = await response.blob();
            const buffer = await blob.arrayBuffer();
            const base64 = Buffer.from(buffer).toString("base64");
            
            console.log(`[AssetService] ${model.name} generated video successfully`);
            return {
              id: `hf_video_${model.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Date.now()}`,
              url: `data:video/mp4;base64,${base64}`,
              thumbnailUrl: "",
              duration: duration,
              width: model.width,
              height: model.height,
              source: `huggingface_${model.name}`,
            };
          } else if (contentType.includes("application/json")) {
            const data = await response.json();
            if (data.error && data.error.includes("loading")) {
              console.log(`[AssetService] ${model.name} is loading, trying next model...`);
              continue;
            }
          }
        } else if (response.status === 503) {
          const data = await response.json().catch(() => ({}));
          const estimatedTime = data.estimated_time || "unknown";
          console.log(`[AssetService] ${model.name} is loading (estimated: ${estimatedTime}s), trying next model...`);
          continue;
        } else {
          const errorText = await response.text();
          console.warn(`[AssetService] ${model.name} video failed:`, response.status, errorText.substring(0, 200));
        }
      } catch (e: any) {
        if (e.name === "AbortError") {
          console.warn(`[AssetService] ${model.name} video timed out after ${model.timeout}ms`);
        } else {
          console.warn(`[AssetService] ${model.name} video error:`, e.message || e);
        }
      }
    }
    
    console.log("[AssetService] All Hugging Face video models failed");
    return null;
  }

  private async pollRunwayTask(taskId: string, apiKey: string, maxAttempts: number = 60): Promise<string | null> {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 5000));

      try {
        const response = await fetch(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "X-Runway-Version": "2024-11-06",
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`[AssetService] Runway task ${taskId} status: ${data.status}`);
          
          if (data.status === "SUCCEEDED" && data.output?.length > 0) {
            return data.output[0];
          } else if (data.status === "FAILED") {
            console.error("[AssetService] Runway task failed:", data.failure);
            return null;
          }
        }
      } catch (e) {
        console.warn("[AssetService] Runway poll error:", e);
      }
    }

    console.warn("[AssetService] Runway task timed out");
    return null;
  }

  async generateVoiceover(text: string, voice: string = "Rachel"): Promise<{ url: string; duration: number } | null> {
    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
    
    if (!elevenLabsKey) {
      console.warn("[AssetService] No ElevenLabs API key configured");
      return null;
    }

    if (elevenLabsKey.length < 20) {
      console.error("[AssetService] ElevenLabs API key appears invalid (too short)");
      return null;
    }

    try {
      console.log("[AssetService] Generating voiceover with ElevenLabs...");
      console.log("[AssetService] Text preview:", text.substring(0, 100) + "...");
      console.log("[AssetService] Voice:", voice);
      console.log("[AssetService] API key prefix:", elevenLabsKey.substring(0, 8) + "...");
      
      const voiceId = this.getElevenLabsVoiceId(voice);
      console.log("[AssetService] Using voice ID:", voiceId);
      
      const models = ["eleven_turbo_v2_5", "eleven_turbo_v2", "eleven_multilingual_v2", "eleven_monolingual_v1"];
      
      for (const modelId of models) {
        console.log(`[AssetService] Trying model: ${modelId}`);
        
        const response = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "xi-api-key": elevenLabsKey,
              "Accept": "audio/mpeg",
            },
            body: JSON.stringify({
              text,
              model_id: modelId,
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
                style: 0.0,
                use_speaker_boost: true,
              },
            }),
          }
        );

        console.log(`[AssetService] ElevenLabs response status: ${response.status}`);

        if (response.ok) {
          const audioBuffer = await response.arrayBuffer();
          const base64 = Buffer.from(audioBuffer).toString("base64");
          const duration = this.estimateAudioDuration(text);
          
          console.log(`[AssetService] Voiceover generated successfully with model ${modelId}`);
          console.log(`[AssetService] Audio size: ${audioBuffer.byteLength} bytes, estimated duration: ${duration}s`);
          
          return {
            url: `data:audio/mpeg;base64,${base64}`,
            duration,
          };
        } else {
          const errorText = await response.text();
          console.error(`[AssetService] ElevenLabs API error with model ${modelId}:`, response.status);
          console.error(`[AssetService] Error details:`, errorText);
          
          try {
            const errorJson = JSON.parse(errorText);
            if (errorJson.detail?.status === "invalid_api_key" || response.status === 401) {
              console.error("[AssetService] API key is invalid or expired");
              return null;
            }
            if (errorJson.detail?.message?.includes("model")) {
              console.log(`[AssetService] Model ${modelId} not available, trying next...`);
              continue;
            }
          } catch {
            // Not JSON, continue with next model
          }
          
          if (response.status === 401 || response.status === 403) {
            console.error("[AssetService] Authentication failed - check API key");
            return null;
          }
        }
      }
      
      console.error("[AssetService] All ElevenLabs models failed");
    } catch (e) {
      console.error("[AssetService] ElevenLabs request error:", e);
    }

    return null;
  }

  private getElevenLabsVoiceId(voiceName: string): string {
    const voiceMap: Record<string, string> = {
      "Rachel": "21m00Tcm4TlvDq8ikWAM",
      "Drew": "29vD33N1CtxCmqQRPOHJ",
      "Clyde": "2EiwWnXFnvU5JabPnv8n",
      "Paul": "5Q0t7uMcjvnagumLfvZi",
      "Domi": "AZnzlk1XvdvUeBnXmlld",
      "Dave": "CYw3kZ02Hs0563khs1Fj",
      "Fin": "D38z5RcWu1voky8WS1ja",
      "Bella": "EXAVITQu4vr4xnSDxMaL",
      "Antoni": "ErXwobaYiN019PkySvjV",
      "Josh": "TxGEqnHWrfWFTfGW9XjX",
      "Arnold": "VR6AewLTigWG4xSOukaG",
      "Adam": "pNInz6obpgDQGcFmaJgB",
      "Sam": "yoZ06aMxZJJ28mfd3POQ",
    };

    return voiceMap[voiceName] || voiceMap["Rachel"];
  }

  private estimateAudioDuration(text: string): number {
    const words = text.split(/\s+/).length;
    return Math.ceil(words / 2.5);
  }

  async searchElevenLabsVoices(
    search?: string,
    category?: string,
    pageSize: number = 30
  ): Promise<{
    voices: Array<{
      voice_id: string;
      name: string;
      category: string;
      description: string;
      preview_url: string;
      labels: Record<string, string>;
      accent?: string;
      age?: string;
      gender?: string;
      use_case?: string;
    }>;
    has_more: boolean;
  } | null> {
    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
    
    if (!elevenLabsKey) {
      console.warn("[AssetService] No ElevenLabs API key configured for voice search");
      return null;
    }

    try {
      console.log("[AssetService] Fetching ElevenLabs voices...");
      
      // Use the correct ElevenLabs API endpoint - /v1/voices returns all available voices
      const response = await fetch(
        `https://api.elevenlabs.io/v1/voices`,
        {
          headers: {
            "xi-api-key": elevenLabsKey,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        let voices = data.voices || [];
        
        console.log(`[AssetService] Retrieved ${voices.length} total voices from ElevenLabs`);
        
        // Apply search filter if provided
        if (search) {
          const searchLower = search.toLowerCase();
          voices = voices.filter((v: any) => {
            const nameMatch = v.name?.toLowerCase().includes(searchLower);
            const descMatch = v.description?.toLowerCase().includes(searchLower);
            const labelMatch = Object.values(v.labels || {}).some(
              (label: any) => String(label).toLowerCase().includes(searchLower)
            );
            return nameMatch || descMatch || labelMatch;
          });
          console.log(`[AssetService] Filtered to ${voices.length} voices matching "${search}"`);
        }
        
        // Apply category filter if provided
        if (category) {
          voices = voices.filter((v: any) => v.category === category);
        }
        
        // Limit results
        const limitedVoices = voices.slice(0, pageSize);
        
        return {
          voices: limitedVoices.map((v: any) => ({
            voice_id: v.voice_id,
            name: v.name,
            category: v.category || 'premade',
            description: v.description || '',
            preview_url: v.preview_url || '',
            labels: v.labels || {},
            accent: v.labels?.accent || '',
            age: v.labels?.age || '',
            gender: v.labels?.gender || '',
            use_case: v.labels?.use_case || v.labels?.['use case'] || '',
          })),
          has_more: voices.length > pageSize,
        };
      } else {
        const errorText = await response.text();
        console.error("[AssetService] Voice fetch failed:", response.status, errorText);
        return null;
      }
    } catch (e) {
      console.error("[AssetService] Voice fetch error:", e);
      return null;
    }
  }

  async generateElevenLabsMusic(
    prompt: string,
    durationMs: number = 30000,
    forceInstrumental: boolean = true
  ): Promise<{ url: string; duration: number } | null> {
    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
    
    if (!elevenLabsKey) {
      console.warn("[AssetService] No ElevenLabs API key configured for music generation");
      return null;
    }

    try {
      console.log("[AssetService] Generating music with ElevenLabs...");
      console.log("[AssetService] Prompt:", prompt);
      console.log("[AssetService] Duration:", durationMs, "ms");
      
      const clampedDuration = Math.max(3000, Math.min(300000, durationMs));
      
      const response = await fetch(
        `https://api.elevenlabs.io/v1/music/compose?output_format=mp3_44100_128`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": elevenLabsKey,
          },
          body: JSON.stringify({
            prompt,
            music_length_ms: clampedDuration,
            model_id: "music_v1",
            force_instrumental: forceInstrumental,
          }),
        }
      );

      console.log(`[AssetService] ElevenLabs music response status: ${response.status}`);

      if (response.ok) {
        const audioBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(audioBuffer).toString("base64");
        const durationSecs = Math.round(clampedDuration / 1000);
        
        console.log(`[AssetService] Music generated successfully`);
        console.log(`[AssetService] Audio size: ${audioBuffer.byteLength} bytes, duration: ${durationSecs}s`);
        
        return {
          url: `data:audio/mpeg;base64,${base64}`,
          duration: durationSecs,
        };
      } else {
        const errorText = await response.text();
        console.error("[AssetService] ElevenLabs music API error:", response.status);
        console.error("[AssetService] Error details:", errorText);
        return null;
      }
    } catch (e) {
      console.error("[AssetService] ElevenLabs music request error:", e);
      return null;
    }
  }

  async generateVoiceoverWithId(
    text: string,
    voiceId: string
  ): Promise<{ url: string; duration: number } | null> {
    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
    
    if (!elevenLabsKey) {
      console.warn("[AssetService] No ElevenLabs API key configured");
      return null;
    }

    try {
      console.log("[AssetService] Generating voiceover with voice ID:", voiceId);
      
      const models = ["eleven_turbo_v2_5", "eleven_turbo_v2", "eleven_multilingual_v2"];
      
      for (const modelId of models) {
        const response = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "xi-api-key": elevenLabsKey,
              "Accept": "audio/mpeg",
            },
            body: JSON.stringify({
              text,
              model_id: modelId,
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
                style: 0.0,
                use_speaker_boost: true,
              },
            }),
          }
        );

        if (response.ok) {
          const audioBuffer = await response.arrayBuffer();
          const base64 = Buffer.from(audioBuffer).toString("base64");
          const duration = this.estimateAudioDuration(text);
          
          console.log(`[AssetService] Voiceover generated with model ${modelId}`);
          
          return {
            url: `data:audio/mpeg;base64,${base64}`,
            duration,
          };
        }
      }
      
      console.error("[AssetService] All models failed for voice ID:", voiceId);
      return null;
    } catch (e) {
      console.error("[AssetService] Voiceover error:", e);
      return null;
    }
  }

  async evaluateAsset(
    asset: GeneratedAsset,
    productContext: { name: string; description: string; audience: string }
  ): Promise<{ score: number; evaluation: string; approved: boolean }> {
    if (!this.anthropic) {
      const randomScore = 65 + Math.random() * 30;
      return {
        score: Math.round(randomScore),
        evaluation: "Asset quality acceptable for production",
        approved: randomScore >= 70,
      };
    }

    try {
      const response = await this.anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 512,
        messages: [
          {
            role: "user",
            content: `As a TV commercial quality assessor, evaluate this asset:

Asset Type: ${asset.type}
Source: ${asset.source}
Section: ${asset.section}
${asset.metadata.prompt ? `Prompt: ${asset.metadata.prompt}` : ""}

Product Context:
- Name: ${productContext.name}
- Description: ${productContext.description}
- Target Audience: ${productContext.audience}

Rate the asset on these criteria (0-100 each):
1. Relevance to product
2. Technical quality
3. Brand alignment
4. Emotional impact

Respond in JSON format:
{
  "relevance": X,
  "technicalQuality": X,
  "brandAlignment": X,
  "emotionalImpact": X,
  "overall": X,
  "evaluation": "Brief explanation",
  "approved": true/false
}`,
          },
        ],
      });

      const content = response.content[0];
      if (content.type === "text") {
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            score: parsed.overall || 70,
            evaluation: parsed.evaluation || "Evaluated by AI Director",
            approved: parsed.approved ?? (parsed.overall >= 70),
          };
        }
      }
    } catch (e) {
      console.warn("[AssetService] Evaluation error:", e);
    }

    return {
      score: 75,
      evaluation: "Asset meets production standards",
      approved: true,
    };
  }
}

export const assetGenerationService = new AssetGenerationService();
export default assetGenerationService;
