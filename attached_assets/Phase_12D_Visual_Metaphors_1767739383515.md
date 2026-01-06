# Phase 12D: Visual Metaphor Components

## Objective

Build Remotion components for abstract visual metaphors like tree growth, network visualizations, transformation sequences, and journey paths. These are essential for scenes that communicate abstract concepts visually.

## Prerequisites

- Phase 12A-C complete
- SVG rendering working in Remotion

## What This Phase Creates

- `remotion/components/motion-graphics/TreeGrowth.tsx` - Animated tree metaphor
- `remotion/components/motion-graphics/NetworkVisualization.tsx` - Connected nodes
- `remotion/components/motion-graphics/TransformationSequence.tsx` - Morph animations
- `remotion/components/motion-graphics/JourneyPath.tsx` - Path/journey visualization
- `server/services/visual-metaphor-service.ts` - Backend config generator

---

## Step 1: Create Tree Growth Component

Create `remotion/components/motion-graphics/TreeGrowth.tsx`:

```tsx
// remotion/components/motion-graphics/TreeGrowth.tsx

import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';

export interface TreeLabel {
  text: string;
  position: 'root' | 'branch' | 'leaf';
  branchIndex?: number;
}

export interface TreeGrowthProps {
  // Colors
  trunkColor: string;
  branchColor: string;
  leafColor: string;
  labelColor: string;
  backgroundColor: string;
  
  // Labels
  labels: TreeLabel[];
  rootLabels?: string[];
  
  // Style
  style: 'natural' | 'geometric' | 'minimal' | 'organic';
  rootsVisible: boolean;
  
  // Typography
  labelStyle: {
    fontSize: number;
    fontWeight: string | number;
    fontFamily: string;
  };
  
  // Animation
  growthDuration: number; // frames for full growth
  labelDelay: number; // frames after growth to show labels
}

export const TreeGrowth: React.FC<TreeGrowthProps> = ({
  trunkColor,
  branchColor,
  leafColor,
  labelColor,
  backgroundColor,
  labels,
  rootLabels = [],
  style,
  rootsVisible,
  labelStyle,
  growthDuration,
  labelDelay,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  
  // Growth progress (0 to 1)
  const growthProgress = Math.min(frame / growthDuration, 1);
  
  // Spring for smoother growth
  const springProgress = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 50 },
    durationInFrames: growthDuration,
  });
  
  const clampedGrowth = Math.min(springProgress, 1);
  
  // Label visibility
  const labelsVisible = frame > growthDuration + labelDelay;
  const labelOpacity = labelsVisible 
    ? Math.min((frame - growthDuration - labelDelay) / 30, 1) 
    : 0;
  
  // Exit animation
  const exitStartFrame = durationInFrames - Math.round(fps * 0.5);
  const exitOpacity = frame >= exitStartFrame
    ? interpolate(frame, [exitStartFrame, durationInFrames], [1, 0], { extrapolateRight: 'clamp' })
    : 1;
  
  // Tree dimensions
  const centerX = width / 2;
  const groundY = height * 0.7;
  const trunkHeight = height * 0.35 * clampedGrowth;
  const trunkWidth = 20;
  
  // Branch calculations
  const branchCount = 4;
  const branchLength = 120 * clampedGrowth;
  const branchStartY = groundY - trunkHeight * 0.4;
  
  return (
    <AbsoluteFill style={{ backgroundColor, opacity: exitOpacity }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Roots (if visible) */}
        {rootsVisible && clampedGrowth > 0.1 && (
          <g>
            {[-1, 0, 1].map((dir, i) => {
              const rootProgress = Math.max(0, (clampedGrowth - 0.1) / 0.3);
              const rootLength = 80 * rootProgress;
              const rootAngle = dir * 35;
              const endX = centerX + Math.sin(rootAngle * Math.PI / 180) * rootLength;
              const endY = groundY + Math.cos(rootAngle * Math.PI / 180) * rootLength * 0.5;
              
              return (
                <g key={`root-${i}`}>
                  <path
                    d={`M ${centerX} ${groundY} Q ${centerX + dir * 20} ${groundY + 30} ${endX} ${endY}`}
                    stroke={trunkColor}
                    strokeWidth={8 - i * 2}
                    fill="none"
                    strokeLinecap="round"
                    opacity={rootProgress}
                  />
                  
                  {/* Root label */}
                  {rootLabels[i] && labelOpacity > 0 && (
                    <text
                      x={endX + dir * 10}
                      y={endY + 20}
                      fill={labelColor}
                      fontSize={labelStyle.fontSize * 0.8}
                      fontFamily={labelStyle.fontFamily}
                      fontWeight={labelStyle.fontWeight}
                      textAnchor="middle"
                      opacity={labelOpacity}
                    >
                      {rootLabels[i]}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        )}
        
        {/* Trunk */}
        <rect
          x={centerX - trunkWidth / 2}
          y={groundY - trunkHeight}
          width={trunkWidth}
          height={trunkHeight}
          fill={trunkColor}
          rx={style === 'geometric' ? 0 : 4}
        />
        
        {/* Branches */}
        {clampedGrowth > 0.3 && (
          <g>
            {Array.from({ length: branchCount }).map((_, i) => {
              const branchProgress = Math.max(0, (clampedGrowth - 0.3 - i * 0.1) / 0.15);
              const side = i % 2 === 0 ? -1 : 1;
              const yOffset = i * 40;
              const startY = branchStartY - yOffset;
              const angle = side * (30 + i * 5);
              
              const endX = centerX + Math.cos(angle * Math.PI / 180) * branchLength * branchProgress * side;
              const endY = startY - Math.sin(Math.abs(angle) * Math.PI / 180) * branchLength * branchProgress * 0.5;
              
              const branchLabel = labels.find(l => l.position === 'branch' && l.branchIndex === i);
              
              return (
                <g key={`branch-${i}`} opacity={branchProgress}>
                  {/* Branch line */}
                  <path
                    d={`M ${centerX} ${startY} Q ${centerX + side * 30} ${startY - 20} ${endX} ${endY}`}
                    stroke={branchColor}
                    strokeWidth={6}
                    fill="none"
                    strokeLinecap="round"
                  />
                  
                  {/* Leaf cluster */}
                  {branchProgress > 0.5 && (
                    <circle
                      cx={endX}
                      cy={endY}
                      r={25 * (branchProgress - 0.5) * 2}
                      fill={leafColor}
                      opacity={0.9}
                    />
                  )}
                  
                  {/* Branch label */}
                  {branchLabel && labelOpacity > 0 && (
                    <text
                      x={endX + side * 40}
                      y={endY}
                      fill={labelColor}
                      fontSize={labelStyle.fontSize}
                      fontFamily={labelStyle.fontFamily}
                      fontWeight={labelStyle.fontWeight}
                      textAnchor={side === 1 ? 'start' : 'end'}
                      alignmentBaseline="middle"
                      opacity={labelOpacity}
                    >
                      {branchLabel.text}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        )}
        
        {/* Top canopy */}
        {clampedGrowth > 0.7 && (
          <ellipse
            cx={centerX}
            cy={groundY - trunkHeight - 30}
            rx={80 * ((clampedGrowth - 0.7) / 0.3)}
            ry={60 * ((clampedGrowth - 0.7) / 0.3)}
            fill={leafColor}
            opacity={0.9}
          />
        )}
        
        {/* Ground line */}
        <line
          x1={centerX - 200}
          y1={groundY}
          x2={centerX + 200}
          y2={groundY}
          stroke={trunkColor}
          strokeWidth={2}
          opacity={0.3}
        />
      </svg>
    </AbsoluteFill>
  );
};

export default TreeGrowth;
```

