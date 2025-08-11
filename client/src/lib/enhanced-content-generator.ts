import { HfInference } from '@huggingface/inference';

interface VideoConfig {
  productName: string;
  productDescription: string;
  healthConcern: string;
  benefits: string[];
  duration: number;
  style: string;
}

interface EnhancedVideoContent {
  problemStatement: string;
  productIntroduction: string;
  benefitsDescription: string;
  howItWorks: string;
  callToAction: string;
  enhancedBenefits: string[];
  medicalTerminology: string[];
  voiceoverScript: string;
  sceneNarratives: {
    problemHook: string;
    solutionIntro: string;
    benefitsShow: string;
    processExplain: string;
    actionCall: string;
  };
}

export class EnhancedContentGenerator {
  private hf: HfInference | null = null;
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
        const apiToken = config.huggingface?.apiToken;
        if (apiToken) {
          this.hf = new HfInference(apiToken);
          console.log('Hugging Face API credentials loaded successfully');
        } else {
          console.warn('Hugging Face API token not found in config - using templates');
        }
        this.configLoaded = true;
      } else {
        console.warn(`API config request failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.warn('Failed to load Hugging Face API configuration:', error);
    }
  }

  async generateEnhancedContent(config: VideoConfig): Promise<EnhancedVideoContent> {
    console.log('Generating enhanced professional content with APIs...');
    
    // Ensure config is loaded before API calls
    await this.loadConfig();
    
    try {
      // Generate rich professional content using Hugging Face
      const contentPrompt = this.buildContentPrompt(config);
      const generatedContent = await this.generateWithHuggingFace(contentPrompt);
      
      // Parse and structure the generated content
      const structuredContent = this.parseGeneratedContent(generatedContent, config);
      
      // Generate voiceover script
      const voiceoverScript = await this.generateVoiceoverScript(structuredContent, config);
      
      return {
        ...structuredContent,
        voiceoverScript,
        sceneNarratives: this.createSceneNarratives(structuredContent)
      };
      
    } catch (error) {
      console.warn('API content generation failed, using professional templates:', error);
      return this.generateProfessionalTemplateContent(config);
    }
  }

  private buildContentPrompt(config: VideoConfig): string {
    return `Create professional pharmaceutical marketing content for ${config.productName}.

Product: ${config.productName}
Health Concern: ${config.healthConcern}
Description: ${config.productDescription}
Benefits: ${config.benefits.join(', ')}

Generate:
1. Compelling problem statement that creates urgency
2. Professional product introduction with authority
3. Scientific benefit descriptions using medical terminology
4. Mechanism of action explanation
5. Strong call-to-action with professional urgency
6. 5 enhanced benefit statements with clinical language
7. Medical terminology list (bioavailability, therapeutic efficacy, etc.)

Style: Professional pharmaceutical commercial, authoritative yet accessible, FDA-compliant language.`;
  }

  private async generateWithHuggingFace(prompt: string): Promise<string> {
    if (!this.hf) {
      throw new Error('Hugging Face API not available');
    }
    
    try {
      console.log('Generating enhanced content with Hugging Face API...');
      
      // Use a more reliable text generation model
      const response = await this.hf.textGeneration({
        model: 'meta-llama/Llama-2-7b-chat-hf',
        inputs: prompt,
        parameters: {
          max_new_tokens: 400,
          temperature: 0.7,
          top_p: 0.9,
          do_sample: true,
          return_full_text: false
        }
      });
      
      return response.generated_text || '';
    } catch (error) {
      console.error('Hugging Face API error:', error);
      throw error;
    }
  }

  private parseGeneratedContent(content: string, config: VideoConfig): Omit<EnhancedVideoContent, 'voiceoverScript' | 'sceneNarratives'> {
    // Enhanced parsing logic for AI-generated content
    const lines = content.split('\n').filter(line => line.trim());
    
    return {
      problemStatement: this.extractSection(lines, 'problem') || `Millions struggle with ${config.healthConcern} without effective solutions`,
      productIntroduction: this.extractSection(lines, 'introduction') || `Introducing ${config.productName} - breakthrough science for ${config.healthConcern}`,
      benefitsDescription: this.extractSection(lines, 'benefits') || `Experience the transformative power of ${config.productName}: ${config.benefits.join(', ')}`,
      howItWorks: this.extractSection(lines, 'mechanism') || `${config.productName} uses advanced bioactive compounds to target root causes`,
      callToAction: this.extractSection(lines, 'action') || `Order ${config.productName} now - limited time professional discount`,
      enhancedBenefits: this.generateEnhancedBenefits(config.benefits),
      medicalTerminology: [
        'bioavailability', 'therapeutic efficacy', 'clinical validation',
        'pharmacokinetics', 'molecular targeting', 'therapeutic compounds',
        'clinical studies', 'bioactive ingredients', 'systemic absorption'
      ]
    };
  }

  private extractSection(lines: string[], keyword: string): string | null {
    const sectionLine = lines.find(line => 
      line.toLowerCase().includes(keyword) && line.length > 20
    );
    return sectionLine || null;
  }

  private generateEnhancedBenefits(benefits: string[]): string[] {
    const clinicalPrefixes = [
      'Clinically proven to',
      'Studies show',
      'Research indicates',
      'Clinical trials demonstrate',
      'Documented to'
    ];
    
    return benefits.map((benefit, index) => {
      const prefix = clinicalPrefixes[index % clinicalPrefixes.length];
      return `${prefix} ${benefit.toLowerCase()}`;
    });
  }

  private async generateVoiceoverScript(content: Omit<EnhancedVideoContent, 'voiceoverScript' | 'sceneNarratives'>, config: VideoConfig): Promise<string> {
    const script = `
[Scene 1 - 6 seconds]
${content.problemStatement}

[Scene 2 - 8 seconds] 
${content.productIntroduction}. Backed by clinical research and trusted by healthcare professionals.

[Scene 3 - 8 seconds]
${content.benefitsDescription}. Each ingredient is scientifically validated for maximum therapeutic efficacy.

[Scene 4 - 4 seconds]
${content.howItWorks} with proven bioavailability and absorption.

[Scene 5 - 4 seconds]
${content.callToAction}. Your health deserves the best.
`;

    return script.trim();
  }

  private createSceneNarratives(content: Omit<EnhancedVideoContent, 'voiceoverScript' | 'sceneNarratives'>) {
    return {
      problemHook: content.problemStatement,
      solutionIntro: content.productIntroduction,
      benefitsShow: content.benefitsDescription,
      processExplain: content.howItWorks,
      actionCall: content.callToAction
    };
  }

  private generateProfessionalTemplateContent(config: VideoConfig): EnhancedVideoContent {
    const enhancedBenefits = this.generateEnhancedBenefits(config.benefits);
    
    const content = {
      problemStatement: `Traditional treatments for ${config.healthConcern} often fall short of expectations`,
      productIntroduction: `Advanced ${config.productName} delivers clinically-proven results for ${config.healthConcern}`,
      benefitsDescription: `Experience the transformative power of ${config.productName}: ${config.benefits.join(', ')}`,
      howItWorks: `Multi-pathway approach addresses ${config.healthConcern} at the molecular level`,
      callToAction: `Get ${config.productName} today - your health deserves the best`,
      enhancedBenefits,
      medicalTerminology: [
        'bioavailability', 'therapeutic', 'clinical efficacy',
        'pharmacokinetics', 'therapeutic compounds', 'clinical validation',
        'molecular targeting'
      ]
    };

    return {
      ...content,
      voiceoverScript: this.generateVoiceoverScript(content, config),
      sceneNarratives: this.createSceneNarratives(content)
    } as EnhancedVideoContent;
  }
}