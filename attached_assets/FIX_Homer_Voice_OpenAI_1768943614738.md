# FIX: Homer Voice - Switch from PiAPI to OpenAI TTS

## Problem
Homer's voice is not working because `piapiTTSService` times out. We need to switch to OpenAI TTS which is fast and reliable.

## Prerequisites
- `OPENAI_API_KEY` must be set in Replit Secrets/Environment Variables

---

## Step 1: Create OpenAI TTS Service

**Create NEW file:** `server/services/openai-tts-service.ts`

```typescript
import OpenAI from 'openai';

interface TTSResult {
  success: boolean;
  audioBase64?: string;
  error?: string;
  voice?: string;
}

class OpenAITTSService {
  private client: OpenAI | null = null;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      console.log('[OpenAI TTS] Service initialized');
    } else {
      console.warn('[OpenAI TTS] OPENAI_API_KEY not set - TTS unavailable');
    }
  }

  isAvailable(): boolean {
    return !!this.client;
  }

  /**
   * Prepare text for TTS - clean up formatting that doesn't translate to speech
   */
  private prepareTextForSpeech(text: string): string {
    return text
      // Remove markdown formatting
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      // Convert currency for better pronunciation
      .replace(/\$(\d{1,3}),(\d{3}),(\d{3})/g, '$1$2$3 dollars')
      .replace(/\$(\d{1,3}),(\d{3})/g, '$1$2 dollars')
      .replace(/\$(\d+)\.(\d{2})/g, '$1 dollars and $2 cents')
      .replace(/\$(\d+)/g, '$1 dollars')
      // Improve number pronunciation
      .replace(/(\d+)%/g, '$1 percent')
      // Clean up bullet points for speech
      .replace(/^[-•]\s*/gm, '')
      .replace(/^\d+\.\s*/gm, '')
      // Limit length (OpenAI max is 4096)
      .substring(0, 4000);
  }

  async generateSpeech(text: string): Promise<TTSResult> {
    if (!this.client) {
      return { success: false, error: 'OpenAI TTS not configured' };
    }

    const startTime = Date.now();
    const preparedText = this.prepareTextForSpeech(text);
    const voice = 'onyx'; // Deep, authoritative voice for executive assistant

    console.log(`[OpenAI TTS] Generating speech, ${preparedText.length} chars`);

    try {
      const mp3 = await this.client.audio.speech.create({
        model: 'tts-1-hd',
        voice: voice,
        input: preparedText,
        speed: 1.0,
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());
      const base64Audio = buffer.toString('base64');
      
      const duration = Date.now() - startTime;
      console.log(`[OpenAI TTS] Generated in ${duration}ms, ${buffer.length} bytes`);

      return {
        success: true,
        audioBase64: `data:audio/mpeg;base64,${base64Audio}`,
        voice,
      };

    } catch (error: any) {
      console.error('[OpenAI TTS] Generation failed:', error.message);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }
}

export const openAITTSService = new OpenAITTSService();
```

---

## Step 2: Update Homer AI Service

**Edit file:** `server/services/homer-ai-service.ts`

### Change 1: Replace the import

**Find this line:**
```typescript
import { piapiTTSService } from './piapi-tts-service';
```

**Replace with:**
```typescript
import { openAITTSService } from './openai-tts-service';
```

### Change 2: Replace the generateVoiceResponse method

**Find the entire `generateVoiceResponse` method and replace it with:**

```typescript
async generateVoiceResponse(text: string): Promise<string | null> {
  console.log('[Homer] Starting voice generation, text length:', text.length);
  
  // Primary: OpenAI TTS (best quality, fast, reliable)
  if (openAITTSService.isAvailable()) {
    console.log('[Homer] Using OpenAI TTS');
    const result = await openAITTSService.generateSpeech(text);
    
    if (result.success && result.audioBase64) {
      console.log('[Homer] OpenAI TTS succeeded');
      return result.audioBase64;
    }
    
    console.warn('[Homer] OpenAI TTS failed:', result.error);
  }
  
  // Fallback: ElevenLabs (if configured)
  const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
  
  if (!elevenLabsKey) {
    console.warn('[Homer] No server TTS available - client will use browser fallback');
    return null;
  }

  console.log('[Homer] Falling back to ElevenLabs');
  
  const HOMER_VOICE_ID = 'pNInz6obpgDQGcFmaJgB';

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${HOMER_VOICE_ID}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': elevenLabsKey,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.6,
          similarity_boost: 0.8,
          style: 0.2,
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Homer] ElevenLabs error:', response.status, errorText);
      return null;
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    console.log('[Homer] ElevenLabs voice generated successfully');
    return `data:audio/mpeg;base64,${base64Audio}`;

  } catch (error) {
    console.error('[Homer] ElevenLabs voice generation error:', error);
    return null;
  }
}
```

---

## Step 3: Update Status Route (Optional but Recommended)

**Edit file:** `server/routes/homer-routes.ts`

**Find the `/status` route and update it:**

```typescript
router.get('/status', isAuthenticated, requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  const openAIAvailable = !!process.env.OPENAI_API_KEY;
  const elevenLabsAvailable = !!process.env.ELEVENLABS_API_KEY;
  
  // Determine primary voice provider
  let voiceProvider = 'Browser (Web Speech API)';
  if (openAIAvailable) {
    voiceProvider = 'OpenAI TTS HD';
  } else if (elevenLabsAvailable) {
    voiceProvider = 'ElevenLabs';
  }
  
  console.log('[Homer Status] Voice provider:', voiceProvider);
  
  res.json({
    available: homerAIService.isAvailable(),
    voiceEnabled: true,
    voiceProvider,
    aiModel: 'Claude Sonnet 4',
  });
});
```

---

## Verification Checklist

1. ✅ `OPENAI_API_KEY` is set in Replit Secrets
2. ✅ New file `server/services/openai-tts-service.ts` created
3. ✅ Import changed from `piapiTTSService` to `openAITTSService`
4. ✅ `generateVoiceResponse` method updated
5. ✅ Server restarted

## Test

1. Open Homer assistant
2. Make sure voice is NOT muted (speaker icon should show sound waves)
3. Ask: "How did we do last month?"
4. You should hear Homer respond with a professional male voice

## Expected Console Logs

```
[OpenAI TTS] Service initialized
[Homer] Starting voice generation, text length: 347
[Homer] Using OpenAI TTS
[OpenAI TTS] Generating speech, 340 chars
[OpenAI TTS] Generated in 1823ms, 48276 bytes
[Homer] OpenAI TTS succeeded
```

If you see `[OpenAI TTS] OPENAI_API_KEY not set`, the API key is missing from Secrets.
