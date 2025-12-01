// Script Pipeline Module - Validates and parses marketing scripts
// Following the 5-section framework: Hook, Problem, Solution, Social Proof, CTA

export interface ScriptSection {
  id: string;
  type: 'hook' | 'problem' | 'solution' | 'social_proof' | 'cta';
  title: string;
  content: string;
  duration: number; // in seconds
  startTime: number;
  endTime: number;
  visualDirection?: string;
  audioNotes?: string;
}

export interface ParsedScript {
  sections: ScriptSection[];
  totalDuration: number;
  platform: Platform;
  aspectRatio: string;
  resolution: { width: number; height: number };
  isValid: boolean;
  validationErrors: string[];
}

export type Platform = 'youtube' | 'tiktok' | 'instagram_reels' | 'instagram_feed' | 'linkedin' | 'facebook';

export const PLATFORM_SPECS: Record<Platform, {
  aspectRatio: string;
  resolution: { width: number; height: number };
  maxDuration: number;
  minDuration: number;
}> = {
  youtube: {
    aspectRatio: '16:9',
    resolution: { width: 1920, height: 1080 },
    maxDuration: 600,
    minDuration: 15
  },
  tiktok: {
    aspectRatio: '9:16',
    resolution: { width: 1080, height: 1920 },
    maxDuration: 180,
    minDuration: 15
  },
  instagram_reels: {
    aspectRatio: '9:16',
    resolution: { width: 1080, height: 1920 },
    maxDuration: 90,
    minDuration: 15
  },
  instagram_feed: {
    aspectRatio: '1:1',
    resolution: { width: 1080, height: 1080 },
    maxDuration: 60,
    minDuration: 3
  },
  linkedin: {
    aspectRatio: '16:9',
    resolution: { width: 1920, height: 1080 },
    maxDuration: 600,
    minDuration: 15
  },
  facebook: {
    aspectRatio: '16:9',
    resolution: { width: 1920, height: 1080 },
    maxDuration: 240,
    minDuration: 15
  }
};

// Section timing guidelines per the PDF framework
const SECTION_TIMING = {
  hook: { min: 3, max: 5, default: 4 },
  problem: { min: 5, max: 10, default: 7 },
  solution: { min: 10, max: 20, default: 15 },
  social_proof: { min: 5, max: 10, default: 7 },
  cta: { min: 3, max: 5, default: 4 }
};

export class ScriptPipeline {
  
  /**
   * Parse a raw script into structured sections
   */
  parseScript(rawScript: string, targetDuration: number, platform: Platform = 'youtube'): ParsedScript {
    const platformSpec = PLATFORM_SPECS[platform];
    const validationErrors: string[] = [];
    
    // Try to parse sections with explicit markers first
    let sections = this.parseExplicitSections(rawScript);
    
    // If no explicit sections found, try to infer structure
    if (sections.length === 0) {
      sections = this.inferSections(rawScript, targetDuration);
    }
    
    // Validate we have all required sections
    const requiredTypes: ScriptSection['type'][] = ['hook', 'problem', 'solution', 'social_proof', 'cta'];
    const foundTypes = sections.map(s => s.type);
    
    for (const required of requiredTypes) {
      if (!foundTypes.includes(required)) {
        validationErrors.push(`Missing required section: ${required.toUpperCase()}`);
      }
    }
    
    // Calculate timing
    let currentTime = 0;
    for (const section of sections) {
      section.startTime = currentTime;
      section.endTime = currentTime + section.duration;
      currentTime = section.endTime;
    }
    
    const totalDuration = currentTime;
    
    // Validate duration against platform specs
    if (totalDuration > platformSpec.maxDuration) {
      validationErrors.push(`Total duration (${totalDuration}s) exceeds ${platform} max (${platformSpec.maxDuration}s)`);
    }
    if (totalDuration < platformSpec.minDuration) {
      validationErrors.push(`Total duration (${totalDuration}s) below ${platform} min (${platformSpec.minDuration}s)`);
    }
    
    return {
      sections,
      totalDuration,
      platform,
      aspectRatio: platformSpec.aspectRatio,
      resolution: platformSpec.resolution,
      isValid: validationErrors.length === 0,
      validationErrors
    };
  }
  
