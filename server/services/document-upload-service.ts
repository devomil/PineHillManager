// server/services/document-upload-service.ts

import fs from 'fs';
import mammoth from 'mammoth';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

export interface DocumentSection {
  heading: string;
  content: string;
  bulletPoints: string[];
}

export interface ExtractedDocument {
  title: string;
  fullText: string;
  sections: DocumentSection[];
  estimatedReadingTimeMinutes: number;
}

class DocumentUploadService {
  
  /**
   * Extract content from uploaded document
   */
  async extractContent(filePath: string, mimeType: string): Promise<ExtractedDocument> {
    console.log(`[DocumentUpload] Extracting content from ${filePath} (${mimeType})`);
    
    let rawText: string;
    
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        filePath.endsWith('.docx')) {
      rawText = await this.extractDocx(filePath);
    } else if (mimeType === 'application/pdf' || filePath.endsWith('.pdf')) {
      rawText = await this.extractPdf(filePath);
    } else {
      rawText = await this.extractText(filePath);
    }
    
    return this.parseStructure(rawText);
  }
  
  /**
   * Extract text from Word document
   */
  private async extractDocx(filePath: string): Promise<string> {
    const buffer = fs.readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer });
    console.log(`[DocumentUpload] Extracted ${result.value.length} characters from DOCX`);
    return result.value;
  }
  
  /**
   * Extract text from PDF
   */
  private async extractPdf(filePath: string): Promise<string> {
    const buffer = fs.readFileSync(filePath);
    const result = await pdfParse(buffer);
    console.log(`[DocumentUpload] Extracted ${result.text.length} characters from PDF`);
    return result.text;
  }
  
  /**
   * Read plain text file
   */
  private async extractText(filePath: string): Promise<string> {
    const content = fs.readFileSync(filePath, 'utf-8');
    console.log(`[DocumentUpload] Read ${content.length} characters from text file`);
    return content;
  }
  
  /**
   * Parse raw text into structured sections
   */
  private parseStructure(rawText: string): ExtractedDocument {
    const lines = rawText.split('\n').map(line => line.trim()).filter(line => line);
    
    let title = 'Untitled Document';
    const sections: DocumentSection[] = [];
    let currentSection: DocumentSection | null = null;
    
    for (const line of lines) {
      const isHeading = this.isLikelyHeading(line);
      
      if (isHeading) {
        if (currentSection) {
          sections.push(currentSection);
        }
        
        if (title === 'Untitled Document' && sections.length === 0) {
          title = this.cleanHeading(line);
          currentSection = null;
        } else {
          currentSection = {
            heading: this.cleanHeading(line),
            content: '',
            bulletPoints: [],
          };
        }
      } else if (currentSection) {
        if (this.isBulletPoint(line)) {
          currentSection.bulletPoints.push(this.cleanBulletPoint(line));
        } else {
          currentSection.content += (currentSection.content ? ' ' : '') + line;
        }
      } else {
        if (!currentSection) {
          currentSection = {
            heading: 'Introduction',
            content: line,
            bulletPoints: [],
          };
        }
      }
    }
    
    if (currentSection) {
      sections.push(currentSection);
    }
    
    const wordCount = rawText.split(/\s+/).length;
    const estimatedReadingTimeMinutes = Math.ceil(wordCount / 150);
    
    console.log(`[DocumentUpload] Parsed: "${title}" with ${sections.length} sections, ~${estimatedReadingTimeMinutes} min`);
    
    return {
      title,
      fullText: rawText,
      sections,
      estimatedReadingTimeMinutes,
    };
  }
  
  /**
   * Check if a line is likely a heading
   */
  private isLikelyHeading(line: string): boolean {
    const cleanLine = line.replace(/\*\*/g, '').trim();
    
    if (line.startsWith('**') && line.endsWith('**')) return true;
    
    if (cleanLine.length < 60 && !this.isBulletPoint(line) && cleanLine.length > 3) {
      if (cleanLine.endsWith(':')) return true;
      if (this.isTitleCase(cleanLine)) return true;
    }
    
    return false;
  }
  
  /**
   * Check if line has title case
   */
  private isTitleCase(line: string): boolean {
    const words = line.split(' ');
    if (words.length < 2) return false;
    
    const capitalizedWords = words.filter(w => w.length > 3 && w[0] === w[0].toUpperCase());
    return capitalizedWords.length / words.length > 0.5;
  }
  
  /**
   * Check if line is a bullet point
   */
  private isBulletPoint(line: string): boolean {
    return /^[-•*]\s/.test(line) || /^\d+[.)]\s/.test(line);
  }
  
  /**
   * Clean heading text
   */
  private cleanHeading(line: string): string {
    return line.replace(/\*\*/g, '').replace(/:$/, '').trim();
  }
  
  /**
   * Clean bullet point text
   */
  private cleanBulletPoint(line: string): string {
    return line.replace(/^[-•*]\s*/, '').replace(/^\d+[.)]\s*/, '').trim();
  }
  
  /**
   * Convert extracted document to video script format
   * This creates a script that can be fed to the existing script parser
   */
  formatAsVideoScript(doc: ExtractedDocument, targetDurationMinutes: number): string {
    const sections = doc.sections;
    const totalSections = sections.length;
    
    const secondsPerSection = Math.floor((targetDurationMinutes * 60) / Math.max(totalSections, 1));
    
    let script = `# ${doc.title}\n\n`;
    
    script += `[SCENE: HOOK - ${Math.min(secondsPerSection, 10)}s]\n`;
    script += `Today we're diving deep into ${doc.title.toLowerCase()}.\n\n`;
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const sceneType = this.determineSceneType(section.heading, i, sections.length);
      const duration = Math.min(secondsPerSection, 30);
      
      script += `[SCENE: ${sceneType} - ${duration}s]\n`;
      script += `**${section.heading}**\n`;
      
      if (section.content) {
        script += `${section.content}\n`;
      }
      
      if (section.bulletPoints.length > 0) {
        const topBullets = section.bulletPoints.slice(0, 3);
        script += topBullets.map(bp => `- ${bp}`).join('\n');
        script += '\n';
      }
      
      script += '\n';
    }
    
    script += `[SCENE: CTA - 10s]\n`;
    script += `For more information and personalized guidance, visit Pine Hill Farm. Your journey to better health starts here.\n`;
    
    console.log(`[DocumentUpload] Generated ${script.length} character script for ${targetDurationMinutes} minute video`);
    
    return script;
  }
  
  /**
   * Determine scene type based on section heading
   */
  private determineSceneType(heading: string, index: number, total: number): string {
    const lower = heading.toLowerCase();
    
    if (index === 0) return 'INTRO';
    if (index === total - 1) return 'CONCLUSION';
    
    if (lower.includes('problem') || lower.includes('issue') || lower.includes('impact')) return 'PROBLEM';
    if (lower.includes('solution') || lower.includes('strateg') || lower.includes('tip')) return 'SOLUTION';
    if (lower.includes('benefit') || lower.includes('advantage')) return 'BENEFIT';
    if (lower.includes('how') || lower.includes('what') || lower.includes('why')) return 'EXPLANATION';
    if (lower.includes('action') || lower.includes('step') || lower.includes('plan')) return 'ACTION';
    
    return 'CONTENT';
  }
}

export const documentUploadService = new DocumentUploadService();