---

## Step 2: Create Network Visualization Component

Create `remotion/components/motion-graphics/NetworkVisualization.tsx`:

```tsx
// remotion/components/motion-graphics/NetworkVisualization.tsx

import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';

export interface NetworkNode {
  id: string;
  label: string;
  x?: number; // 0-100 percentage
  y?: number; // 0-100 percentage
  size?: number;
  color?: string;
}

export interface NetworkConnection {
  from: string;
  to: string;
  label?: string;
  animated?: boolean;
}

export interface NetworkVisualizationProps {
  nodes: NetworkNode[];
  connections: NetworkConnection[];
  
  // Layout
  layout: 'custom' | 'circular' | 'hierarchical' | 'force';
  
  // Node styling
  nodeStyle: {
    shape: 'circle' | 'square' | 'rounded';
    defaultSize: number;
    defaultColor: string;
    borderColor: string;
    borderWidth: number;
    labelColor: string;
  };
  
  // Connection styling
  connectionStyle: {
    color: string;
    width: number;
    animated: boolean;
  };
  
  // Label styling
  labelStyle: {
    fontSize: number;
    fontWeight: string | number;
    fontFamily: string;
  };
  
  // Animation
  animationType: 'nodes-first' | 'connections-first' | 'simultaneous';
  nodeDuration: number;
  connectionDuration: number;
  staggerDelay: number;
  
  // Background
  backgroundColor: string;
}

export const NetworkVisualization: React.FC<NetworkVisualizationProps> = ({
  nodes,
  connections,
  layout,
  nodeStyle,
  connectionStyle,
  labelStyle,
  animationType,
  nodeDuration,
  connectionDuration,
  staggerDelay,
  backgroundColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  
  // Calculate node positions based on layout
  const positionedNodes = React.useMemo(() => {
    if (layout === 'custom') {
      return nodes;
    }
    
    return nodes.map((node, i) => {
      let x: number, y: number;
      
      if (layout === 'circular') {
        const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
        const radius = 35;
        x = 50 + Math.cos(angle) * radius;
        y = 50 + Math.sin(angle) * radius;
      } else if (layout === 'hierarchical') {
        const levels = Math.ceil(Math.sqrt(nodes.length));
        const level = Math.floor(i / levels);
        const posInLevel = i % levels;
        const nodesInLevel = Math.min(levels, nodes.length - level * levels);
        x = 20 + (posInLevel / (nodesInLevel - 1 || 1)) * 60;
        y = 20 + (level / (levels - 1 || 1)) * 60;
      } else {
        // Force-directed simplified
        const cols = Math.ceil(Math.sqrt(nodes.length));
        const row = Math.floor(i / cols);
        const col = i % cols;
        x = 20 + (col / (cols - 1 || 1)) * 60;
        y = 20 + (row / (Math.ceil(nodes.length / cols) - 1 || 1)) * 60;
      }
      
      return { ...node, x, y };
    });
  }, [nodes, layout]);
  
  // Animation timing
  const nodesStartFrame = animationType === 'connections-first' ? connectionDuration + staggerDelay * connections.length : 0;
  const connectionsStartFrame = animationType === 'nodes-first' ? nodeDuration + staggerDelay * nodes.length : 0;
  
  // Exit animation
  const exitStartFrame = durationInFrames - Math.round(fps * 0.5);
  const exitOpacity = frame >= exitStartFrame
    ? interpolate(frame, [exitStartFrame, durationInFrames], [1, 0], { extrapolateRight: 'clamp' })
    : 1;
  
  return (
    <AbsoluteFill style={{ backgroundColor, opacity: exitOpacity }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Connections */}
        <g>
          {connections.map((conn, i) => {
            const fromNode = positionedNodes.find(n => n.id === conn.from);
            const toNode = positionedNodes.find(n => n.id === conn.to);
            
            if (!fromNode || !toNode) return null;
            
            const startFrame = connectionsStartFrame + i * staggerDelay;
            const localFrame = frame - startFrame;
            const progress = localFrame < 0 ? 0 : Math.min(localFrame / connectionDuration, 1);
            
            const x1 = (fromNode.x || 50) * width / 100;
            const y1 = (fromNode.y || 50) * height / 100;
            const x2 = (toNode.x || 50) * width / 100;
            const y2 = (toNode.y || 50) * height / 100;
            
            // Animated line drawing
            const lineLength = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
            const dashOffset = lineLength * (1 - progress);
            
            return (
              <g key={`conn-${i}`}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={connectionStyle.color}
                  strokeWidth={connectionStyle.width}
                  strokeDasharray={lineLength}
                  strokeDashoffset={dashOffset}
                  opacity={progress}
                />
                
                {/* Connection label */}
                {conn.label && progress > 0.5 && (
                  <text
                    x={(x1 + x2) / 2}
                    y={(y1 + y2) / 2 - 10}
                    fill={nodeStyle.labelColor}
                    fontSize={labelStyle.fontSize * 0.8}
                    fontFamily={labelStyle.fontFamily}
                    textAnchor="middle"
                    opacity={(progress - 0.5) * 2}
                  >
                    {conn.label}
                  </text>
                )}
              </g>
            );
          })}
        </g>
        
        {/* Nodes */}
        <g>
          {positionedNodes.map((node, i) => {
            const startFrame = nodesStartFrame + i * staggerDelay;
            const localFrame = frame - startFrame;
            
            const springVal = localFrame >= 0 ? spring({
              frame: localFrame,
              fps,
              config: { damping: 12, stiffness: 200 },
            }) : 0;
            
            const scale = Math.min(springVal, 1);
            const opacity = localFrame < 0 ? 0 : Math.min(localFrame / 10, 1);
            
            const cx = (node.x || 50) * width / 100;
            const cy = (node.y || 50) * height / 100;
            const size = (node.size || nodeStyle.defaultSize) * scale;
            
            return (
              <g key={node.id} opacity={opacity}>
                {/* Node shape */}
                {nodeStyle.shape === 'circle' && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={size / 2}
                    fill={node.color || nodeStyle.defaultColor}
                    stroke={nodeStyle.borderColor}
                    strokeWidth={nodeStyle.borderWidth}
                  />
                )}
                
                {nodeStyle.shape === 'square' && (
                  <rect
                    x={cx - size / 2}
                    y={cy - size / 2}
                    width={size}
                    height={size}
                    fill={node.color || nodeStyle.defaultColor}
                    stroke={nodeStyle.borderColor}
                    strokeWidth={nodeStyle.borderWidth}
                  />
                )}
                
                {nodeStyle.shape === 'rounded' && (
                  <rect
                    x={cx - size / 2}
                    y={cy - size / 2}
                    width={size}
                    height={size}
                    rx={size * 0.2}
                    fill={node.color || nodeStyle.defaultColor}
                    stroke={nodeStyle.borderColor}
                    strokeWidth={nodeStyle.borderWidth}
                  />
                )}
                
                {/* Node label */}
                <text
                  x={cx}
                  y={cy + size / 2 + 20}
                  fill={nodeStyle.labelColor}
                  fontSize={labelStyle.fontSize}
                  fontWeight={labelStyle.fontWeight}
                  fontFamily={labelStyle.fontFamily}
                  textAnchor="middle"
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </AbsoluteFill>
  );
};

export default NetworkVisualization;
```