  /**
   * Pre-process script to normalize AI-generated markers
   */
  private normalizeScript(script: string): string {
    let normalized = script;
    
    // Remove markdown code blocks
    normalized = normalized.replace(/```[\s\S]*?```/g, '');
    
    // Normalize various section header formats to standard format
    // Handle: **[HOOK – 0:00-0:05]**, [HOOK], **HOOK**, ## HOOK, etc.
    const sectionNames = ['HOOK', 'PROBLEM', 'SOLUTION', 'SOCIAL_PROOF', 'SOCIAL PROOF', 'CTA', 'CALL TO ACTION'];
    
    for (const name of sectionNames) {
      // Match various formats and normalize to "[SECTION_NAME]"
      const patterns = [
        new RegExp(`\\*\\*\\[${name}[^\\]]*\\]\\*\\*`, 'gi'),
        new RegExp(`\\[${name}[^\\]]*\\]`, 'gi'),
        new RegExp(`\\*\\*${name}\\*\\*`, 'gi'),
        new RegExp(`##\\s*${name}[^\\n]*`, 'gi'),
        new RegExp(`^${name}:`, 'gim'),
      ];
      
      for (const pattern of patterns) {
        normalized = normalized.replace(pattern, `\n[${name.replace(' ', '_')}]\n`);
      }
    }
    
    return normalized;
  }
  
