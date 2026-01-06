# Phase 12C: Animated Infographics

## Objective

Build Remotion components for animated data visualizations including stat counters, progress bars, and process flows. These are essential for scenes that communicate statistics, processes, or comparative information.

## Prerequisites

- Phase 12A complete (motion graphics router)
- Phase 12B complete (kinetic typography)
- Remotion components structure exists

## What This Phase Creates

- `remotion/components/motion-graphics/StatCounter.tsx` - Animated number counters
- `remotion/components/motion-graphics/ProgressBar.tsx` - Animated progress indicators
- `remotion/components/motion-graphics/ProcessFlow.tsx` - Step-by-step flow diagrams
- `server/services/infographic-generator-service.ts` - Backend config generator

---

## Step 1: Create Stat Counter Component

Create `remotion/components/motion-graphics/StatCounter.tsx`:

```tsx
// remotion/components/motion-graphics/StatCounter.tsx

import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from 'remotion';

export interface StatItem {
  value: number;
  label: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  color?: string;
}

export interface StatCounterProps {
  stats: StatItem[];
  layout: 'horizontal' | 'vertical' | 'grid';
  
  // Timing
  animationDuration: number;
  staggerDelay: number;
  holdDuration: number;
  
  // Number styling
  numberStyle: {
    fontSize: number;
    fontWeight: string | number;
    fontFamily: string;
    color: string;
  };
  
  // Label styling
  labelStyle: {
    fontSize: number;
    fontWeight: string | number;
    fontFamily: string;
    color: string;
  };
  
  // Container styling
  backgroundColor?: string;
  showBackground?: boolean;
  backgroundOpacity?: number;
  backgroundRadius?: number;
  itemSpacing?: number;
  
  // Animation
  countEasing: 'linear' | 'ease-out' | 'ease-in-out' | 'spring';
  entranceAnimation: 'fade' | 'slide-up' | 'scale' | 'none';
}

export const StatCounter: React.FC<StatCounterProps> = ({
  stats,
  layout,
  animationDuration,
  staggerDelay,
  holdDuration,
  numberStyle,
  labelStyle,
  backgroundColor = '#FFFFFF',
  showBackground = true,
  backgroundOpacity = 0.95,
  backgroundRadius = 16,
  itemSpacing = 60,
  countEasing,
  entranceAnimation,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  
  const totalEntranceTime = animationDuration + (stats.length - 1) * staggerDelay;
  const exitStartFrame = totalEntranceTime + holdDuration;
  const exitDuration = Math.round(fps * 0.5);
  
  const exitOpacity = frame >= exitStartFrame
    ? interpolate(frame, [exitStartFrame, exitStartFrame + exitDuration], [1, 0], { extrapolateRight: 'clamp' })
    : 1;
  
  const layoutStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: layout === 'vertical' ? 'column' : 'row',
    flexWrap: layout === 'grid' ? 'wrap' : 'nowrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: itemSpacing,
    padding: 40,
  };
  
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', opacity: exitOpacity }}>
      {showBackground && (
        <div style={{
          position: 'absolute',
          backgroundColor,
          opacity: backgroundOpacity,
          borderRadius: backgroundRadius,
          padding: 60,
        }} />
      )}
      
      <div style={layoutStyles}>
        {stats.map((stat, index) => (
          <StatItemComponent
            key={index}
            stat={stat}
            index={index}
            frame={frame}
            fps={fps}
            animationDuration={animationDuration}
            staggerDelay={staggerDelay}
            numberStyle={numberStyle}
            labelStyle={labelStyle}
            countEasing={countEasing}
            entranceAnimation={entranceAnimation}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};

const StatItemComponent: React.FC<{
  stat: StatItem;
  index: number;
  frame: number;
  fps: number;
  animationDuration: number;
  staggerDelay: number;
  numberStyle: StatCounterProps['numberStyle'];
  labelStyle: StatCounterProps['labelStyle'];
  countEasing: StatCounterProps['countEasing'];
  entranceAnimation: StatCounterProps['entranceAnimation'];
}> = ({ stat, index, frame, fps, animationDuration, staggerDelay, numberStyle, labelStyle, countEasing, entranceAnimation }) => {
  const startFrame = index * staggerDelay;
  const localFrame = frame - startFrame;
  
  if (localFrame < 0) {
    return <div style={{ opacity: 0, textAlign: 'center' }}>
      <div style={{ ...numberStyle }}>0</div>
      <div style={{ ...labelStyle }}>{stat.label}</div>
    </div>;
  }
  
  const countProgress = Math.min(localFrame / animationDuration, 1);
  
  let easedProgress: number;
  switch (countEasing) {
    case 'ease-out':
      easedProgress = Easing.out(Easing.cubic)(countProgress);
      break;
    case 'ease-in-out':
      easedProgress = Easing.inOut(Easing.cubic)(countProgress);
      break;
    case 'spring':
      easedProgress = Math.min(spring({ frame: localFrame, fps, config: { damping: 20, stiffness: 100 } }), 1);
      break;
    default:
      easedProgress = countProgress;
  }
  
  const currentValue = stat.value * easedProgress;
  const displayValue = stat.decimals !== undefined
    ? currentValue.toFixed(stat.decimals)
    : Math.round(currentValue).toString();
  
  let entranceOpacity = 1;
  let entranceTransform = '';
  const entranceProgress = Math.min(localFrame / 15, 1);
  
  switch (entranceAnimation) {
    case 'fade':
      entranceOpacity = entranceProgress;
      break;
    case 'slide-up':
      entranceOpacity = entranceProgress;
      entranceTransform = `translateY(${(1 - entranceProgress) * 30}px)`;
      break;
    case 'scale':
      entranceOpacity = entranceProgress;
      entranceTransform = `scale(${0.5 + entranceProgress * 0.5})`;
      break;
  }
  
  return (
    <div style={{ textAlign: 'center', opacity: entranceOpacity, transform: entranceTransform }}>
      <div style={{
        fontSize: numberStyle.fontSize,
        fontWeight: numberStyle.fontWeight,
        fontFamily: numberStyle.fontFamily,
        color: stat.color || numberStyle.color,
        lineHeight: 1.1,
      }}>
        {stat.prefix || ''}{displayValue}{stat.suffix || ''}
      </div>
      <div style={{
        fontSize: labelStyle.fontSize,
        fontWeight: labelStyle.fontWeight,
        fontFamily: labelStyle.fontFamily,
        color: labelStyle.color,
        marginTop: 8,
      }}>
        {stat.label}
      </div>
    </div>
  );
};

export default StatCounter;
```