---

## Step 3: Create Visual Metaphor Service

Create `server/services/visual-metaphor-service.ts`:

```typescript
// server/services/visual-metaphor-service.ts

import { 
  TreeGrowthConfig, 
  NetworkVisualizationConfig,
  MotionGraphicType 
} from '../../shared/types/motion-graphics-types';
import { brandBibleService } from './brand-bible-service';

class VisualMetaphorService {
  
  /**
   * Generate tree growth configuration from content
   */
  async generateTreeConfig(
    labels: string[],
    rootLabels: string[],
    duration: number
  ): Promise<TreeGrowthConfig> {
    const brandColors = await this.getBrandColors();
    const fps = 30;
    
    return {
      type: 'tree-growth',
      duration,
      fps,
      width: 1920,
      height: 1080,
      backgroundColor: '#FFFFFF',
      brandColors,
      trunkColor: brandColors.accent,
      branchColor: brandColors.primary,
      leafColor: brandColors.secondary,
      labels: labels.map((text, i) => ({
        text,
        position: 'branch' as const,
        branchIndex: i,
      })),
      rootLabels,
      growthDuration: Math.round(fps * duration * 0.6),
      style: 'organic',
      rootsVisible: rootLabels.length > 0,
    };
  }
  
  /**
   * Generate network visualization configuration
   */
  async generateNetworkConfig(
    nodes: Array<{ id: string; label: string }>,
    connections: Array<{ from: string; to: string; label?: string }>,
    duration: number
  ): Promise<NetworkVisualizationConfig> {
    const brandColors = await this.getBrandColors();
    const fps = 30;
    
    return {
      type: 'network-visualization',
      duration,
      fps,
      width: 1920,
      height: 1080,
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
      layout: 'circular',
      nodeStyle: {
        shape: 'circle',
        defaultSize: 60,
        defaultColor: brandColors.primary,
      },
      connectionStyle: {
        color: brandColors.secondary,
        width: 3,
        animated: true,
      },
      animationType: 'nodes-first',
    };
  }
  
  /**
   * Parse visual direction to determine metaphor type and content
   */
  parseMetaphorFromDirection(
    visualDirection: string,
    narration: string
  ): {
    type: 'tree' | 'network' | 'transformation' | 'journey' | 'unknown';
    labels: string[];
    connections: Array<{ from: string; to: string }>;
  } {
    const lower = visualDirection.toLowerCase();
    const result = {
      type: 'unknown' as const,
      labels: [] as string[],
      connections: [] as Array<{ from: string; to: string }>,
    };
    
    // Detect tree metaphor
    if (lower.includes('tree') || lower.includes('root') || lower.includes('branch')) {
      result.type = 'tree';
      
      // Extract labels from direction
      const labelMatch = visualDirection.match(/(?:representing|showing|labeled?|into)\s*([^,.]+)/gi);
      if (labelMatch) {
        result.labels = labelMatch.map(m => 
          m.replace(/(?:representing|showing|labeled?|into)\s*/i, '').trim()
        );
      }
      
      // Try to extract from narration bullet points
      if (result.labels.length === 0) {
        const bullets = narration.match(/[•\-\*]\s*([^•\-\*\n]+)/g);
        if (bullets) {
          result.labels = bullets.map(b => b.replace(/^[•\-\*]\s*/, '').trim());
        }
      }
    }
    
    // Detect network metaphor
    else if (lower.includes('network') || lower.includes('connected') || lower.includes('interconnected')) {
      result.type = 'network';
      
      // Extract node labels
      const nodeMatch = visualDirection.match(/(?:nodes?|elements?|factors?|components?)[\s:]+([^.]+)/i);
      if (nodeMatch) {
        result.labels = nodeMatch[1].split(/,|and/).map(s => s.trim()).filter(Boolean);
      }
    }
    
    // Detect transformation metaphor
    else if (lower.includes('transform') || lower.includes('morph') || lower.includes('change')) {
      result.type = 'transformation';
    }
    
    // Detect journey metaphor
    else if (lower.includes('journey') || lower.includes('path') || lower.includes('road')) {
      result.type = 'journey';
    }
    
    return result;
  }
  
  /**
   * Get brand colors
   */
  private async getBrandColors() {
    try {
      const bible = await brandBibleService.getBrandBible();
      return {
        primary: bible.colors?.primary || '#2D5A27',
        secondary: bible.colors?.secondary || '#D4A574',
        accent: bible.colors?.accent || '#8B4513',
        text: bible.colors?.text || '#FFFFFF',
      };
    } catch {
      return {
        primary: '#2D5A27',
        secondary: '#D4A574',
        accent: '#8B4513',
        text: '#FFFFFF',
      };
    }
  }
}

export const visualMetaphorService = new VisualMetaphorService();
```

---

## Step 4: Update Index Exports

Update `remotion/components/motion-graphics/index.ts` to include new components:

```typescript
// Add to existing exports
export { TreeGrowth, type TreeGrowthProps, type TreeLabel } from './TreeGrowth';
export { NetworkVisualization, type NetworkVisualizationProps, type NetworkNode, type NetworkConnection } from './NetworkVisualization';
```

---

## Verification Checklist

Before moving to Phase 12E, confirm:

- [ ] `TreeGrowth.tsx` renders animated tree with labels
- [ ] `NetworkVisualization.tsx` renders nodes and connections
- [ ] Visual metaphor service parses content correctly
- [ ] Brand colors are applied to metaphor components
- [ ] SVG animations render smoothly
- [ ] Exit animations work correctly
- [ ] Labels appear with proper timing
- [ ] All components export from index.ts

---

## Next Phase

Once visual metaphor components are working, proceed to **Phase 12E: Split-Screen Compositor** to build multi-panel layouts.
