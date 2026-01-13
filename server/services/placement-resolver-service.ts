import {
  resolvePosition,
  resolveScale,
  getI2IConfig,
  getI2VConfig,
} from '@shared/config/placement-resolver';
import { getAssetType } from '@shared/brand-asset-types';

export interface ResolvedPosition {
  x: number;
  y: number;
  anchor: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
}

export interface ResolvedScale {
  value: number;
  maxWidth: number;
  maxHeight: number;
  minWidth: number;
}

export interface I2IConfig {
  strength: number;
  guidanceScale: number;
  preserveComposition: boolean;
  description: string;
}

export interface I2VConfig {
  motionPrompt: string;
  motionIntensity: 'subtle' | 'moderate' | 'dynamic';
  cameraMovement: string;
  duration: number;
  fps: number;
}

export interface ResolvedPlacementRules {
  position: ResolvedPosition;
  scale: ResolvedScale;
  opacity: number;
  i2i: I2IConfig;
  i2v: I2VConfig;
  assetType: string;
  assetCategory: string;
  canUseI2V: boolean;
  canComposite: boolean;
}

export function resolvePlacementRules(
  assetTypeId: string,
  options: {
    frameWidth?: number;
    frameHeight?: number;
    sceneDuration?: number;
    useCase?: 'background-generation' | 'style-transfer' | 'scene-integration' | 'product-placement';
  } = {}
): ResolvedPlacementRules {
  
  const {
    frameWidth = 1920,
    frameHeight = 1080,
    sceneDuration = 5,
    useCase = 'scene-integration',
  } = options;
  
  const assetTypeDef = getAssetType(assetTypeId);
  
  if (!assetTypeDef) {
    console.warn(`[PlacementResolver] Unknown asset type: ${assetTypeId}`);
    return getDefaultPlacementRules(frameWidth, frameHeight, sceneDuration);
  }
  
  const rules = assetTypeDef.placementRules;
  
  const position = resolvePosition(rules.typicalPosition, frameWidth, frameHeight);
  const scale = resolveScale(rules.typicalScale, frameWidth, frameHeight);
  const opacity = rules.typicalOpacity ?? 1.0;
  const i2i = getI2IConfig(assetTypeDef.category, assetTypeId, useCase);
  const i2v = getI2VConfig(
    rules.animationStyle || 'ken-burns',
    assetTypeDef.category,
    sceneDuration
  );
  
  console.log(`[PlacementResolver] Resolved rules for ${assetTypeId}:`);
  console.log(`  Position: ${rules.typicalPosition} → (${position.x}, ${position.y})`);
  console.log(`  Scale: ${rules.typicalScale} → ${scale.value}`);
  console.log(`  Opacity: ${opacity}`);
  console.log(`  I2I Strength: ${i2i.strength}`);
  console.log(`  I2V Motion: ${i2v.motionIntensity}`);
  
  return {
    position,
    scale,
    opacity,
    i2i,
    i2v,
    assetType: assetTypeId,
    assetCategory: assetTypeDef.category,
    canUseI2V: rules.canBeAnimated,
    canComposite: rules.canBeComposited,
  };
}

function getDefaultPlacementRules(
  frameWidth: number,
  frameHeight: number,
  sceneDuration: number
): ResolvedPlacementRules {
  return {
    position: { x: 50, y: 50, anchor: 'center' },
    scale: {
      value: 0.5,
      maxWidth: frameWidth * 0.5,
      maxHeight: frameHeight * 0.5,
      minWidth: frameWidth * 0.2,
    },
    opacity: 1.0,
    i2i: {
      strength: 0.5,
      guidanceScale: 7.0,
      preserveComposition: true,
      description: 'Default settings',
    },
    i2v: {
      motionPrompt: 'subtle camera movement, gentle ambient motion',
      motionIntensity: 'subtle',
      cameraMovement: 'slow push',
      duration: sceneDuration,
      fps: 24,
    },
    assetType: 'unknown',
    assetCategory: 'unknown',
    canUseI2V: true,
    canComposite: true,
  };
}

export function buildMotionPrompt(visualDirection: string, i2vConfig: I2VConfig): string {
  const hasExplicitMotion = /pan|zoom|track|dolly|orbit/i.test(visualDirection);
  
  if (hasExplicitMotion) {
    return visualDirection;
  }
  
  return `${i2vConfig.motionPrompt}. ${i2vConfig.cameraMovement}`;
}
