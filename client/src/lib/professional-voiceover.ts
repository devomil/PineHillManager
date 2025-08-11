import { ElevenLabsApi } from '@elevenlabs/elevenlabs-js';

interface VoiceoverOptions {
  text: string;
  voice: string;
  model: string;
  stability: number;
  similarityBoost: number;
  style: number;
}

interface VoiceOption {
  id: string;
  name: string;
  description: string;
  accent: string;
  age: string;
  gender: string;
  useCases: string[];
}

export class ProfessionalVoiceoverService {
  private client: ElevenLabsApi | null = null;
  private apiKey: string | null = null;
  private configLoaded = false;

  constructor() {
    this.loadConfig();
  }

  private async loadConfig(): Promise<void> {
    if (this.configLoaded) return;
    
    try {
      const response = await fetch('/api/config');
      if (response.ok) {
        const config = await response.json();
        this.apiKey = config.elevenlabs?.apiKey || null;
        
        if (this.apiKey) {
          this.client = new ElevenLabsApi({
            apiKey: this.apiKey
          });
          console.log('ElevenLabs API initialized successfully');
        } else {
          console.warn('ElevenLabs API key not found in config - voiceover will use text fallback');
        }
        this.configLoaded = true;
      } else {
        console.warn(`API config request failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.warn('Failed to load ElevenLabs API configuration:', error);
    }
  }

  // Professional voices optimized for pharmaceutical/medical content
  getProfessionalVoices(): VoiceOption[] {
    return [
      {
        id: '21m00Tcm4TlvDq8ikWAM', // Rachel - Professional female
        name: 'Rachel',
        description: 'Professional, authoritative female voice',
        accent: 'American',
        age: 'Middle-aged',
        gender: 'Female',
        useCases: ['Medical narration', 'Professional presentations', 'Healthcare content']
      },
      {
        id: 'AZnzlk1XvdvUeBnXmlld', // Domi - Confident female
        name: 'Domi', 
        description: 'Confident, clear female voice',
        accent: 'American',
        age: 'Young adult',
        gender: 'Female',
        useCases: ['Product demonstrations', 'Educational content', 'Health explanations']
      },
      {
        id: 'EXAVITQu4vr4xnSDxMaL', // Bella - Engaging female
        name: 'Bella',
        description: 'Engaging, trustworthy female voice',
        accent: 'American', 
        age: 'Adult',
        gender: 'Female',
        useCases: ['Healthcare marketing', 'Patient education', 'Wellness content']
      },
      {
        id: 'ErXwobaYiN019PkySvjV', // Antoni - Professional male
        name: 'Antoni',
        description: 'Professional, authoritative male voice',
        accent: 'American',
        age: 'Adult',
        gender: 'Male',
        useCases: ['Medical presentations', 'Pharmaceutical content', 'Clinical explanations']
      },
      {
        id: 'VR6AewLTigWG4xSOukaG', // Arnold - Mature male
        name: 'Arnold',
        description: 'Mature, trustworthy male voice',
        accent: 'American',
        age: 'Middle-aged',
        gender: 'Male',
        useCases: ['Medical authority', 'Healthcare leadership', 'Professional guidance']
      }
    ];
  }

  async generateProfessionalVoiceover(
    script: string, 
    voiceId: string = '21m00Tcm4TlvDq8ikWAM', // Default to Rachel
    options: Partial<VoiceoverOptions> = {}
  ): Promise<ArrayBuffer | null> {
    
    // Ensure config is loaded before API calls
    await this.loadConfig();
    
    if (!this.client || !this.apiKey) {
      console.warn('ElevenLabs API not available - voiceover disabled');
      return null;
    }

    try {
      console.log('Generating professional voiceover with ElevenLabs...');
      
      const voiceSettings = {
        stability: options.stability || 0.75,  // Higher stability for professional tone
        similarity_boost: options.similarityBoost || 0.85, // Higher similarity for consistency
        style: options.style || 0.2,  // Lower style variation for professional content
        use_speaker_boost: true
      };

      const audioStream = await this.client.generate({
        voice: voiceId,
        text: this.optimizeScriptForVoiceover(script),
        model_id: options.model || "eleven_multilingual_v2",
        voice_settings: voiceSettings
      });

      // Convert stream to ArrayBuffer
      const chunks: Uint8Array[] = [];
      const reader = audioStream.getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      // Combine chunks into single ArrayBuffer
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }

      console.log('Professional voiceover generated successfully');
      return result.buffer;

    } catch (error) {
      console.error('ElevenLabs voiceover generation failed:', error);
      return null;
    }
  }

  private optimizeScriptForVoiceover(script: string): string {
    return script
      // Add natural pauses for scene transitions
      .replace(/\[Scene \d+[^\]]*\]/g, '')
      // Add breathing pauses after key phrases
      .replace(/\. /g, '. <break time="0.5s"/> ')
      // Emphasize product names
      .replace(/\b([A-Z][a-z]+ Extract|[A-Z][a-z]+ Plus)\b/g, '<emphasis level="moderate">$1</emphasis>')
      // Add slight pause before call-to-action
      .replace(/Order|Call|Get|Visit/g, '<break time="0.3s"/>$&')
      // Clean up extra spaces
      .replace(/\s+/g, ' ')
      .trim();
  }

  async testVoiceGeneration(voiceId: string): Promise<boolean> {
    if (!this.client) return false;
    
    try {
      const testText = "This is a test of professional medical voiceover quality.";
      const audioBuffer = await this.generateProfessionalVoiceover(testText, voiceId);
      return audioBuffer !== null;
    } catch (error) {
      console.error('Voice test failed:', error);
      return false;
    }
  }

  createAudioElement(audioBuffer: ArrayBuffer): HTMLAudioElement {
    const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
    const audioUrl = URL.createObjectURL(blob);
    
    const audio = new Audio();
    audio.src = audioUrl;
    audio.preload = 'auto';
    
    // Clean up URL when audio ends
    audio.addEventListener('ended', () => {
      URL.revokeObjectURL(audioUrl);
    });
    
    return audio;
  }

  getRecommendedVoiceForHealthConcern(healthConcern: string): VoiceOption {
    const concern = healthConcern.toLowerCase();
    const voices = this.getProfessionalVoices();
    
    // Female voices often preferred for women's health
    if (concern.includes('menopause') || concern.includes('hormone') || concern.includes('women')) {
      return voices.find(v => v.id === '21m00Tcm4TlvDq8ikWAM') || voices[0]; // Rachel
    }
    
    // Authoritative male voice for general medical authority
    if (concern.includes('heart') || concern.includes('cardiovascular') || concern.includes('clinical')) {
      return voices.find(v => v.id === 'ErXwobaYiN019PkySvjV') || voices[3]; // Antoni
    }
    
    // Trustworthy female voice for general health content
    return voices.find(v => v.id === 'EXAVITQu4vr4xnSDxMaL') || voices[2]; // Bella
  }

  async getUsageInfo(): Promise<{ charactersUsed: number; charactersLimit: number } | null> {
    if (!this.client) return null;
    
    try {
      // Note: ElevenLabs API subscription info would be retrieved here
      // For now, return basic free tier info
      return {
        charactersUsed: 0,
        charactersLimit: 10000 // Free tier limit
      };
    } catch (error) {
      console.error('Failed to get usage info:', error);
      return null;
    }
  }
}