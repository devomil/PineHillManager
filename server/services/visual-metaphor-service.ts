import { createLogger } from '../utils/logger';

const log = createLogger('VisualMetaphor');

interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
  text: string;
}

interface TreeGrowthConfig {
  type: 'tree-growth';
  duration: number;
  fps: number;
  width: number;
  height: number;
  backgroundColor: string;
  brandColors: BrandColors;
  trunkColor: string;
  branchColor: string;
  leafColor: string;
  labelColor: string;
  labels: Array<{ text: string; position: 'root' | 'branch' | 'leaf' | 'trunk'; branchIndex?: number; leafIndex?: number }>;
  rootLabels: string[];
  growthDuration: number;
  labelDelay: number;
  holdDuration: number;
  style: 'natural' | 'geometric' | 'minimal' | 'organic';
  rootsVisible: boolean;
  labelStyle: {
    fontSize: number;
    fontWeight: string | number;
    fontFamily: string;
  };
}

interface NetworkVisualizationConfig {
  type: 'network-visualization';
  duration: number;
  fps: number;
  width: number;
  height: number;
  backgroundColor: string;
  brandColors: BrandColors;
  nodes: Array<{ id: string; label: string; x?: number; y?: number; size?: number; color?: string }>;
  connections: Array<{ from: string; to: string; label?: string; animated?: boolean }>;
  layout: 'custom' | 'circular' | 'hierarchical' | 'force';
  nodeStyle: {
    shape: 'circle' | 'square' | 'rounded';
    defaultSize: number;
    defaultColor: string;
    borderColor: string;
    borderWidth: number;
    labelColor: string;
  };
  connectionStyle: {
    color: string;
    width: number;
    animated: boolean;
  };
  labelStyle: {
    fontSize: number;
    fontWeight: string | number;
    fontFamily: string;
  };
  animationType: 'nodes-first' | 'connections-first' | 'simultaneous';
  nodeDuration: number;
  connectionDuration: number;
  staggerDelay: number;
  holdDuration: number;
}

type VisualMetaphorConfig = TreeGrowthConfig | NetworkVisualizationConfig;

class VisualMetaphorService {
  private defaultBrandColors: BrandColors = {
    primary: '#2D5A27',
    secondary: '#D4A574',
    accent: '#8B4513',
    text: '#333333',
  };

  private brandBibleService: any = null;

  setBrandBibleService(service: any): void {
    this.brandBibleService = service;
  }

  async generateTreeConfig(
    branchLabels: string[],
    rootLabels: string[],
    duration: number,
    options?: {
      style?: 'natural' | 'geometric' | 'minimal' | 'organic';
      width?: number;
      height?: number;
      leafLabels?: string[];
      trunkLabel?: string;
    }
  ): Promise<TreeGrowthConfig> {
    const brandColors = await this.getBrandColors();
    const fps = 30;
    const totalFrames = Math.round(fps * duration);
    
    const growthTime = Math.round(fps * duration * 0.5);
    const labelDelayTime = Math.round(fps * 0.5);
    const exitTime = Math.round(fps * 0.5);
    const minHold = Math.round(fps * 0.5);
    
    const holdDuration = Math.max(minHold, totalFrames - growthTime - labelDelayTime - exitTime);
    
    const allLabels: Array<{ text: string; position: 'root' | 'branch' | 'leaf' | 'trunk'; branchIndex?: number; leafIndex?: number }> = [];
    
    branchLabels.forEach((text, i) => {
      allLabels.push({ text, position: 'branch', branchIndex: i });
    });
    
    if (options?.leafLabels) {
      options.leafLabels.forEach((text, i) => {
        allLabels.push({ text, position: 'leaf', leafIndex: i });
      });
    }
    
    if (options?.trunkLabel) {
      allLabels.push({ text: options.trunkLabel, position: 'trunk' });
    }
    
    log.info('Generating tree config', { 
      branchLabels: branchLabels.length, 
      leafLabels: options?.leafLabels?.length || 0,
      rootLabels: rootLabels.length,
      duration, 
      holdDuration 
    });
    
    return {
      type: 'tree-growth',
      duration,
      fps,
      width: options?.width || 1920,
      height: options?.height || 1080,
      backgroundColor: '#FFFFFF',
      brandColors,
      trunkColor: brandColors.accent,
      branchColor: brandColors.primary,
      leafColor: brandColors.secondary,
      labelColor: brandColors.text,
      labels: allLabels,
      rootLabels,
      growthDuration: growthTime,
      labelDelay: labelDelayTime,
      holdDuration,
      style: options?.style || 'organic',
      rootsVisible: rootLabels.length > 0,
      labelStyle: {
        fontSize: 18,
        fontWeight: '500',
        fontFamily: 'Inter, sans-serif',
      },
    };
  }

