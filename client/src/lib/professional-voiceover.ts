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

interface VoiceoverResult {
  blob: Blob | null;
  url: string | null;
  duration: number;
  isWebSpeech?: boolean;
}

export class ProfessionalVoiceoverService {
  private apiKey: string | null = null;
  private configLoaded = false;
  private baseUrl = 'https://api.elevenlabs.io/v1';
  private isAvailable = false;

  constructor() {
    this.loadConfig();
  }

  private async loadConfig(): Promise<void> {
    if (this.configLoaded) return;
    
    try {
      const response = await fetch('/api/config');
      if (response.ok) {
        const config = await response.json();
        console.log('API config received:', { hasElevenLabs: !!config.elevenlabs, hasApiKey: !!config.elevenlabs?.apiKey });
        this.apiKey = config.elevenlabs?.apiKey || null;
        
        if (this.apiKey) {
          try {
            // Test API connection instead of using constructor
            await this.testConnection();
            this.isAvailable = true;
            console.log('ElevenLabs API initialized successfully');
          } catch (initError) {
            console.error('ElevenLabs API initialization failed:', initError);
            this.isAvailable = false;
          }
        } else {
          console.warn('ElevenLabs API key not found in config - voiceover will use Web Speech fallback');
          this.isAvailable = false;
        }
        this.configLoaded = true;
      } else {
        console.warn(`API config request failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.warn('Failed to load ElevenLabs API configuration:', error);
    }
  }

  // Test API connection by fetching voices
  private async testConnection(): Promise<void> {
    if (!this.apiKey) throw new Error('No API key available');
    
    const response = await fetch(`${this.baseUrl}/voices`, {
      headers: {
        'xi-api-key': this.apiKey
      }
    });
    
    if (!response.ok) {
      throw new Error(`ElevenLabs API test failed: ${response.status}`);
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
  ): Promise<VoiceoverResult> {
    
    // Debug logging to capture what's being passed
    console.log('generateProfessionalVoiceover called with script type:', typeof script);
    console.log('generateProfessionalVoiceover script value:', script);
    
    // Ensure config is loaded before API calls
    await this.loadConfig();
    
    if (!this.isAvailable) {
      console.warn('ElevenLabs API not available - using Web Speech fallback');
      return this.generateWebSpeechFallback(script);
    }

    try {
      console.log('Generating professional voiceover with ElevenLabs...');
      
      const cleanScript = this.optimizeScriptForVoiceover(script);
      
      if (!cleanScript || cleanScript.trim().length === 0) {
        throw new Error('Empty or invalid script provided');
      }

      const requestBody = {
        text: cleanScript,
        model_id: options.model || "eleven_turbo_v2",
        voice_settings: {
          stability: options.stability || 0.71,
          similarity_boost: options.similarityBoost || 0.5,
          style: options.style || 0.0,
          use_speaker_boost: true
        }
      };

      console.log('Sending ElevenLabs request with:', { voiceId, textLength: cleanScript.length });
      
      const response = await fetch(`${this.baseUrl}/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey!
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('ElevenLabs API error response:', errorText);
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
      }

      const audioBlob = await response.blob();
      
      if (!audioBlob || audioBlob.size === 0) {
        throw new Error('Received empty audio response from ElevenLabs');
      }
      
      const audioUrl = URL.createObjectURL(audioBlob);

      console.log('Professional voiceover generated successfully');
      return {
        blob: audioBlob,
        url: audioUrl,
        duration: this.estimateAudioDuration(cleanScript)
      };

    } catch (error) {
      console.error('ElevenLabs voiceover generation failed:', error);
      return this.generateWebSpeechFallback(script);
    }
  }

  // Fallback to Web Speech API when ElevenLabs fails
  private generateWebSpeechFallback(text: string): Promise<VoiceoverResult> {
    return new Promise((resolve) => {
      // Ensure text is valid
      const cleanText = typeof text === 'string' ? text : 'Content ready for your review';
      
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      // Find a professional-sounding voice
      const voices = speechSynthesis.getVoices();
      const professionalVoice = voices.find(voice => 
        voice.name.includes('Google') || 
        voice.name.includes('Microsoft') ||
        voice.lang === 'en-US'
      );
      
      if (professionalVoice) {
        utterance.voice = professionalVoice;
      }

      utterance.onend = () => {
        resolve({
          blob: null,
          url: null,
          duration: this.estimateAudioDuration(cleanText),
          isWebSpeech: true
        });
      };

      utterance.onerror = (error) => {
        console.error('Web Speech API error:', error);
        resolve({
          blob: null,
          url: null,
          duration: 5,
          isWebSpeech: true
        });
      };

      speechSynthesis.speak(utterance);
    });
  }

  private estimateAudioDuration(text: string): number {
    // Ensure text is a string and handle edge cases
    if (!text || typeof text !== 'string') {
      return 5; // Default 5 seconds for invalid input
    }
    
    // Estimate ~150 words per minute for professional speech
    const wordsPerMinute = 150;
    const wordCount = text.split(' ').filter(word => word.length > 0).length;
    return Math.ceil((wordCount / wordsPerMinute) * 60);
  }

  private optimizeScriptForVoiceover(script: string): string {
    // Debug logging to identify when objects are passed
    console.log('optimizeScriptForVoiceover called with:', typeof script, script);
    
    if (typeof script !== 'string') {
      console.error('ERROR: Non-string passed to optimizeScriptForVoiceover:', script);
      // Convert object to string if possible
      if (script && typeof script === 'object') {
        if ((script as any).toString && typeof (script as any).toString === 'function') {
          script = (script as any).toString();
        } else {
          script = JSON.stringify(script);
        }
      } else {
        script = String(script || 'Content ready for your review');
      }
    }
    
    return script
      // Remove scene markers
      .replace(/\[Scene \d+[^\]]*\]/g, '')
      // Clean up special characters that might cause issues
      .replace(/[^\w\s.,!?-]/g, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  async testVoiceGeneration(voiceId: string): Promise<boolean> {
    if (!this.isAvailable) return false;
    
    try {
      const testText = "This is a test of professional medical voiceover quality.";
      const result = await this.generateProfessionalVoiceover(testText, voiceId);
      return result.blob !== null;
    } catch (error) {
      console.error('Voice test failed:', error);
      return false;
    }
  }

  createAudioElement(voiceoverResult: VoiceoverResult): HTMLAudioElement | null {
    if (!voiceoverResult.url) return null;
    
    const audio = new Audio();
    audio.src = voiceoverResult.url;
    audio.preload = 'auto';
    
    // Clean up URL when audio ends
    audio.addEventListener('ended', () => {
      if (voiceoverResult.url) {
        URL.revokeObjectURL(voiceoverResult.url);
      }
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
    if (!this.isAvailable) return null;
    
    try {
      // Note: ElevenLabs API subscription info would be retrieved here via direct API call
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