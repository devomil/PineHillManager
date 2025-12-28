import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { brandContextService } from './brand-context-service';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ProjectInstructions {
  role: string;
  philosophy: string;
  brandContext: string;
  visualGuidelines: string;
  communicationStyle: string;
  redLines: string;
}

class ProjectInstructionsService {
  private roleInstructions: string | null = null;
  private loadedAt: number = 0;
  private cacheTTL: number = 3600000;

  async loadRoleInstructions(): Promise<string> {
    if (this.roleInstructions && Date.now() - this.loadedAt < this.cacheTTL) {
      return this.roleInstructions;
    }

    try {
      const instructionsPath = path.join(__dirname, '../brand-context/ai-role-instructions.md');
      this.roleInstructions = fs.readFileSync(instructionsPath, 'utf-8');
      this.loadedAt = Date.now();
      console.log('[ProjectInstructions] Role instructions loaded');
      return this.roleInstructions;
    } catch (error: any) {
      console.error('[ProjectInstructions] Failed to load role instructions:', error.message);
      return this.getDefaultRoleInstructions();
    }
  }

  async getScriptParsingSystemPrompt(): Promise<string> {
    const roleInstructions = await this.loadRoleInstructions();
    const brandContext = await brandContextService.getScriptParsingContext();

    return `${this.extractSection(roleInstructions, 'Your Identity')}

${this.extractSection(roleInstructions, 'Core Philosophy')}

${this.extractSection(roleInstructions, 'Script Parsing')}

${brandContext}

${this.extractSection(roleInstructions, 'Red Lines')}`;
  }

  async getVisualDirectionSystemPrompt(): Promise<string> {
    const roleInstructions = await this.loadRoleInstructions();
    const visualContext = await brandContextService.getVisualAnalysisContext();

    return `${this.extractSection(roleInstructions, 'Your Identity')}

${this.extractSection(roleInstructions, 'Visual Direction')}

${visualContext}

${this.extractSection(roleInstructions, 'Decision Framework')}

${this.extractSection(roleInstructions, 'Red Lines')}`;
  }

  async getQualityEvaluationSystemPrompt(): Promise<string> {
    const roleInstructions = await this.loadRoleInstructions();
    const qualityContext = await brandContextService.getQualityEvaluationContext();

    return `${this.extractSection(roleInstructions, 'Your Identity')}

${this.extractSection(roleInstructions, 'Quality Evaluation')}

${qualityContext}

${this.extractSection(roleInstructions, 'Success Metrics')}

${this.extractSection(roleInstructions, 'Red Lines')}`;
  }

  async getPromptEnhancementSystemPrompt(): Promise<string> {
    const roleInstructions = await this.loadRoleInstructions();
    const brandContext = await brandContextService.getPromptEnhancementContext();

    return `${this.extractSection(roleInstructions, 'Your Identity')}

${this.extractSection(roleInstructions, 'Prompt Enhancement')}

Brand Context: ${brandContext}

${this.extractSection(roleInstructions, 'Red Lines')}`;
  }

  async getCondensedRoleContext(): Promise<string> {
    return `You are an AI video production specialist for Pine Hill Farm, a farm-to-wellness brand.

KEY PRINCIPLES:
- Emotion over realism
- Warm, natural aesthetic (NOT clinical/corporate)
- Authentic connections (NOT stock-photo perfect)
- Root-cause health philosophy
- Target audience: Women 35-65 seeking holistic health

BRAND AESTHETIC:
- Warm, golden lighting
- Earth tones (greens, browns, golds)
- Natural settings (farm, garden, home)
- Organic textures (wood, plants)
- Real people with authentic expressions

NEVER: Clinical settings, cold lighting, fear-based messaging, corporate feel
ALWAYS: Warm, inviting, educational, empowering, authentic`;
  }

  private extractSection(markdown: string, sectionTitle: string): string {
    const regex = new RegExp(
      `## ${sectionTitle}[\\s\\S]*?(?=## |$)`,
      'i'
    );
    const match = markdown.match(regex);
    return match ? match[0].trim() : '';
  }

  private getDefaultRoleInstructions(): string {
    return `## Your Identity
You are an AI video production specialist for Pine Hill Farm.

## Core Philosophy
Prioritize emotion over realism, brand alignment over technical perfection.

## Script Parsing
Identify Pine Hill Farm service/product connections and ensure messaging aligns with root-cause philosophy.

## Visual Direction
Emphasize warm, golden lighting and natural, farm-to-wellness settings.

## Quality Evaluation
Score brand alignment as heavily as technical quality.

## Prompt Enhancement
Add Pine Hill Farm brand context and warm, natural aesthetic descriptors.

## Decision Framework
When making creative decisions, prioritize brand alignment, audience resonance, emotional impact, message clarity, then technical quality.

## Success Metrics
Content feels authentically Pine Hill Farm with brand compliance scores >= 80/100.

## Red Lines
Never create clinical, corporate, or fear-based content.
Always maintain warm, inviting, authentic aesthetic.`;
  }

  clearCache(): void {
    this.roleInstructions = null;
    this.loadedAt = 0;
    console.log('[ProjectInstructions] Cache cleared');
  }

  async getFullInstructions(): Promise<ProjectInstructions> {
    const roleInstructions = await this.loadRoleInstructions();
    
    return {
      role: this.extractSection(roleInstructions, 'Your Identity'),
      philosophy: this.extractSection(roleInstructions, 'Core Philosophy'),
      brandContext: this.extractSection(roleInstructions, 'Working With Pine Hill Farm'),
      visualGuidelines: this.extractSection(roleInstructions, 'Visual Direction'),
      communicationStyle: this.extractSection(roleInstructions, 'Communication Style'),
      redLines: this.extractSection(roleInstructions, 'Red Lines'),
    };
  }
}

export const projectInstructionsService = new ProjectInstructionsService();
