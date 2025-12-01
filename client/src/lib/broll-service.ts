// B-roll Service
// Integrates with Pexels and Pixabay APIs for stock video footage

export interface BrollVideo {
  id: number;
  url: string;
  thumbnail: string;
  width: number;
  height: number;
  duration: number;
  tags: string[];
  user: string;
  source: 'pexels' | 'pixabay';
  videoFiles: Array<{
    quality: string;
    width: number;
    height: number;
    link: string;
    fileType: string;
  }>;
}

export interface BrollSearchOptions {
  query: string;
  category?: 'medical' | 'wellness' | 'people' | 'nature' | 'abstract' | 'product';
  minDuration?: number;
  maxResults?: number;
  orientation?: 'landscape' | 'portrait' | 'square';
}

export class BrollService {
  private pexelsApiKey: string = '';
  private pixabayApiKey: string = '';
  private readonly PEXELS_API = 'https://api.pexels.com/videos';
  private readonly PIXABAY_API = 'https://pixabay.com/api/videos/';
  private cache: Map<string, BrollVideo[]> = new Map();

  /**
   * Set API keys
   */
  setApiKeys(pexelsKey: string, pixabayKey: string) {
    this.pexelsApiKey = pexelsKey;
    this.pixabayApiKey = pixabayKey;
  }

  /**
   * Check if service is available
   */
  async isAvailable(): Promise<{ pexels: boolean; pixabay: boolean }> {
    // Try to get from server config if not set
    if (!this.pexelsApiKey || !this.pixabayApiKey) {
      try {
        const response = await fetch('/api/config');
        const config = await response.json();
        if (config.pexelsApiKey) this.pexelsApiKey = config.pexelsApiKey;
        if (config.pixabayApiKey) this.pixabayApiKey = config.pixabayApiKey;
      } catch (error) {
        console.error('Failed to fetch API config:', error);
      }
    }

    return {
      pexels: !!this.pexelsApiKey,
      pixabay: !!this.pixabayApiKey
    };
  }

  /**
   * Search for B-roll videos
   */
  async searchVideos(options: BrollSearchOptions): Promise<BrollVideo[]> {
    const cacheKey = JSON.stringify(options);

    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const results: BrollVideo[] = [];

    // Search Pexels
    if (this.pexelsApiKey) {
      try {
        const pexelsResults = await this.searchPexels(options);
        results.push(...pexelsResults);
      } catch (error) {
        console.error('Pexels search failed:', error);
      }
    }

    // Search Pixabay
    if (this.pixabayApiKey) {
      try {
        const pixabayResults = await this.searchPixabay(options);
        results.push(...pixabayResults);
      } catch (error) {
        console.error('Pixabay search failed:', error);
      }
    }

    // Filter by duration if specified
    let filteredResults = results;
    if (options.minDuration) {
      filteredResults = results.filter(v => v.duration >= options.minDuration!);
    }

    // Limit results
    const maxResults = options.maxResults || 10;
    filteredResults = filteredResults.slice(0, maxResults);

    // Cache results
    this.cache.set(cacheKey, filteredResults);

    return filteredResults;
  }

  /**
   * Search Pexels API
   */
  private async searchPexels(options: BrollSearchOptions): Promise<BrollVideo[]> {
    const url = new URL(`${this.PEXELS_API}/search`);
    url.searchParams.append('query', options.query);
    url.searchParams.append('per_page', String(options.maxResults || 10));

    if (options.orientation) {
      url.searchParams.append('orientation', options.orientation);
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': this.pexelsApiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.statusText}`);
    }

    const data = await response.json();

    return (data.videos || []).map((video: any) => ({
      id: video.id,
      url: video.url,
      thumbnail: video.image,
      width: video.width,
      height: video.height,
      duration: video.duration,
      tags: video.tags?.split(',').map((t: string) => t.trim()) || [],
      user: video.user?.name || 'Unknown',
      source: 'pexels' as const,
      videoFiles: (video.video_files || []).map((file: any) => ({
        quality: file.quality,
        width: file.width,
        height: file.height,
        link: file.link,
        fileType: file.file_type
      }))
    }));
  }