---

## Step 2: Create Progress Bar Component

Create `remotion/components/motion-graphics/ProgressBar.tsx`:

```tsx
// remotion/components/motion-graphics/ProgressBar.tsx

import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

export interface ProgressBarItem {
  label: string;
  value: number;
  color?: string;
}

export interface ProgressBarProps {
  items: ProgressBarItem[];
  layout: 'horizontal' | 'vertical';
  barHeight: number;
  barWidth: number | 'full';
  barRadius: number;
  backgroundColor: string;
  fillColor: string;
  labelStyle: { fontSize: number; fontWeight: string | number; fontFamily: string; color: string };
  showValue: boolean;
  valuePosition: 'inside' | 'outside' | 'end';
  valueStyle: { fontSize: number; fontWeight: string | number; color: string };
  animationDuration: number;
  staggerDelay: number;
  animationStyle: 'linear' | 'spring' | 'ease-out';
  itemSpacing: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  items, layout, barHeight, barWidth, barRadius, backgroundColor, fillColor,
  labelStyle, showValue, valuePosition, valueStyle, animationDuration, staggerDelay, animationStyle, itemSpacing,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  
  const totalAnimationTime = animationDuration + (items.length - 1) * staggerDelay;
  const holdFrames = durationInFrames - totalAnimationTime - Math.round(fps * 0.5);
  const exitStartFrame = totalAnimationTime + holdFrames;
  
  const exitOpacity = frame >= exitStartFrame
    ? interpolate(frame, [exitStartFrame, durationInFrames], [1, 0], { extrapolateRight: 'clamp' })
    : 1;
  
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: '10%', opacity: exitOpacity }}>
      <div style={{
        display: 'flex',
        flexDirection: layout === 'vertical' ? 'column' : 'row',
        gap: itemSpacing,
        width: '100%',
        maxWidth: 1200,
      }}>
        {items.map((item, index) => {
          const startFrame = index * staggerDelay;
          const localFrame = frame - startFrame;
          
          let fillProgress = 0;
          if (localFrame >= 0) {
            const rawProgress = Math.min(localFrame / animationDuration, 1);
            switch (animationStyle) {
              case 'spring':
                fillProgress = Math.min(spring({ frame: localFrame, fps, config: { damping: 15, stiffness: 100 } }), 1);
                break;
              case 'ease-out':
                fillProgress = 1 - Math.pow(1 - rawProgress, 3);
                break;
              default:
                fillProgress = rawProgress;
            }
          }
          
          const currentValue = Math.round(item.value * fillProgress);
          const entranceOpacity = localFrame < 0 ? 0 : Math.min(localFrame / 10, 1);
          
          return (
            <div key={index} style={{ flex: layout === 'horizontal' ? 1 : 'none', opacity: entranceOpacity }}>
              <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ ...labelStyle }}>{item.label}</span>
                {showValue && valuePosition === 'outside' && (
                  <span style={{ ...valueStyle }}>{currentValue}%</span>
                )}
              </div>
              <div style={{
                height: barHeight,
                width: barWidth === 'full' ? '100%' : barWidth,
                backgroundColor,
                borderRadius: barRadius,
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${item.value * fillProgress}%`,
                  backgroundColor: item.color || fillColor,
                  borderRadius: barRadius,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingRight: valuePosition === 'inside' ? 8 : 0,
                }}>
                  {showValue && valuePosition === 'inside' && fillProgress > 0.15 && (
                    <span style={{ ...valueStyle, color: '#FFFFFF' }}>{currentValue}%</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export default ProgressBar;
```

---

## Step 3: Create Process Flow Component

Create `remotion/components/motion-graphics/ProcessFlow.tsx`:

```tsx
// remotion/components/motion-graphics/ProcessFlow.tsx

import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

export interface ProcessStep {
  title: string;
  description?: string;
  icon?: string;
}

export interface ProcessFlowProps {
  steps: ProcessStep[];
  layout: 'horizontal' | 'vertical';
  stepStyle: {
    shape: 'circle' | 'square' | 'rounded';
    size: number;
    backgroundColor: string;
    borderColor: string;
    borderWidth: number;
    textColor: string;
  };
  connectorStyle: { type: 'line' | 'arrow' | 'dotted'; color: string; width: number };
  titleStyle: { fontSize: number; fontWeight: string | number; fontFamily: string; color: string };
  descriptionStyle: { fontSize: number; fontWeight: string | number; fontFamily: string; color: string };
  animationType: 'sequential' | 'simultaneous';
  stepDuration: number;
  stepSpacing: number;
  showNumbers: boolean;
}

export const ProcessFlow: React.FC<ProcessFlowProps> = ({
  steps, layout, stepStyle, connectorStyle, titleStyle, descriptionStyle,
  animationType, stepDuration, stepSpacing, showNumbers,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  
  const exitStartFrame = durationInFrames - Math.round(fps * 0.5);
  const exitOpacity = frame >= exitStartFrame
    ? interpolate(frame, [exitStartFrame, durationInFrames], [1, 0], { extrapolateRight: 'clamp' })
    : 1;
  
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: '8%', opacity: exitOpacity }}>
      <div style={{
        display: 'flex',
        flexDirection: layout === 'horizontal' ? 'row' : 'column',
        alignItems: 'center',
        gap: stepSpacing,
      }}>
        {steps.map((step, index) => {
          const startFrame = animationType === 'simultaneous' ? 0 : index * stepDuration;
          const localFrame = frame - startFrame;
          
          const progress = localFrame < 0 ? 0 : Math.min(localFrame / 20, 1);
          const springProgress = localFrame >= 0 ? spring({
            frame: localFrame, fps, config: { damping: 12, stiffness: 200 },
          }) : 0;
          
          const getShapeRadius = () => {
            switch (stepStyle.shape) {
              case 'circle': return '50%';
              case 'rounded': return stepStyle.size * 0.2;
              default: return 0;
            }
          };
          
          return (
            <React.Fragment key={index}>
              <div style={{
                display: 'flex',
                flexDirection: layout === 'horizontal' ? 'column' : 'row',
                alignItems: 'center',
                gap: 12,
                opacity: progress,
                transform: `scale(${0.5 + Math.min(springProgress, 1) * 0.5})`,
              }}>
                <div style={{
                  width: stepStyle.size,
                  height: stepStyle.size,
                  backgroundColor: stepStyle.backgroundColor,
                  border: `${stepStyle.borderWidth}px solid ${stepStyle.borderColor}`,
                  borderRadius: getShapeRadius(),
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  fontSize: stepStyle.size * 0.4,
                  color: stepStyle.textColor,
                  fontWeight: 'bold',
                }}>
                  {step.icon || (showNumbers ? index + 1 : '')}
                </div>
                <div style={{ textAlign: layout === 'horizontal' ? 'center' : 'left', maxWidth: 150 }}>
                  <div style={{ ...titleStyle }}>{step.title}</div>
                  {step.description && <div style={{ ...descriptionStyle, marginTop: 4 }}>{step.description}</div>}
                </div>
              </div>
              
              {index < steps.length - 1 && (
                <div style={{
                  width: layout === 'horizontal' ? 60 * progress : connectorStyle.width,
                  height: layout === 'horizontal' ? connectorStyle.width : 60 * progress,
                  backgroundColor: connectorStyle.color,
                  opacity: progress,
                }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export default ProcessFlow;
```

---

## Step 4: Create Infographic Generator Service

Create `server/services/infographic-generator-service.ts`:

```typescript
// server/services/infographic-generator-service.ts

import { StatCounterConfig, ProcessFlowConfig } from '../../shared/types/motion-graphics-types';
import { brandBibleService } from './brand-bible-service';

class InfographicGeneratorService {
  
  async generateStatCounterConfig(
    stats: Array<{ value: number; label: string; suffix?: string }>,
    duration: number
  ): Promise<StatCounterConfig> {
    const brandColors = await this.getBrandColors();
    const fps = 30;
    
    return {
      type: 'stat-counter',
      duration,
      fps,
      width: 1920,
      height: 1080,
      backgroundColor: '#FFFFFF',
      brandColors,
      stats: stats.map(s => ({ ...s, color: brandColors.primary })),
      layout: stats.length <= 3 ? 'horizontal' : 'grid',
      animationDuration: Math.round(fps * 2),
      staggerDelay: Math.round(fps * 0.3),
      numberStyle: {
        fontSize: 96,
        fontWeight: '800',
        fontFamily: 'Inter, sans-serif',
        color: brandColors.primary,
      },
      labelStyle: {
        fontSize: 24,
        fontWeight: '500',
        fontFamily: 'Inter, sans-serif',
        color: brandColors.accent,
      },
      countEasing: 'ease-out',
      entranceAnimation: 'scale',
    };
  }
  
  async generateProcessFlowConfig(
    steps: Array<{ title: string; description?: string }>,
    duration: number
  ): Promise<ProcessFlowConfig> {
    const brandColors = await this.getBrandColors();
    const fps = 30;
    
    return {
      type: 'process-flow',
      duration,
      fps,
      width: 1920,
      height: 1080,
      backgroundColor: '#FFFFFF',
      brandColors,
      steps,
      layout: steps.length <= 4 ? 'horizontal' : 'vertical',
      connectorStyle: { type: 'arrow', color: brandColors.secondary, width: 3 },
      stepStyle: {
        shape: 'circle',
        size: 80,
        backgroundColor: brandColors.primary,
        borderColor: brandColors.secondary,
        borderWidth: 3,
        textColor: '#FFFFFF',
      },
      titleStyle: {
        fontSize: 20,
        fontWeight: '600',
        fontFamily: 'Inter, sans-serif',
        color: brandColors.primary,
      },
      descriptionStyle: {
        fontSize: 14,
        fontWeight: '400',
        fontFamily: 'Inter, sans-serif',
        color: brandColors.accent,
      },
      animationType: 'sequential',
      stepDuration: Math.round(fps * 1.5),
      stepSpacing: 40,
      showNumbers: true,
    };
  }
  
  parseStatsFromNarration(narration: string): Array<{ value: number; label: string; suffix: string }> {
    const stats: Array<{ value: number; label: string; suffix: string }> = [];
    const pattern = /(\d+(?:\.\d+)?)\s*(%|\+|million|billion|thousand)?\s+([a-zA-Z\s]+)/gi;
    
    let match;
    while ((match = pattern.exec(narration)) !== null) {
      const value = parseFloat(match[1].replace(',', ''));
      const suffix = match[2] || '';
      const label = match[3].trim();
      
      if (!isNaN(value) && label.length > 0 && label.length < 50) {
        stats.push({ value, label, suffix });
      }
    }
    
    return stats.slice(0, 4);
  }
  
  parseStepsFromNarration(narration: string): Array<{ title: string; description?: string }> {
    const steps: Array<{ title: string; description?: string }> = [];
    const patterns = [
      /(?:step\s*\d+[:\s]+)([^.!?]+)/gi,
      /(?:first|second|third|fourth|fifth|finally)[,:\s]+([^.!?]+)/gi,
      /(?:[•\-\*]\s*)([^•\-\*\n]+)/g,
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(narration)) !== null) {
        const title = match[1].trim();
        if (title.length > 0 && title.length < 100) {
          steps.push({ title });
        }
      }
      if (steps.length > 0) break;
    }
    
    return steps.slice(0, 6);
  }
  
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

export const infographicGeneratorService = new InfographicGeneratorService();
```

---

## Step 5: Update Index Exports

Update `remotion/components/motion-graphics/index.ts`:

```typescript
// Add to existing exports
export { StatCounter, type StatCounterProps, type StatItem } from './StatCounter';
export { ProgressBar, type ProgressBarProps, type ProgressBarItem } from './ProgressBar';
export { ProcessFlow, type ProcessFlowProps, type ProcessStep } from './ProcessFlow';
```

---

## Verification Checklist

- [ ] StatCounter renders animated counting numbers
- [ ] ProgressBar renders animated fill bars
- [ ] ProcessFlow renders sequential steps with connectors
- [ ] Stats parsing extracts numbers from narration
- [ ] Brand colors are applied correctly
- [ ] Exit animations work
- [ ] All components export from index.ts

---

## Next Phase

Proceed to **Phase 12D: Visual Metaphor Components** to build tree growth, network visualizations, and transformation sequences.