  async generateNetworkConfig(
    nodes: Array<{ id: string; label: string; x?: number; y?: number }>,
    connections: Array<{ from: string; to: string; label?: string }>,
    duration: number,
    options?: {
      layout?: 'custom' | 'circular' | 'hierarchical' | 'force';
      width?: number;
      height?: number;
      animationType?: 'nodes-first' | 'connections-first' | 'simultaneous';
    }
  ): Promise<NetworkVisualizationConfig> {
    const brandColors = await this.getBrandColors();
    const fps = 30;
    const totalFrames = Math.round(fps * duration);
    
    const nodeDuration = Math.round(fps * 0.8);
    const connectionDuration = Math.round(fps * 0.5);
    const staggerDelay = Math.round(fps * 0.15);
    const exitTime = Math.round(fps * 0.5);
    const minHold = Math.round(fps * 0.5);
    
    const animType = options?.animationType || 'nodes-first';
    const totalAnimTime = animType === 'simultaneous'
      ? Math.max(nodeDuration + staggerDelay * nodes.length, connectionDuration + staggerDelay * connections.length)
      : nodeDuration + staggerDelay * nodes.length + connectionDuration + staggerDelay * connections.length;
    
    const holdDuration = Math.max(minHold, totalFrames - totalAnimTime - exitTime);
    
    log.info('Generating network config', { nodesCount: nodes.length, connectionsCount: connections.length, duration, holdDuration });
    
    return {
      type: 'network-visualization',
      duration,
      fps,
      width: options?.width || 1920,
      height: options?.height || 1080,
      backgroundColor: '#FFFFFF',
      brandColors,
      nodes: nodes.map(n => ({
        ...n,
        size: 60,
        color: brandColors.primary,
      })),
      connections: connections.map(c => ({
        ...c,
        animated: true,
      })),
      layout: options?.layout || 'circular',
      nodeStyle: {
        shape: 'circle',
        defaultSize: 60,
        defaultColor: brandColors.primary,
        borderColor: brandColors.secondary,
        borderWidth: 3,
        labelColor: brandColors.text,
      },
      connectionStyle: {
        color: brandColors.secondary,
        width: 3,
        animated: true,
      },
      labelStyle: {
        fontSize: 16,
        fontWeight: '500',
        fontFamily: 'Inter, sans-serif',
      },
      animationType: animType,
      nodeDuration,
      connectionDuration,
      staggerDelay,
      holdDuration,
    };
  }

  parseTreeLabelsFromNarration(narration: string): { 
    branchLabels: string[]; 
    rootLabels: string[]; 
    leafLabels: string[];
    trunkLabel?: string;
  } {
    const branchLabels: string[] = [];
    const rootLabels: string[] = [];
    const leafLabels: string[] = [];
    let trunkLabel: string | undefined;
    
    const bulletPattern = /[•\-\*]\s*([^•\-\*\n]{3,50})/g;
    let match;
    while ((match = bulletPattern.exec(narration)) !== null) {
      branchLabels.push(match[1].trim());
    }
    
    if (branchLabels.length === 0) {
      const numberedPattern = /\d+[.)]\s*([^.!?\n]{3,50})/g;
      while ((match = numberedPattern.exec(narration)) !== null) {
        branchLabels.push(match[1].trim());
      }
    }
    
