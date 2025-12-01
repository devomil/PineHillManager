// Subtitle Generator Service
// Creates dynamic subtitles/captions with multiple styles

import { ParsedScript, ScriptSection } from './script-pipeline';

export interface SubtitleSegment {
  id: string;
  text: string;
  startTime: number; // seconds
  endTime: number; // seconds
  words?: SubtitleWord[]; // For word-by-word animations
}

export interface SubtitleWord {
  text: string;
  startTime: number;
  endTime: number;
}

export type SubtitleStyle =
  | 'tiktok' // Floating word-by-word (TikTok/Instagram Reels style)
  | 'traditional' // Bottom subtitles (YouTube style)
  | 'karaoke' // Highlighting word-by-word
  | 'modern' // Large text with background box
  | 'minimal'; // Simple clean text

export interface SubtitleConfig {
  style: SubtitleStyle;
  position: 'top' | 'middle' | 'bottom';
  fontSize: number;
  fontFamily: string;
  color: string;
  backgroundColor?: string;
  backgroundOpacity?: number;
  outlineColor?: string;
  outlineWidth?: number;
  maxCharsPerLine?: number;
  wordsPerSegment?: number; // For TikTok style (1-3 words at a time)
}

export class SubtitleGenerator {
  private readonly DEFAULT_WORDS_PER_MINUTE = 150; // Average speaking rate

  /**
   * Generate subtitles from parsed script
   */
  generateSubtitles(
    script: ParsedScript,
    voiceoverDuration?: number
  ): SubtitleSegment[] {
    const segments: SubtitleSegment[] = [];
    let currentTime = 0;

    script.sections.forEach(section => {
      // Combine title and content
      const fullText = section.title
        ? `${section.title}. ${section.content}`
        : section.content;

      // Split into sentences
      const sentences = this.splitIntoSentences(fullText);

      sentences.forEach(sentence => {
        const words = sentence.trim().split(/\s+/);
        const wordCount = words.length;

        // Calculate duration based on word count and speaking rate
        const duration = (wordCount / this.DEFAULT_WORDS_PER_MINUTE) * 60;

        // Create segment
        const segment: SubtitleSegment = {
          id: `subtitle-${segments.length}`,
          text: sentence.trim(),
          startTime: currentTime,
          endTime: currentTime + duration,
          words: this.generateWordTimings(words, currentTime, duration)
        };

        segments.push(segment);
        currentTime += duration;
      });
    });

    // If we have actual voiceover duration, scale timings to match
    if (voiceoverDuration && currentTime > 0) {
      const scale = voiceoverDuration / currentTime;
      segments.forEach(segment => {
        segment.startTime *= scale;
        segment.endTime *= scale;
        segment.words?.forEach(word => {
          word.startTime *= scale;
          word.endTime *= scale;
        });
      });
    }

    return segments;
  }

  /**
   * Generate word-level timings within a segment
   */
  private generateWordTimings(
    words: string[],
    segmentStart: number,
    segmentDuration: number
  ): SubtitleWord[] {
    const wordTimings: SubtitleWord[] = [];
    const avgWordDuration = segmentDuration / words.length;

    words.forEach((word, index) => {
      const startTime = segmentStart + (index * avgWordDuration);
      const endTime = startTime + avgWordDuration;

      wordTimings.push({
        text: word,
        startTime,
        endTime
      });
    });

    return wordTimings;
  }

  /**
   * Split text into sentences
   */
  private splitIntoSentences(text: string): string[] {
    // Split on sentence endings but keep the punctuation
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    return sentences.map(s => s.trim()).filter(s => s.length > 0);
  }

  /**
   * Render subtitle on canvas at given time
   */
  renderSubtitle(
    ctx: CanvasRenderingContext2D,
    currentTime: number,
    segments: SubtitleSegment[],
    config: SubtitleConfig,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    // Find active segment
    const activeSegment = segments.find(
      seg => currentTime >= seg.startTime && currentTime < seg.endTime
    );

    if (!activeSegment) {
      return;
    }

    // Render based on style
    switch (config.style) {
      case 'tiktok':
        this.renderTikTokStyle(ctx, currentTime, activeSegment, config, canvasWidth, canvasHeight);
        break;
      case 'karaoke':
        this.renderKaraokeStyle(ctx, currentTime, activeSegment, config, canvasWidth, canvasHeight);
        break;
      case 'modern':
        this.renderModernStyle(ctx, activeSegment, config, canvasWidth, canvasHeight);
        break;
      case 'minimal':
        this.renderMinimalStyle(ctx, activeSegment, config, canvasWidth, canvasHeight);
        break;
      case 'traditional':
      default:
        this.renderTraditionalStyle(ctx, activeSegment, config, canvasWidth, canvasHeight);
        break;
    }
  }

