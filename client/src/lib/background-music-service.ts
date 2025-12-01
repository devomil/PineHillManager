// Background Music Service
// Integrates with Pixabay Music API for royalty-free background music

export interface MusicTrack {
  id: number;
  name: string;
  duration: number; // in seconds
  tags: string[];
  previewUrl: string;
  downloadUrl: string;
  artist: string;
  genre: string;
}

export interface MusicConfig {
  mood: 'corporate' | 'uplifting' | 'calm' | 'energetic' | 'medical' | 'inspirational';
  duration: number; // Video duration in seconds
  volume: number; // 0-1 (default 0.25 for 25% volume)
  fadeIn: number; // Fade in duration in seconds
  fadeOut: number; // Fade out duration in seconds
}

export class BackgroundMusicService {
  private apiKey: string = '';
  private readonly PIXABAY_MUSIC_API = 'https://pixabay.com/api/';
  private audioContext: AudioContext | null = null;
  private cache: Map<string, MusicTrack[]> = new Map();

  constructor() {
    // Initialize Audio Context for mixing
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  /**
   * Set the Pixabay API key
   */
  setApiKey(key: string) {
    this.apiKey = key;
  }

  /**
   * Check if music service is available
   */
  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) {
      // Try to get from server config
      try {
        const response = await fetch('/api/config');
        const config = await response.json();
        if (config.pixabayApiKey) {
          this.apiKey = config.pixabayApiKey;
          return true;
        }
      } catch (error) {
        console.error('Failed to fetch API config:', error);
      }
      return false;
    }
    return true;
  }

  /**
   * Search for music tracks by mood/genre using server-side proxy
   */
  async searchMusic(mood: MusicConfig['mood'], minDuration: number = 30): Promise<MusicTrack[]> {
    const cacheKey = `${mood}-${minDuration}`;

    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Map mood to Pixabay search terms
    const searchTerms: Record<MusicConfig['mood'], string> = {
      corporate: 'corporate background professional business',
      uplifting: 'uplifting motivational inspiring positive',
      calm: 'calm relaxing peaceful meditation wellness',
      energetic: 'energetic upbeat dynamic exciting',
      medical: 'medical calm professional healthcare',
      inspirational: 'inspirational emotional hopeful'
    };

    const query = searchTerms[mood];

    try {
      // Use server-side proxy to search Pixabay music
      const url = `/api/pixabay/music/search?query=${encodeURIComponent(query)}&per_page=20`;
      console.log(`[BackgroundMusic] Searching for ${mood} music via server proxy...`);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Music search error: ${response.statusText}`);
      }

      const data = await response.json();

      // Parse response - Pixabay returns hits array
      const tracks: MusicTrack[] = (data.hits || [])
        .filter((hit: any) => hit.duration >= minDuration)
        .map((hit: any) => ({
          id: hit.id,
          name: hit.name || hit.tags || 'Background Music',
          duration: hit.duration || 60,
          tags: hit.tags?.split(',').map((t: string) => t.trim()) || [],
          previewUrl: hit.previewURL || hit.videos?.small?.url || '',
          downloadUrl: hit.pageURL || hit.previewURL || '',
          artist: hit.user || 'Unknown',
          genre: mood
        }));

      console.log(`[BackgroundMusic] Found ${tracks.length} tracks for mood: ${mood}`);
      
      // Cache results
      this.cache.set(cacheKey, tracks);

      return tracks;
    } catch (error) {
      console.error('Failed to fetch music from server:', error);

      // Return fallback/demo tracks
      return this.getFallbackTracks(mood, minDuration);
    }
  }

  /**
   * Get fallback tracks when API is unavailable
   * Note: Pixabay does not have a public music API - the feature is limited.
   * Returns empty array as no local music files are bundled.
   * To enable background music, integrate with Freesound or Jamendo API.
   */
  private getFallbackTracks(mood: MusicConfig['mood'], minDuration: number): MusicTrack[] {
    console.log(`[BackgroundMusic] No music API available for mood: ${mood}. Background music feature requires music files.`);
    // Return empty array - video will proceed without background music
    // For future: integrate with Freesound API (https://freesound.org/docs/api/)
    // or Jamendo API (https://developer.jamendo.com/)
    return [];
  }

  /**
   * Download and prepare music track
   */
  async downloadTrack(track: MusicTrack): Promise<Blob> {
    try {
      const response = await fetch(track.downloadUrl);
      if (!response.ok) {
        throw new Error(`Failed to download track: ${response.statusText}`);
      }
      return await response.blob();
    } catch (error) {
      console.error('Failed to download music track:', error);
      throw error;
    }
  }

  /**
   * Mix background music with voiceover audio
   * - Reduces background music volume
   * - Applies fade in/out
   * - Loops music if needed
   */
  async mixAudioTracks(
    musicBlob: Blob,
    voiceoverBlob: Blob | null,
    config: MusicConfig
  ): Promise<Blob> {
    if (!this.audioContext) {
      throw new Error('Audio context not available');
    }

    try {
      // Load music audio buffer
      const musicArrayBuffer = await musicBlob.arrayBuffer();
      const musicBuffer = await this.audioContext.decodeAudioData(musicArrayBuffer);

      // Load voiceover audio buffer (if exists)
      let voiceoverBuffer: AudioBuffer | null = null;
      if (voiceoverBlob) {
        const voiceoverArrayBuffer = await voiceoverBlob.arrayBuffer();
        voiceoverBuffer = await this.audioContext.decodeAudioData(voiceoverArrayBuffer);
      }

      // Determine output duration
      const outputDuration = Math.max(
        config.duration,
        voiceoverBuffer?.duration || 0,
        musicBuffer.duration
      );

      // Create offline audio context for rendering
      const offlineContext = new OfflineAudioContext(
        2, // stereo
        this.audioContext.sampleRate * outputDuration,
        this.audioContext.sampleRate
      );

      // Create and configure music source
      const musicSource = offlineContext.createBufferSource();
      musicSource.buffer = musicBuffer;
      musicSource.loop = true; // Loop if music is shorter than video

      // Create gain node for music volume
      const musicGain = offlineContext.createGain();
      musicGain.gain.value = 0;

      // Apply fade in
      musicGain.gain.linearRampToValueAtTime(
        config.volume,
        config.fadeIn
      );

      // Apply fade out
      const fadeOutStart = outputDuration - config.fadeOut;
      musicGain.gain.setValueAtTime(config.volume, fadeOutStart);
      musicGain.gain.linearRampToValueAtTime(0, outputDuration);

      // Connect music: source -> gain -> destination
      musicSource.connect(musicGain);
      musicGain.connect(offlineContext.destination);

      // Add voiceover if exists
      if (voiceoverBuffer) {
        const voiceoverSource = offlineContext.createBufferSource();
        voiceoverSource.buffer = voiceoverBuffer;

        // Voiceover at full volume
        const voiceoverGain = offlineContext.createGain();
        voiceoverGain.gain.value = 1.0;

        voiceoverSource.connect(voiceoverGain);
        voiceoverGain.connect(offlineContext.destination);

        voiceoverSource.start(0);
      }

      // Start music
      musicSource.start(0);

      // Render mixed audio
      const renderedBuffer = await offlineContext.startRendering();

      // Convert to WAV blob
      const wavBlob = await this.audioBufferToWav(renderedBuffer);

      return wavBlob;
    } catch (error) {
      console.error('Failed to mix audio tracks:', error);
      throw error;
    }
  }

  /**
   * Convert AudioBuffer to WAV Blob
   */
  private async audioBufferToWav(buffer: AudioBuffer): Promise<Blob> {
    const numberOfChannels = buffer.numberOfChannels;
    const length = buffer.length * numberOfChannels * 2;
    const arrayBuffer = new ArrayBuffer(44 + length);
    const view = new DataView(arrayBuffer);

    // Write WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // PCM format
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length, true);

    // Write audio data
    const channels = [];
    for (let i = 0; i < numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, channels[channel][i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  /**
   * Get recommended music for video style/topic
   */
  getRecommendedMood(videoStyle: string, healthConcern?: string): MusicConfig['mood'] {
    // Map video styles to music moods
    const styleToMood: Record<string, MusicConfig['mood']> = {
      'professional': 'corporate',
      'trustworthy': 'corporate',
      'pharmaceutical': 'medical',
      'medical': 'medical',
      'clinical': 'medical',
      'whiteboard': 'uplifting',
      'animated': 'energetic',
      'testimonial': 'inspirational',
      'educational': 'calm'
    };

    // Check health concern for mood hints
    if (healthConcern) {
      const concern = healthConcern.toLowerCase();
      if (concern.includes('weight') || concern.includes('energy')) {
        return 'energetic';
      }
      if (concern.includes('sleep') || concern.includes('stress') || concern.includes('anxiety')) {
        return 'calm';
      }
      if (concern.includes('pain') || concern.includes('joint')) {
        return 'medical';
      }
    }

    return styleToMood[videoStyle.toLowerCase()] || 'corporate';
  }

  /**
   * Create default music configuration
   */
  createDefaultConfig(videoDuration: number, videoStyle: string = 'professional'): MusicConfig {
    return {
      mood: this.getRecommendedMood(videoStyle),
      duration: videoDuration,
      volume: 0.25, // 25% volume for background
      fadeIn: 2, // 2 second fade in
      fadeOut: 3 // 3 second fade out
    };
  }
}