    const rootPattern = /(?:foundation|root|base|grounded in|built on|based on)[:\s]*(?:is\s+)?(?:built\s+on[:\s]*)?([^.!?]+)/gi;
    while ((match = rootPattern.exec(narration)) !== null) {
      const items = match[1].split(/,|and/).map(s => s.trim()).filter(s => s.length > 0 && s.length < 30);
      rootLabels.push(...items);
    }
    
    const leafPattern = /(?:results?|outcomes?|benefits?|grow(?:th|s)?|bloom(?:s|ing)?)[:\s]+([^.!?]+)/gi;
    while ((match = leafPattern.exec(narration)) !== null) {
      const items = match[1].split(/,|and/).map(s => s.trim()).filter(s => s.length > 0 && s.length < 30);
      leafLabels.push(...items);
    }
    
    const trunkPattern = /(?:core|trunk|main|central|key)[:\s]+([^.!?,]+)/i;
    const trunkMatch = narration.match(trunkPattern);
    if (trunkMatch) {
      trunkLabel = trunkMatch[1].trim();
    }
    
    log.info('Parsed tree labels', { 
      branchLabels: branchLabels.length, 
      rootLabels: rootLabels.length,
      leafLabels: leafLabels.length,
      hasTrunkLabel: !!trunkLabel
    });
    