  /**
   * Clean timing metadata and markers from content
   */
  private cleanSectionContent(content: string): string {
    return content
      // Remove timing markers like [0:00-0:05], (0:00-0:45), **0:45-1:15]**
      .replace(/\[?\d+:\d+\s*[-–]\s*\d+:\d+\]?\**/g, '')
      // Remove duration markers like (3-5 seconds), (10-15s)
      .replace(/\(\d+[-–]\d+\s*(?:seconds?|s)?\)/gi, '')
      // Remove asterisks and brackets around text
      .replace(/\*\*/g, '')
      // Remove section headers that slipped through
      .replace(/^\[(?:HOOK|PROBLEM|SOLUTION|SOCIAL_PROOF|CTA)\]/gim, '')
      // Remove Visual direction and Audio notes
      .replace(/Visual(?:\s+direction)?:\s*[^\n]+/gi, '')
      .replace(/Audio(?:\s+notes)?:\s*[^\n]+/gi, '')
      .replace(/Timing:\s*[^\n]+/gi, '')
      // Remove script title headers
      .replace(/^#[^\n]+\n/gm, '')
      // Clean up excess whitespace
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
  
  /**
   * Parse sections with explicit markers like ## HOOK, [PROBLEM], etc.
   */
  private parseExplicitSections(script: string): ScriptSection[] {
    const sections: ScriptSection[] = [];
    
    // Pre-process to normalize markers
    const normalizedScript = this.normalizeScript(script);
    
    // Split by section markers
    const sectionBlocks = normalizedScript.split(/\[(?=HOOK|PROBLEM|SOLUTION|SOCIAL_PROOF|CTA)\]/i);
    
    for (const block of sectionBlocks) {
      if (!block.trim()) continue;
      
      // Extract section type from the beginning of the block
      const typeMatch = block.match(/^(HOOK|PROBLEM|SOLUTION|SOCIAL_PROOF|CTA)/i);
      if (!typeMatch) continue;
      
      const sectionName = typeMatch[1].toUpperCase();
      const content = block.substring(typeMatch[0].length).trim();
      
      if (!content) continue;
      
      // Determine section type
      let type: ScriptSection['type'];
      if (sectionName === 'HOOK') {
        type = 'hook';
      } else if (sectionName === 'PROBLEM') {
        type = 'problem';
      } else if (sectionName === 'SOLUTION') {
        type = 'solution';
      } else if (sectionName === 'SOCIAL_PROOF') {
        type = 'social_proof';
      } else if (sectionName === 'CTA') {
        type = 'cta';
      } else {
        continue;
      }
      
      // Skip if we already have this type
      if (sections.some(s => s.type === type)) continue;
      
      // Clean the content of timing markers and metadata
      const cleanContent = this.cleanSectionContent(content);
      
      if (!cleanContent) continue;
      
      // Estimate duration from word count (150 words/min)
      const wordCount = cleanContent.split(/\s+/).length;
      let duration = Math.max(SECTION_TIMING[type].min, Math.min(SECTION_TIMING[type].max * 2, (wordCount / 150) * 60));
      
      sections.push({
        id: `section_${type}_${Date.now()}`,
        type,
        title: this.formatSectionTitle(type),
        content: cleanContent,
        duration: Math.round(duration),
        startTime: 0,
        endTime: 0
      });
    }
    
    // If block splitting didn't work, try regex fallback
    if (sections.length < 2) {
      return this.parseWithRegexFallback(normalizedScript);
    }
    
    // Sort sections in proper order
    const typeOrder: ScriptSection['type'][] = ['hook', 'problem', 'solution', 'social_proof', 'cta'];
    sections.sort((a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type));
    
    return sections;
  }
  
  /**
   * Fallback regex parsing for scripts that don't split cleanly
   */
  private parseWithRegexFallback(script: string): ScriptSection[] {
    const sections: ScriptSection[] = [];
    
    // Match sections with various formats
    const pattern = /\[?(HOOK|PROBLEM|SOLUTION|SOCIAL_PROOF|CTA)\]?\s*:?\s*([\s\S]*?)(?=\[?(?:HOOK|PROBLEM|SOLUTION|SOCIAL_PROOF|CTA)\]?|$)/gi;
    
    let match;
    while ((match = pattern.exec(script)) !== null) {
      const sectionName = match[1].toUpperCase();
      const rawContent = (match[2] || '').trim();
      
      if (!rawContent) continue;
      
      let type: ScriptSection['type'];
      if (sectionName === 'HOOK') {
        type = 'hook';
      } else if (sectionName === 'PROBLEM') {
        type = 'problem';
      } else if (sectionName === 'SOLUTION') {
        type = 'solution';
      } else if (sectionName === 'SOCIAL_PROOF') {
        type = 'social_proof';
      } else if (sectionName === 'CTA') {
        type = 'cta';
      } else {
        continue;
      }
      
      if (sections.some(s => s.type === type)) continue;
      
      const cleanContent = this.cleanSectionContent(rawContent);
      if (!cleanContent) continue;
      
      const wordCount = cleanContent.split(/\s+/).length;
      const duration = Math.max(SECTION_TIMING[type].min, Math.min(SECTION_TIMING[type].max * 2, (wordCount / 150) * 60));
      
      sections.push({
        id: `section_${type}_${Date.now()}`,
        type,
        title: this.formatSectionTitle(type),
        content: cleanContent,
        duration: Math.round(duration),
        startTime: 0,
        endTime: 0
      });
    }
    
    const typeOrder: ScriptSection['type'][] = ['hook', 'problem', 'solution', 'social_proof', 'cta'];
    sections.sort((a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type));
    
    return sections;
  }
  
  /**
   * Infer section structure from unformatted script
   */
  private inferSections(script: string, targetDuration: number): ScriptSection[] {
    const sections: ScriptSection[] = [];
    
    // Split into paragraphs
    const paragraphs = script.split(/\n\n+/).filter(p => p.trim().length > 20);
    
    if (paragraphs.length === 0) {
      // Single block of text - split by sentences
      const sentences = script.match(/[^.!?]+[.!?]+/g) || [script];
      const chunkSize = Math.ceil(sentences.length / 5);
      
      const types: ScriptSection['type'][] = ['hook', 'problem', 'solution', 'social_proof', 'cta'];
      
      types.forEach((type, index) => {
        const start = index * chunkSize;
        const end = Math.min(start + chunkSize, sentences.length);
        const content = sentences.slice(start, end).join(' ').trim();
        
        if (content) {
          sections.push({
            id: `section_${type}_${Date.now()}_${index}`,
            type,
            title: this.formatSectionTitle(type),
            content,
            duration: SECTION_TIMING[type].default,
            startTime: 0,
            endTime: 0
          });
        }
      });
    } else {
      // Map paragraphs to sections
      const types: ScriptSection['type'][] = ['hook', 'problem', 'solution', 'social_proof', 'cta'];
      
      // Distribute paragraphs across sections
      const paragraphsPerSection = Math.max(1, Math.floor(paragraphs.length / 5));
      
      types.forEach((type, typeIndex) => {
        const startIdx = typeIndex * paragraphsPerSection;
        const endIdx = type === 'cta' 
          ? paragraphs.length 
          : Math.min(startIdx + paragraphsPerSection, paragraphs.length);
        
        const content = paragraphs.slice(startIdx, endIdx).join('\n\n').trim();
        
        if (content || typeIndex < 5) {
          sections.push({
            id: `section_${type}_${Date.now()}_${typeIndex}`,
            type,
            title: this.formatSectionTitle(type),
            content: content || this.getDefaultContent(type),
            duration: SECTION_TIMING[type].default,
            startTime: 0,
            endTime: 0
          });
        }
      });
    }
    
    // Adjust durations to match target
    const totalDefault = sections.reduce((sum, s) => sum + s.duration, 0);
    const scale = targetDuration / totalDefault;
    
    sections.forEach(section => {
      section.duration = Math.round(section.duration * scale);
      section.duration = Math.max(
        SECTION_TIMING[section.type].min,
        Math.min(SECTION_TIMING[section.type].max * 2, section.duration)
      );
    });
    
    return sections;
  }
  
  private parseTimeToSeconds(timeStr: string): number {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return parts[0];
  }
  
  private formatSectionTitle(type: ScriptSection['type']): string {
    const titles: Record<ScriptSection['type'], string> = {
      hook: 'Hook',
      problem: 'The Problem',
      solution: 'The Solution',
      social_proof: 'Why Trust Us',
      cta: 'Take Action'
    };
    return titles[type];
  }
  
  private getDefaultContent(type: ScriptSection['type']): string {
    const defaults: Record<ScriptSection['type'], string> = {
      hook: 'Discover something amazing today.',
      problem: 'Are you facing challenges that seem overwhelming?',
      solution: 'We have the perfect solution designed just for you.',
      social_proof: 'Trusted by thousands of satisfied customers.',
      cta: 'Get started now and transform your life today!'
    };
    return defaults[type];
  }
  
  /**
   * Validate a parsed script against quality criteria
   */
  validateScript(parsedScript: ParsedScript): {
    passed: boolean;
    checks: Array<{ name: string; passed: boolean; message: string }>;
  } {
    const checks: Array<{ name: string; passed: boolean; message: string }> = [];
    
    // Check 1: All sections present
    const requiredTypes: ScriptSection['type'][] = ['hook', 'problem', 'solution', 'social_proof', 'cta'];
    const foundTypes = parsedScript.sections.map(s => s.type);
    const allSectionsPresent = requiredTypes.every(t => foundTypes.includes(t));
    checks.push({
      name: 'All Sections Present',
      passed: allSectionsPresent,
      message: allSectionsPresent 
        ? 'All 5 required sections found' 
        : `Missing: ${requiredTypes.filter(t => !foundTypes.includes(t)).join(', ')}`
    });
    
    // Check 2: Hook is attention-grabbing (has question or direct address)
    const hook = parsedScript.sections.find(s => s.type === 'hook');
    const hookValid = hook ? (hook.content.includes('?') || /\byou\b/i.test(hook.content)) : false;
    checks.push({
      name: 'Hook Quality',
      passed: hookValid,
      message: hookValid ? 'Hook addresses viewer or poses question' : 'Hook should address viewer directly or pose a question'
    });
    
    // Check 3: Solution has benefits
    const solution = parsedScript.sections.find(s => s.type === 'solution');
    const benefitIndicators = ['benefit', 'help', 'improve', 'reduce', 'increase', 'natural', 'effective', '✓', '•'];
    const solutionValid = solution ? benefitIndicators.some(b => solution.content.toLowerCase().includes(b)) : false;
    checks.push({
      name: 'Solution Benefits',
      passed: solutionValid,
      message: solutionValid ? 'Solution includes clear benefits' : 'Solution should highlight specific benefits'
    });
    
    // Check 4: CTA has action verb
    const cta = parsedScript.sections.find(s => s.type === 'cta');
    const actionVerbs = ['order', 'buy', 'get', 'start', 'try', 'call', 'visit', 'click', 'shop', 'discover', 'learn', 'join'];
    const ctaValid = cta ? actionVerbs.some(v => cta.content.toLowerCase().includes(v)) : false;
    checks.push({
      name: 'CTA Action',
      passed: ctaValid,
      message: ctaValid ? 'CTA includes clear action verb' : 'CTA should include action verb (order, buy, visit, etc.)'
    });
    
    // Check 5: Duration within platform limits
    const platformSpec = PLATFORM_SPECS[parsedScript.platform];
    const durationValid = parsedScript.totalDuration >= platformSpec.minDuration && 
                          parsedScript.totalDuration <= platformSpec.maxDuration;
    checks.push({
      name: 'Platform Duration',
      passed: durationValid,
      message: durationValid 
        ? `Duration (${parsedScript.totalDuration}s) within ${parsedScript.platform} limits`
        : `Duration should be ${platformSpec.minDuration}-${platformSpec.maxDuration}s for ${parsedScript.platform}`
    });
    
    return {
      passed: checks.every(c => c.passed),
      checks
    };
  }
  
  /**
   * Generate AI script prompt based on user input
   */
  generateScriptPrompt(params: {
    productName: string;
    productDescription: string;
    targetAudience?: string;
    platform: Platform;
    duration: number;
    tone?: string;
  }): string {
    const platformSpec = PLATFORM_SPECS[params.platform];
    
    return `Generate a ${params.duration}-second marketing video script for ${params.platform} (${platformSpec.aspectRatio} format).

PRODUCT: ${params.productName}
DESCRIPTION: ${params.productDescription}
${params.targetAudience ? `TARGET AUDIENCE: ${params.targetAudience}` : ''}
${params.tone ? `TONE: ${params.tone}` : 'TONE: Professional and engaging'}

Follow this EXACT structure with timing for each section:

## HOOK (3-5 seconds)
[Write an attention-grabbing opening that addresses the viewer directly or poses a compelling question. Create immediate curiosity.]

## PROBLEM (5-10 seconds)
[Identify the specific pain point the target audience faces. Use language they would use themselves. Make them think "that's me!"]

## SOLUTION (10-20 seconds)
[Present the product as the solution. Explain HOW it solves the problem. List 2-3 specific BENEFITS (not features). Be clear and compelling.]

## SOCIAL PROOF (5-10 seconds)
[Include credibility - this could be a testimonial quote, statistic, or authority marker. Be specific with numbers or outcomes.]

## CALL TO ACTION (3-5 seconds)
[State EXACTLY what the viewer should do next. Include urgency (why now). Give a single, clear action.]

For each section, also provide:
- Visual direction: What should be shown on screen
- Audio notes: Voiceover tone and pacing

Keep the total script around ${params.duration} seconds when read at natural speaking pace (150 words/minute).
Focus on benefits over features. Be conversational but professional.`;
  }
}

// Export singleton instance
export const scriptPipeline = new ScriptPipeline();