  /**
   * Search Pixabay API
   */
  private async searchPixabay(options: BrollSearchOptions): Promise<BrollVideo[]> {
    const url = new URL(this.PIXABAY_API);
    url.searchParams.append('key', this.pixabayApiKey);
    url.searchParams.append('q', options.query);
    url.searchParams.append('per_page', String(options.maxResults || 10));

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Pixabay API error: ${response.statusText}`);
    }

    const data = await response.json();

    return (data.hits || []).map((video: any) => ({
      id: video.id,
      url: video.pageURL,
      thumbnail: video.userImageURL,
      width: video.videos?.large?.width || 1920,
      height: video.videos?.large?.height || 1080,
      duration: video.duration,
      tags: video.tags?.split(',').map((t: string) => t.trim()) || [],
      user: video.user || 'Unknown',
      source: 'pixabay' as const,
      videoFiles: Object.entries(video.videos || {}).map(([quality, info]: [string, any]) => ({
        quality,
        width: info.width,
        height: info.height,
        link: info.url,
        fileType: 'video/mp4'
      }))
    }));
  }

  /**
   * Get smart B-roll suggestions based on script section
   */
  async getSuggestedBroll(
    sectionType: string,
    sectionContent: string,
    healthConcern?: string,
    videoDuration: number = 5
  ): Promise<BrollVideo[]> {
    // Build smart search query based on context
    const query = this.buildSearchQuery(sectionType, sectionContent, healthConcern);

    // Determine category
    const category = this.determineCategory(sectionType, healthConcern);

    return await this.searchVideos({
      query,
      category,
      minDuration: videoDuration,
      maxResults: 5
    });
  }

  /**
   * Build intelligent search query
   */
  private buildSearchQuery(
    sectionType: string,
    sectionContent: string,
    healthConcern?: string
  ): string {
    const keywords: string[] = [];

    // Add section type keywords
    const sectionKeywords: Record<string, string[]> = {
      hook: ['attention', 'dramatic', 'powerful', 'impact'],
      problem: ['struggle', 'concern', 'challenge', 'difficulty'],
      solution: ['relief', 'success', 'solution', 'improvement'],
      social_proof: ['happy', 'testimonial', 'satisfied', 'success'],
      cta: ['action', 'call to action', 'decision', 'choice']
    };

    if (sectionKeywords[sectionType]) {
      keywords.push(...sectionKeywords[sectionType]);
    }

    // Add health concern keywords
    if (healthConcern) {
      const concern = healthConcern.toLowerCase();
      if (concern.includes('weight')) {
        keywords.push('fitness', 'exercise', 'healthy eating', 'wellness');
      } else if (concern.includes('joint') || concern.includes('pain')) {
        keywords.push('medical', 'healthcare', 'relief', 'therapy');
      } else if (concern.includes('sleep')) {
        keywords.push('rest', 'peaceful', 'bedroom', 'relaxation');
      } else if (concern.includes('energy')) {
        keywords.push('active', 'energetic', 'vitality', 'lifestyle');
      } else {
        keywords.push('health', 'wellness', 'medical', 'healthcare');
      }
    }

    // Extract keywords from content
    const contentWords = sectionContent
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 4 && !this.isCommonWord(word))
      .slice(0, 3);

    keywords.push(...contentWords);

    // Return best combination (max 3-4 keywords)
    return keywords.slice(0, 4).join(' ');
  }

  /**
   * Determine video category
   */
  private determineCategory(
    sectionType: string,
    healthConcern?: string
  ): BrollSearchOptions['category'] {
    if (healthConcern) {
      const concern = healthConcern.toLowerCase();
      if (concern.includes('weight') || concern.includes('fitness')) {
        return 'wellness';
      } else if (concern.includes('medical') || concern.includes('clinical')) {
        return 'medical';
      }
    }

    const categoryMap: Record<string, BrollSearchOptions['category']> = {
      hook: 'abstract',
      problem: 'people',
      solution: 'wellness',
      social_proof: 'people',
      cta: 'product'
    };

    return categoryMap[sectionType] || 'wellness';
  }

  /**
   * Check if word is common/stop word
   */
  private isCommonWord(word: string): boolean {
    const stopWords = new Set([
      'that', 'this', 'with', 'from', 'have', 'been', 'will',
      'their', 'what', 'which', 'when', 'where', 'about'
    ]);
    return stopWords.has(word);
  }

  /**
   * Download and prepare video clip
   */
  async downloadClip(video: BrollVideo, quality: 'hd' | 'sd' = 'hd'): Promise<Blob> {
    // Find best quality file
    const targetHeight = quality === 'hd' ? 1080 : 720;
    const videoFile = this.findBestQuality(video.videoFiles, targetHeight);

    if (!videoFile) {
      throw new Error('No suitable video quality found');
    }

    try {
      const response = await fetch(videoFile.link);
      if (!response.ok) {
        throw new Error(`Failed to download video: ${response.statusText}`);
      }
      return await response.blob();
    } catch (error) {
      console.error('Failed to download B-roll clip:', error);
      throw error;
    }
  }

  /**
   * Find best quality video file
   */
  private findBestQuality(
    videoFiles: BrollVideo['videoFiles'],
    targetHeight: number
  ): BrollVideo['videoFiles'][0] | null {
    // Sort by closest to target height
    const sorted = [...videoFiles].sort((a, b) => {
      const diffA = Math.abs(a.height - targetHeight);
      const diffB = Math.abs(b.height - targetHeight);
      return diffA - diffB;
    });

    return sorted[0] || null;
  }

  /**
   * Load video element for rendering
   */
  async loadVideoElement(videoUrl: string): Promise<HTMLVideoElement> {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.loop = true;
    video.playsInline = true;

    return new Promise((resolve, reject) => {
      video.onloadeddata = () => {
        console.log(`[BrollService] Video loaded: ${video.videoWidth}x${video.videoHeight}, ${video.duration}s`);
        resolve(video);
      };

      video.onerror = () => {
        reject(new Error('Failed to load B-roll video'));
      };

      video.src = videoUrl;
      video.load();
    });
  }

  /**
   * Get fallback videos when API is unavailable
   */
  getFallbackVideos(category: BrollSearchOptions['category']): BrollVideo[] {
    // Return placeholder structure for local fallback videos
    const fallbacks: Record<string, BrollVideo> = {
      medical: {
        id: 1,
        url: '/assets/broll/medical.mp4',
        thumbnail: '/assets/broll/medical-thumb.jpg',
        width: 1920,
        height: 1080,
        duration: 10,
        tags: ['medical', 'healthcare', 'professional'],
        user: 'Local',
        source: 'pexels',
        videoFiles: [{
          quality: 'hd',
          width: 1920,
          height: 1080,
          link: '/assets/broll/medical.mp4',
          fileType: 'video/mp4'
        }]
      },
      wellness: {
        id: 2,
        url: '/assets/broll/wellness.mp4',
        thumbnail: '/assets/broll/wellness-thumb.jpg',
        width: 1920,
        height: 1080,
        duration: 10,
        tags: ['wellness', 'health', 'lifestyle'],
        user: 'Local',
        source: 'pexels',
        videoFiles: [{
          quality: 'hd',
          width: 1920,
          height: 1080,
          link: '/assets/broll/wellness.mp4',
          fileType: 'video/mp4'
        }]
      }
    };

    return category && fallbacks[category] ? [fallbacks[category]] : [];
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}