    return {
      branchLabels: branchLabels.slice(0, 6),
      rootLabels: rootLabels.slice(0, 3),
      leafLabels: leafLabels.slice(0, 4),
      trunkLabel,
    };
  }

  parseNetworkFromNarration(narration: string): { 
    nodes: Array<{ id: string; label: string }>; 
    connections: Array<{ from: string; to: string }>;
  } {
    const nodes: Array<{ id: string; label: string }> = [];
    const connections: Array<{ from: string; to: string }> = [];
    
    const bulletPattern = /[•\-\*]\s*([^•\-\*\n]{3,40})/g;
    let match;
    while ((match = bulletPattern.exec(narration)) !== null) {
      const label = match[1].trim();
      const id = label.toLowerCase().replace(/\s+/g, '-').slice(0, 20);
      if (!nodes.find(n => n.id === id)) {
        nodes.push({ id, label });
      }
    }
    
    if (nodes.length === 0) {
      const componentPattern = /(?:components?|elements?|factors?|parts?)[:\s]+([^.!?]+)/gi;
      while ((match = componentPattern.exec(narration)) !== null) {
        const items = match[1].split(/,|and/).map(s => s.trim()).filter(s => s.length > 0 && s.length < 40);
        items.forEach(label => {
          const id = label.toLowerCase().replace(/\s+/g, '-').slice(0, 20);
          if (!nodes.find(n => n.id === id)) {
            nodes.push({ id, label });
          }
        });
      }
    }
    
    for (let i = 0; i < nodes.length - 1; i++) {
      connections.push({ from: nodes[i].id, to: nodes[i + 1].id });
    }
    if (nodes.length > 2) {
      connections.push({ from: nodes[nodes.length - 1].id, to: nodes[0].id });
    }
    
    log.info('Parsed network from narration', { nodes: nodes.length, connections: connections.length });
    
    return {
      nodes: nodes.slice(0, 8),
      connections: connections.slice(0, 12),
    };
  }

  parseMetaphorFromDirection(
    visualDirection: string,
    narration: string
  ): {
    type: 'tree' | 'network' | 'transformation' | 'journey' | 'unknown';
    labels: string[];
    connections: Array<{ from: string; to: string }>;
  } {
    const lower = visualDirection.toLowerCase();
    const result: {
      type: 'tree' | 'network' | 'transformation' | 'journey' | 'unknown';
      labels: string[];
      connections: Array<{ from: string; to: string }>;
    } = {
      type: 'unknown',
      labels: [],
      connections: [],
    };
    
    if (lower.includes('tree') || lower.includes('root') || lower.includes('branch') || lower.includes('grow')) {
      result.type = 'tree';
      
      const { branchLabels } = this.parseTreeLabelsFromNarration(narration);
      result.labels = branchLabels;
      
      if (result.labels.length === 0) {
        const labelMatch = visualDirection.match(/(?:representing|showing|labeled?|into|with)\s*([^,.]+)/gi);
        if (labelMatch) {
          result.labels = labelMatch.map(m => 
            m.replace(/(?:representing|showing|labeled?|into|with)\s*/i, '').trim()
          ).filter(l => l.length > 0 && l.length < 50);
        }
      }
    }
    else if (lower.includes('network') || lower.includes('connected') || lower.includes('interconnected') || lower.includes('web')) {
      result.type = 'network';
      
      const parsed = this.parseNetworkFromNarration(narration);
      result.labels = parsed.nodes.map(n => n.label);
      result.connections = parsed.connections;
    }
    else if (lower.includes('transform') || lower.includes('morph') || lower.includes('change') || lower.includes('evolve')) {
      result.type = 'transformation';
    }
    else if (lower.includes('journey') || lower.includes('path') || lower.includes('road') || lower.includes('timeline')) {
      result.type = 'journey';
    }
    
    log.info('Detected metaphor type', { type: result.type, labelsCount: result.labels.length });
    
    return result;
  }

  detectMetaphorType(visualDirection: string): 'tree' | 'network' | 'transformation' | 'journey' | null {
    const lower = visualDirection.toLowerCase();
    
    if (lower.includes('tree') || lower.includes('root') || lower.includes('branch') || lower.includes('grow')) {
      return 'tree';
    }
    if (lower.includes('network') || lower.includes('connected') || lower.includes('web') || lower.includes('nodes')) {
      return 'network';
    }
    if (lower.includes('transform') || lower.includes('morph') || lower.includes('evolve')) {
      return 'transformation';
    }
    if (lower.includes('journey') || lower.includes('path') || lower.includes('road') || lower.includes('timeline')) {
      return 'journey';
    }
    
    return null;
  }

  async generateConfigFromDirection(
    visualDirection: string,
    narration: string,
    duration: number
  ): Promise<VisualMetaphorConfig | null> {
    const parsed = this.parseMetaphorFromDirection(visualDirection, narration);
    
    if (parsed.type === 'unknown') {
      return null;
    }
    
    switch (parsed.type) {
      case 'tree': {
        const { branchLabels, rootLabels, leafLabels, trunkLabel } = this.parseTreeLabelsFromNarration(narration);
        if (branchLabels.length === 0 && parsed.labels.length === 0) return null;
        return this.generateTreeConfig(
          branchLabels.length > 0 ? branchLabels : parsed.labels,
          rootLabels,
          duration,
          { leafLabels, trunkLabel }
        );
      }
      case 'network': {
        const networkData = this.parseNetworkFromNarration(narration);
        if (networkData.nodes.length < 2) return null;
        return this.generateNetworkConfig(
          networkData.nodes,
          networkData.connections,
          duration
        );
      }
      default:
        return null;
    }
  }

  private async getBrandColors(): Promise<BrandColors> {
    if (!this.brandBibleService) {
      try {
        const module = await import('./brand-bible-service');
        this.brandBibleService = module.brandBibleService;
      } catch (err) {
        log.debug('Brand bible service not available, using default colors');
        return this.defaultBrandColors;
      }
    }
    
    try {
      const bible = await this.brandBibleService.getBrandBible();
      return {
        primary: bible.colors?.primary || this.defaultBrandColors.primary,
        secondary: bible.colors?.secondary || this.defaultBrandColors.secondary,
        accent: bible.colors?.accent || this.defaultBrandColors.accent,
        text: bible.colors?.text || this.defaultBrandColors.text,
      };
    } catch (err) {
      log.debug('Failed to get brand bible, using default colors');
      return this.defaultBrandColors;
    }
  }
}

export const visualMetaphorService = new VisualMetaphorService();
export type { TreeGrowthConfig, NetworkVisualizationConfig, VisualMetaphorConfig };