  /**
   * Render TikTok style (word-by-word floating)
   */
  private renderTikTokStyle(
    ctx: CanvasRenderingContext2D,
    currentTime: number,
    segment: SubtitleSegment,
    config: SubtitleConfig,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    if (!segment.words) return;

    // Find active words (show 1-3 words at a time)
    const wordsPerSegment = config.wordsPerSegment || 2;
    const activeWordIndex = segment.words.findIndex(
      word => currentTime >= word.startTime && currentTime < word.endTime
    );

    if (activeWordIndex === -1) return;

    // Get words to display
    const displayWords = segment.words.slice(
      activeWordIndex,
      activeWordIndex + wordsPerSegment
    );

    // Configure text
    ctx.font = `bold ${config.fontSize}px ${config.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Calculate position
    const y = this.getYPosition(config.position, canvasHeight);
    const text = displayWords.map(w => w.text).join(' ');

    // Add background box
    if (config.backgroundColor) {
      const metrics = ctx.measureText(text);
      const padding = 20;
      const boxWidth = metrics.width + padding * 2;
      const boxHeight = config.fontSize + padding;
      const boxX = (canvasWidth - boxWidth) / 2;
      const boxY = y - boxHeight / 2;

      ctx.fillStyle = config.backgroundColor;
      ctx.globalAlpha = config.backgroundOpacity || 0.7;
      ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
      ctx.globalAlpha = 1;
    }

    // Add outline
    if (config.outlineColor && config.outlineWidth) {
      ctx.strokeStyle = config.outlineColor;
      ctx.lineWidth = config.outlineWidth;
      ctx.strokeText(text, canvasWidth / 2, y);
    }

    // Draw text
    ctx.fillStyle = config.color;
    ctx.fillText(text, canvasWidth / 2, y);

    // Add pop animation effect
    const wordProgress = (currentTime - displayWords[0].startTime) /
                        (displayWords[0].endTime - displayWords[0].startTime);
    if (wordProgress < 0.2) {
      const scale = 1 + (0.2 - wordProgress) * 0.5; // Pop effect
      ctx.save();
      ctx.translate(canvasWidth / 2, y);
      ctx.scale(scale, scale);
      ctx.translate(-canvasWidth / 2, -y);
      ctx.fillText(text, canvasWidth / 2, y);
      ctx.restore();
    }
  }

  /**
   * Render Karaoke style (word-by-word highlighting)
   */
  private renderKaraokeStyle(
    ctx: CanvasRenderingContext2D,
    currentTime: number,
    segment: SubtitleSegment,
    config: SubtitleConfig,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    if (!segment.words) return;

    const y = this.getYPosition(config.position, canvasHeight);
    const text = segment.text;

    // Configure text
    ctx.font = `${config.fontSize}px ${config.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Background box
    if (config.backgroundColor) {
      const metrics = ctx.measureText(text);
      const padding = 20;
      const boxWidth = metrics.width + padding * 2;
      const boxHeight = config.fontSize + padding;

      ctx.fillStyle = config.backgroundColor;
      ctx.globalAlpha = config.backgroundOpacity || 0.8;
      ctx.fillRect((canvasWidth - boxWidth) / 2, y - boxHeight / 2, boxWidth, boxHeight);
      ctx.globalAlpha = 1;
    }

    // Draw each word with color based on timing
    let xOffset = canvasWidth / 2 - ctx.measureText(text).width / 2;

    segment.words.forEach(word => {
      const isActive = currentTime >= word.startTime && currentTime < word.endTime;

      // Highlight color for active word
      ctx.fillStyle = isActive ? '#FFD700' : config.color;

      if (config.outlineColor && config.outlineWidth) {
        ctx.strokeStyle = config.outlineColor;
        ctx.lineWidth = config.outlineWidth;
        ctx.strokeText(word.text, xOffset, y);
      }

      ctx.fillText(word.text, xOffset, y);
      xOffset += ctx.measureText(word.text + ' ').width;
    });
  }

  /**
   * Render Modern style (large text with background)
   */
  private renderModernStyle(
    ctx: CanvasRenderingContext2D,
    segment: SubtitleSegment,
    config: SubtitleConfig,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    const y = this.getYPosition(config.position, canvasHeight);
    const lines = this.wrapText(ctx, segment.text, canvasWidth * 0.8, config);

    ctx.font = `bold ${config.fontSize}px ${config.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const lineHeight = config.fontSize * 1.3;
    const totalHeight = lines.length * lineHeight;
    let currentY = y - (totalHeight / 2);

    lines.forEach(line => {
      // Background box for each line
      const metrics = ctx.measureText(line);
      const padding = 20;
      const boxWidth = metrics.width + padding * 2;
      const boxHeight = config.fontSize + padding;

      ctx.fillStyle = config.backgroundColor || 'rgba(0, 0, 0, 0.8)';
      ctx.globalAlpha = config.backgroundOpacity || 0.9;
      ctx.fillRect(
        (canvasWidth - boxWidth) / 2,
        currentY - boxHeight / 2,
        boxWidth,
        boxHeight
      );
      ctx.globalAlpha = 1;

      // Text
      ctx.fillStyle = config.color;
      ctx.fillText(line, canvasWidth / 2, currentY);

      currentY += lineHeight;
    });
  }

  /**
   * Render Minimal style (simple clean text)
   */
  private renderMinimalStyle(
    ctx: CanvasRenderingContext2D,
    segment: SubtitleSegment,
    config: SubtitleConfig,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    const y = this.getYPosition(config.position, canvasHeight);

    ctx.font = `${config.fontSize}px ${config.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Subtle shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = config.color;
    ctx.fillText(segment.text, canvasWidth / 2, y);

    ctx.shadowColor = 'transparent';
  }

  /**
   * Render Traditional style (YouTube-style bottom subtitles)
   */
  private renderTraditionalStyle(
    ctx: CanvasRenderingContext2D,
    segment: SubtitleSegment,
    config: SubtitleConfig,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    const lines = this.wrapText(ctx, segment.text, canvasWidth * 0.9, config);

    ctx.font = `${config.fontSize}px ${config.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    const y = config.position === 'bottom'
      ? canvasHeight - 60
      : this.getYPosition(config.position, canvasHeight);

    const lineHeight = config.fontSize * 1.2;

    lines.forEach((line, index) => {
      const currentY = y - (lines.length - 1 - index) * lineHeight;

      // Background box
      const metrics = ctx.measureText(line);
      const padding = 10;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(
        (canvasWidth - metrics.width - padding * 2) / 2,
        currentY - config.fontSize - padding / 2,
        metrics.width + padding * 2,
        config.fontSize + padding
      );

      // White text with black outline
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.strokeText(line, canvasWidth / 2, currentY);

      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(line, canvasWidth / 2, currentY);
    });
  }

  /**
   * Get Y position based on config
   */
  private getYPosition(position: SubtitleConfig['position'], canvasHeight: number): number {
    switch (position) {
      case 'top':
        return canvasHeight * 0.15;
      case 'middle':
        return canvasHeight * 0.5;
      case 'bottom':
      default:
        return canvasHeight * 0.85;
    }
  }

  /**
   * Wrap text to fit within max width
   */
  private wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    config: SubtitleConfig
  ): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    ctx.font = `${config.fontSize}px ${config.fontFamily}`;

    words.forEach(word => {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * Create default subtitle configuration
   */
  createDefaultConfig(style: SubtitleStyle = 'tiktok'): SubtitleConfig {
    const configs: Record<SubtitleStyle, SubtitleConfig> = {
      tiktok: {
        style: 'tiktok',
        position: 'middle',
        fontSize: 72,
        fontFamily: 'Inter, Arial, sans-serif',
        color: '#FFFFFF',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backgroundOpacity: 0.7,
        outlineColor: '#000000',
        outlineWidth: 4,
        wordsPerSegment: 2
      },
      karaoke: {
        style: 'karaoke',
        position: 'bottom',
        fontSize: 48,
        fontFamily: 'Arial, sans-serif',
        color: '#FFFFFF',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backgroundOpacity: 0.8,
        outlineColor: '#000000',
        outlineWidth: 2
      },
      modern: {
        style: 'modern',
        position: 'bottom',
        fontSize: 56,
        fontFamily: 'Inter, Arial, sans-serif',
        color: '#FFFFFF',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backgroundOpacity: 0.85
      },
      minimal: {
        style: 'minimal',
        position: 'bottom',
        fontSize: 42,
        fontFamily: 'Arial, sans-serif',
        color: '#FFFFFF'
      },
      traditional: {
        style: 'traditional',
        position: 'bottom',
        fontSize: 38,
        fontFamily: 'Arial, sans-serif',
        color: '#FFFFFF',
        maxCharsPerLine: 42
      }
    };

    return configs[style];
  }
}
