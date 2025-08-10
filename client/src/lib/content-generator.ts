// Phase 2: Professional Content Generation for Marketing Videos
import { VideoConfig } from './simple-video-generator';

export interface GeneratedContent {
  problemStatement: string;
  productIntroduction: string;
  benefitsDescription: string;
  howItWorks: string;
  callToAction: string;
  enhancedBenefits: string[];
  medicalTerminology: string[];
}

export class ContentGenerator {
  private apiKey: string | null = null;

  constructor() {
    // Check for Hugging Face API key
    this.apiKey = import.meta.env.VITE_HUGGING_FACE_API_KEY || null;
  }

  async generateProfessionalContent(config: VideoConfig): Promise<GeneratedContent> {
    if (!this.apiKey) {
      // Return enhanced template content if no API key
      return this.generateTemplateContent(config);
    }

    try {
      // Use Hugging Face Inference API for content generation
      const content = await this.generateWithHuggingFace(config);
      return content;
    } catch (error) {
      console.warn('API content generation failed, using enhanced templates:', error);
      return this.generateTemplateContent(config);
    }
  }

  private async generateWithHuggingFace(config: VideoConfig): Promise<GeneratedContent> {
    const model = 'microsoft/DialoGPT-medium'; // Free model for content generation
    const apiUrl = `https://api-inference.huggingface.co/models/${model}`;

    // Generate problem statement
    const problemPrompt = `Create a compelling health problem statement for ${config.healthConcern}. Make it relatable and urgent in 15 words or less.`;
    const problemStatement = await this.queryHuggingFace(apiUrl, problemPrompt);

    // Generate product introduction
    const introPrompt = `Write a professional pharmaceutical product introduction for ${config.productName} that addresses ${config.healthConcern}. Keep it under 20 words.`;
    const productIntroduction = await this.queryHuggingFace(apiUrl, introPrompt);

    // Generate benefits description
    const benefitsPrompt = `Transform these benefits into compelling marketing copy: ${config.benefits.join(', ')}. Make it sound medical and professional.`;
    const benefitsDescription = await this.queryHuggingFace(apiUrl, benefitsPrompt);

    // Generate how it works
    const howItWorksPrompt = `Explain how ${config.productName} works for ${config.healthConcern} in simple, medical terms. Keep under 25 words.`;
    const howItWorks = await this.queryHuggingFace(apiUrl, howItWorksPrompt);

    // Generate call to action
    const ctaPrompt = `Create an urgent, professional call-to-action for ${config.productName}. Include medical authority and urgency in under 15 words.`;
    const callToAction = await this.queryHuggingFace(apiUrl, ctaPrompt);

    return {
      problemStatement,
      productIntroduction,
      benefitsDescription,
      howItWorks,
      callToAction,
      enhancedBenefits: this.enhanceBenefits(config.benefits),
      medicalTerminology: this.generateMedicalTerms(config.healthConcern)
    };
  }

  private async queryHuggingFace(apiUrl: string, prompt: string): Promise<string> {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_length: 50,
          temperature: 0.7,
          return_full_text: false
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Hugging Face API error: ${response.status}`);
    }

    const result = await response.json();
    return result[0]?.generated_text?.trim() || prompt;
  }

  private generateTemplateContent(config: VideoConfig): GeneratedContent {
    // Professional pharmaceutical-style templates
    const problemTemplates = [
      `Millions suffer from ${config.healthConcern} daily without effective relief`,
      `${config.healthConcern} affects quality of life for countless individuals`,
      `Traditional treatments for ${config.healthConcern} often fall short`,
      `Break free from the limitations of ${config.healthConcern}`
    ];

    const introTemplates = [
      `${config.productName} - breakthrough science for ${config.healthConcern}`,
      `Clinically formulated ${config.productName} targets ${config.healthConcern}`,
      `Advanced ${config.productName} delivers results for ${config.healthConcern}`,
      `Doctor-recommended ${config.productName} for effective ${config.healthConcern} management`
    ];

    const howItWorksTemplates = [
      `${config.productName} uses advanced bioactive compounds to target root causes`,
      `Scientifically formulated to optimize cellular function and healing`,
      `Multi-pathway approach addresses symptoms at the molecular level`,
      `Clinically proven ingredients work synergistically for maximum efficacy`
    ];

    const ctaTemplates = [
      `Order ${config.productName} now - limited time professional discount`,
      `Join thousands who trust ${config.productName} for results`,
      `Get ${config.productName} today - your health deserves the best`,
      `Don't wait - start your ${config.productName} journey now`
    ];

    // Select random templates for variety
    const randomIndex = Math.floor(Math.random() * problemTemplates.length);

    return {
      problemStatement: problemTemplates[randomIndex],
      productIntroduction: introTemplates[randomIndex],
      benefitsDescription: `Experience the transformative power of ${config.productName}: ${config.benefits.join(', ').toLowerCase()}`,
      howItWorks: howItWorksTemplates[randomIndex],
      callToAction: ctaTemplates[randomIndex],
      enhancedBenefits: this.enhanceBenefits(config.benefits),
      medicalTerminology: this.generateMedicalTerms(config.healthConcern)
    };
  }

  private enhanceBenefits(benefits: string[]): string[] {
    const enhancedBenefits = benefits.map(benefit => {
      // Add medical authority to benefits
      const prefixes = ['Clinically proven to', 'Studies show', 'Research indicates', 'Documented to'];
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      return `${prefix} ${benefit.toLowerCase()}`;
    });

    // Add additional professional benefits if needed
    if (enhancedBenefits.length < 3) {
      enhancedBenefits.push(
        'Clinically proven to support overall wellness',
        'Backed by scientific research and development',
        'Trusted by healthcare professionals nationwide'
      );
    }

    return enhancedBenefits.slice(0, 5); // Limit to 5 benefits for clean display
  }

  private generateMedicalTerms(healthConcern: string): string[] {
    // Generate relevant medical terminology based on health concern
    const baseTerms = ['bioavailability', 'therapeutic', 'clinical efficacy', 'pharmacokinetics'];
    
    const concernSpecific: { [key: string]: string[] } = {
      'joint pain': ['anti-inflammatory', 'cartilage support', 'synovial fluid'],
      'heart health': ['cardiovascular', 'cardiac function', 'circulation'],
      'digestion': ['gastrointestinal', 'gut microbiome', 'digestive enzymes'],
      'energy': ['mitochondrial', 'cellular metabolism', 'ATP production'],
      'sleep': ['circadian rhythm', 'melatonin regulation', 'sleep architecture'],
      'immunity': ['immune response', 'immunomodulation', 'pathogen resistance'],
      'cognitive': ['neuroplasticity', 'neurotransmitter', 'cognitive function'],
      'skin': ['dermatological', 'collagen synthesis', 'cellular regeneration']
    };

    // Find matching terms or use general medical terms
    const specificTerms = Object.keys(concernSpecific).find(key => 
      healthConcern.toLowerCase().includes(key)
    );

    return specificTerms 
      ? [...baseTerms, ...concernSpecific[specificTerms]]
      : [...baseTerms, 'therapeutic compounds', 'clinical validation', 'molecular targeting'];
  }

  // Method to check if API is available
  hasAPIAccess(): boolean {
    return this.apiKey !== null;
  }

  // Method to get content generation status
  getGenerationMethod(): 'api' | 'template' {
    return this.hasAPIAccess() ? 'api' : 'template';
  }
}