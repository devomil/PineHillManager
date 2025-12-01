// Sound Effects Service
// Manages sound effects for video transitions, emphasis, and interactions

export interface SoundEffect {
  id: string;
  name: string;
  category: 'transition' | 'emphasis' | 'interaction' | 'ambient';
  url: string;
  duration: number;
  volume: number; // Default volume 0-1
}

export interface SoundEffectTiming {
  effectId: string;
  time: number; // When to play in seconds
  volume?: number; // Override default volume
}

export class SoundEffectsService {
  private effects: Map<string, SoundEffect> = new Map();
  private audioContext: AudioContext | null = null;
  private loadedBuffers: Map<string, AudioBuffer> = new Map();

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    this.initializeDefaultEffects();
  }

  /**
   * Initialize default sound effects library
   */
  private initializeDefaultEffects() {
    const defaultEffects: SoundEffect[] = [
      // Transition sounds
      {
        id: 'whoosh-1',
        name: 'Subtle Whoosh',
        category: 'transition',
        url: '/assets/sounds/whoosh-1.mp3',
        duration: 0.5,
        volume: 0.3
      },
      {
        id: 'whoosh-2',
        name: 'Dynamic Whoosh',
        category: 'transition',
        url: '/assets/sounds/whoosh-2.mp3',
        duration: 0.8,
        volume: 0.4
      },
      {
        id: 'slide-in',
        name: 'Slide In',
        category: 'transition',
        url: '/assets/sounds/slide-in.mp3',
        duration: 0.4,
        volume: 0.25
      },
      {
        id: 'fade-transition',
        name: 'Fade Transition',
        category: 'transition',
        url: '/assets/sounds/fade.mp3',
        duration: 0.6,
        volume: 0.2
      },

      // Emphasis sounds
      {
        id: 'pop-1',
        name: 'Pop Accent',
        category: 'emphasis',
        url: '/assets/sounds/pop-1.mp3',
        duration: 0.3,
        volume: 0.35
      },
      {
        id: 'ping',
        name: 'Notification Ping',
        category: 'emphasis',
        url: '/assets/sounds/ping.mp3',
        duration: 0.4,
        volume: 0.4
      },
      {
        id: 'chime',
        name: 'Success Chime',
        category: 'emphasis',
        url: '/assets/sounds/chime.mp3',
        duration: 0.5,
        volume: 0.3
      },
      {
        id: 'sparkle',
        name: 'Sparkle Effect',
        category: 'emphasis',
        url: '/assets/sounds/sparkle.mp3',
        duration: 0.6,
        volume: 0.25
      },

      // Interaction sounds
      {
        id: 'button-click',
        name: 'Button Click',
        category: 'interaction',
        url: '/assets/sounds/click.mp3',
        duration: 0.2,
        volume: 0.4
      },
      {
        id: 'notification',
        name: 'Notification Alert',
        category: 'interaction',
        url: '/assets/sounds/notification.mp3',
        duration: 0.5,
        volume: 0.45
      },
      {
        id: 'success',
        name: 'Success Sound',
        category: 'interaction',
        url: '/assets/sounds/success.mp3',
        duration: 0.8,
        volume: 0.35
      },

      // Ambient sounds
      {
        id: 'ambient-medical',
        name: 'Medical Ambience',
        category: 'ambient',
        url: '/assets/sounds/ambient-medical.mp3',
        duration: 2.0,
        volume: 0.15
      },
      {
        id: 'ambient-corporate',
        name: 'Corporate Ambience',
        category: 'ambient',
        url: '/assets/sounds/ambient-corporate.mp3',
        duration: 2.0,
        volume: 0.15
      }
    ];

    defaultEffects.forEach(effect => {
      this.effects.set(effect.id, effect);
    });
  }

  /**
   * Preload sound effects
   */
  async preloadEffects(effectIds: string[]): Promise<void> {
    if (!this.audioContext) {
      throw new Error('Audio context not available');
    }

    const loadPromises = effectIds.map(async (id) => {
      if (this.loadedBuffers.has(id)) {
        return; // Already loaded
      }

      const effect = this.effects.get(id);
      if (!effect) {
        console.warn(`Sound effect not found: ${id}`);
        return;
      }

      try {
        const response = await fetch(effect.url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
        this.loadedBuffers.set(id, audioBuffer);
      } catch (error) {
        console.error(`Failed to load sound effect ${id}:`, error);
      }
    });

    await Promise.all(loadPromises);
  }

  /**
   * Get sound effect by ID
   */
  getEffect(id: string): SoundEffect | undefined {
    return this.effects.get(id);
  }

  /**
   * Get all effects by category
   */
  getEffectsByCategory(category: SoundEffect['category']): SoundEffect[] {
    return Array.from(this.effects.values()).filter(effect => effect.category === category);
  }

  /**
   * Generate automatic sound effect timing for video sections
   */
  generateAutomaticTiming(
    sections: Array<{ type: string; startTime: number; endTime: number }>,
    videoStyle: string
  ): SoundEffectTiming[] {
    const timings: SoundEffectTiming[] = [];

    sections.forEach((section, index) => {
      const sectionDuration = section.endTime - section.startTime;

      // Add transition sound at section start (except first section)
      if (index > 0) {
        timings.push({
          effectId: this.getTransitionSound(videoStyle),
          time: section.startTime,
          volume: 0.3
        });
      }

      // Add emphasis sounds based on section type
      switch (section.type) {
        case 'hook':
          // Attention-grabbing sound
          timings.push({
            effectId: 'pop-1',
            time: section.startTime + 0.5,
            volume: 0.4
          });
          break;

        case 'problem':
          // Subtle ambient for seriousness
          if (sectionDuration > 3) {
            timings.push({
              effectId: 'ambient-medical',
              time: section.startTime + 1,
              volume: 0.15
            });
          }
          break;

        case 'solution':
          // Multiple emphasis points for key benefits
          const benefitPoints = this.calculateBenefitPoints(section.startTime, section.endTime);
          benefitPoints.forEach(time => {
            timings.push({
              effectId: 'chime',
              time,
              volume: 0.3
            });
          });
          break;

        case 'social_proof':
          // Success sound
          timings.push({
            effectId: 'sparkle',
            time: section.startTime + 1,
            volume: 0.35
          });
          break;

        case 'cta':
          // Strong notification sound for CTA
          timings.push({
            effectId: 'notification',
            time: section.endTime - 2,
            volume: 0.45
          });
          break;
      }
    });

    return timings;
  }

  /**
   * Get appropriate transition sound for video style
   */
  private getTransitionSound(videoStyle: string): string {
    const styleMap: Record<string, string> = {
      'professional': 'whoosh-1',
      'pharmaceutical': 'fade-transition',
      'medical': 'fade-transition',
      'whiteboard': 'slide-in',
      'animated': 'whoosh-2',
      'energetic': 'whoosh-2'
    };

    return styleMap[videoStyle.toLowerCase()] || 'whoosh-1';
  }

  /**
   * Calculate timing points for benefit emphasis
   */
  private calculateBenefitPoints(startTime: number, endTime: number): number[] {
    const duration = endTime - startTime;
    const points: number[] = [];

    // Space out 3-5 emphasis points evenly
    const numPoints = duration < 10 ? 3 : duration < 20 ? 4 : 5;
    const interval = duration / (numPoints + 1);

    for (let i = 1; i <= numPoints; i++) {
      points.push(startTime + interval * i);
    }

    return points;
  }

  /**
   * Mix sound effects into audio timeline
   */
  async mixSoundEffects(
    baseAudioBlob: Blob,
    effectTimings: SoundEffectTiming[],
    duration: number
  ): Promise<Blob> {
    if (!this.audioContext) {
      throw new Error('Audio context not available');
    }

    try {
      // Preload required effects
      const effectIds = [...new Set(effectTimings.map(t => t.effectId))];
      await this.preloadEffects(effectIds);

      // Load base audio
      const baseArrayBuffer = await baseAudioBlob.arrayBuffer();
      const baseBuffer = await this.audioContext.decodeAudioData(baseArrayBuffer);

      // Create offline context for rendering
      const offlineContext = new OfflineAudioContext(
        2, // stereo
        this.audioContext.sampleRate * duration,
        this.audioContext.sampleRate
      );

      // Add base audio
      const baseSource = offlineContext.createBufferSource();
      baseSource.buffer = baseBuffer;
      baseSource.connect(offlineContext.destination);
      baseSource.start(0);

      // Add each sound effect at its timing
      effectTimings.forEach(timing => {
        const effectBuffer = this.loadedBuffers.get(timing.effectId);
        if (!effectBuffer) {
          console.warn(`Effect buffer not loaded: ${timing.effectId}`);
          return;
        }

        const effect = this.effects.get(timing.effectId);
        if (!effect) {
          return;
        }

        const effectSource = offlineContext.createBufferSource();
        effectSource.buffer = effectBuffer;

        // Apply volume
        const gainNode = offlineContext.createGain();
        gainNode.gain.value = timing.volume ?? effect.volume;

        effectSource.connect(gainNode);
        gainNode.connect(offlineContext.destination);

        // Play at specified time
        effectSource.start(timing.time);
      });

      // Render mixed audio
      const renderedBuffer = await offlineContext.startRendering();

      // Convert to WAV blob
      const wavBlob = await this.audioBufferToWav(renderedBuffer);

      return wavBlob;
    } catch (error) {
      console.error('Failed to mix sound effects:', error);
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
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
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
   * Add custom sound effect
   */
  addCustomEffect(effect: SoundEffect): void {
    this.effects.set(effect.id, effect);
  }

  /**
   * Get all available effects
   */
  getAllEffects(): SoundEffect[] {
    return Array.from(this.effects.values());
  }
}
