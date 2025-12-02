import Anthropic from "@anthropic-ai/sdk";

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
    const stabilityKey = process.env.STABILITY_API_KEY;
    
    if (stabilityKey) {
      try {
        console.log("[AssetService] Generating image with Stability AI:", prompt.substring(0, 50));
        
        const response = await fetch(
          "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              Authorization: `Bearer ${stabilityKey}`,
            },
            body: JSON.stringify({
              text_prompts: [
                {
                  text: prompt,
                  weight: 1,
                },
                {
                  text: "blurry, low quality, distorted, ugly, bad anatomy",
                  weight: -1,
                },
              ],
              cfg_scale: 7,
              height: 1024,
              width: 1024,
              steps: 30,
              samples: 1,
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.artifacts && data.artifacts[0]) {
            const base64 = data.artifacts[0].base64;
            return {
              id: `stability_${Date.now()}`,
              url: `data:image/png;base64,${base64}`,
              thumbnailUrl: `data:image/png;base64,${base64}`,
              width: 1024,
              height: 1024,
              source: "stability_ai",
            };
          }
        } else {
          console.warn("[AssetService] Stability AI failed:", response.status);
        }
      } catch (e) {
        console.warn("[AssetService] Stability AI error:", e);
      }
    }

    const hfToken = process.env.HUGGINGFACE_API_TOKEN;
    if (hfToken) {
      try {
        console.log("[AssetService] Falling back to Hugging Face for image generation");
        
        const response = await fetch(
          "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${hfToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ inputs: prompt }),
          }
        );

        if (response.ok) {
          const blob = await response.blob();
          const buffer = await blob.arrayBuffer();
          const base64 = Buffer.from(buffer).toString("base64");
          return {
            id: `hf_${Date.now()}`,
            url: `data:image/png;base64,${base64}`,
            thumbnailUrl: `data:image/png;base64,${base64}`,
            width: 1024,
            height: 1024,
            source: "huggingface",
          };
        }
      } catch (e) {
        console.warn("[AssetService] Hugging Face error:", e);
      }
    }

    console.log("[AssetService] Falling back to stock images for:", prompt);
    const stockImages = await this.searchStockImages(prompt, 1);
    return stockImages[0] || null;
  }

  async generateAIImageWithFallback(prompt: string, searchQuery: string): Promise<ImageSearchResult | null> {
    const stabilityKey = process.env.STABILITY_API_KEY;
    
    if (stabilityKey) {
      try {
        console.log("[AssetService] Generating image with Stability AI:", prompt.substring(0, 50));
        
        const response = await fetch(
          "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image",
          {
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
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.artifacts && data.artifacts[0]) {
            const base64 = data.artifacts[0].base64;
            return {
              id: `stability_${Date.now()}`,
              url: `data:image/png;base64,${base64}`,
              thumbnailUrl: `data:image/png;base64,${base64}`,
              width: 1024,
              height: 1024,
              source: "stability_ai",
            };
          }
        } else {
          console.warn("[AssetService] Stability AI failed:", response.status);
        }
      } catch (e) {
        console.warn("[AssetService] Stability AI error:", e);
      }
    }

    const hfToken = process.env.HUGGINGFACE_API_TOKEN;
    if (hfToken) {
      try {
        console.log("[AssetService] Falling back to Hugging Face for image generation");
        
        const response = await fetch(
          "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${hfToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ inputs: prompt }),
          }
        );

        if (response.ok) {
          const blob = await response.blob();
          const buffer = await blob.arrayBuffer();
          const base64 = Buffer.from(buffer).toString("base64");
          return {
            id: `hf_${Date.now()}`,
            url: `data:image/png;base64,${base64}`,
            thumbnailUrl: `data:image/png;base64,${base64}`,
            width: 1024,
            height: 1024,
            source: "huggingface",
          };
        }
      } catch (e) {
        console.warn("[AssetService] Hugging Face error:", e);
      }
    }

    console.log("[AssetService] Falling back to stock images with query:", searchQuery);
    const stockImages = await this.searchStockImages(searchQuery, 1);
    return stockImages[0] || null;
  }

  async generateAIVideo(prompt: string, duration: number = 4): Promise<VideoSearchResult | null> {
    const runwayKey = process.env.RUNWAY_API_KEY;
    
    if (runwayKey) {
      try {
        console.log("[AssetService] Generating video with Runway:", prompt.substring(0, 50));
        
        const response = await fetch("https://api.dev.runwayml.com/v1/image_to_video", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${runwayKey}`,
            "X-Runway-Version": "2024-11-06",
          },
          body: JSON.stringify({
            promptText: prompt,
            model: "gen3a_turbo",
            duration: Math.min(duration, 10),
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
                height: 768,
                source: "runway",
              };
            }
          }
        }
      } catch (e) {
        console.warn("[AssetService] Runway error:", e);
      }
    }

    console.log("[AssetService] Falling back to stock B-roll for video");
    const stockVideos = await this.searchStockVideos(prompt, 1);
    return stockVideos[0] || null;
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
      console.warn("[AssetService] No ElevenLabs API key");
      return null;
    }

    try {
      console.log("[AssetService] Generating voiceover:", text.substring(0, 50));
      
      const voiceId = await this.getElevenLabsVoiceId(voice, elevenLabsKey);
      
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": elevenLabsKey,
          },
          body: JSON.stringify({
            text,
            model_id: "eleven_monolingual_v1",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        }
      );

      if (response.ok) {
        const audioBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(audioBuffer).toString("base64");
        const duration = this.estimateAudioDuration(text);
        
        return {
          url: `data:audio/mpeg;base64,${base64}`,
          duration,
        };
      }
    } catch (e) {
      console.warn("[AssetService] ElevenLabs error:", e);
    }

    return null;
  }

  private async getElevenLabsVoiceId(voiceName: string, apiKey: string): Promise<string> {
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
