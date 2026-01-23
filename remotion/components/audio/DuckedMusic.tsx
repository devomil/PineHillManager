import React from 'react';
import { Audio, interpolate, useCurrentFrame } from 'remotion';

export interface VolumeKeyframe {
  time: number;
  volume: number;
}

interface DuckedMusicProps {
  musicUrl: string;
  baseVolume: number;
  volumeKeyframes: VolumeKeyframe[];
  fps: number;
  startFrom?: number;
}

export const DuckedMusic: React.FC<DuckedMusicProps> = ({
  musicUrl,
  baseVolume,
  volumeKeyframes,
  fps,
  startFrom = 0,
}) => {
  const frame = useCurrentFrame();
  const currentTime = frame / fps;
  
  let currentVolume = baseVolume;
  
  if (volumeKeyframes.length > 0) {
    const times = volumeKeyframes.map(k => k.time);
    const volumes = volumeKeyframes.map(k => k.volume);
    
    currentVolume = interpolate(
      currentTime,
      times,
      volumes,
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }
    );
  }
  
  if (!musicUrl) return null;
  
  return (
    <Audio
      src={musicUrl}
      volume={currentVolume}
      startFrom={startFrom}
    />
  );
};

export function generateDuckingKeyframes(
  voiceoverSegments: Array<{ startTime: number; endTime: number }>,
  baseVolume: number,
  duckedVolume: number,
  fadeTime: number = 0.3
): VolumeKeyframe[] {
  const keyframes: VolumeKeyframe[] = [];
  
  if (voiceoverSegments.length === 0) {
    return [{ time: 0, volume: baseVolume }];
  }
  
  keyframes.push({ time: 0, volume: baseVolume });
  
  for (const segment of voiceoverSegments) {
    keyframes.push({ time: segment.startTime - fadeTime, volume: baseVolume });
    keyframes.push({ time: segment.startTime, volume: duckedVolume });
    keyframes.push({ time: segment.endTime, volume: duckedVolume });
    keyframes.push({ time: segment.endTime + fadeTime, volume: baseVolume });
  }
  
  return keyframes;
}

export function generateSimpleDuckingKeyframes(
  totalDuration: number,
  baseVolume: number = 0.35,
  riseAtEnd: boolean = true
): VolumeKeyframe[] {
  const keyframes: VolumeKeyframe[] = [
    { time: 0, volume: baseVolume * 0.7 },
    { time: 1, volume: baseVolume },
  ];
  
  if (riseAtEnd && totalDuration > 5) {
    keyframes.push({ time: totalDuration - 4, volume: baseVolume });
    keyframes.push({ time: totalDuration - 2, volume: baseVolume * 1.2 });
    keyframes.push({ time: totalDuration, volume: baseVolume * 0.5 });
  }
  
  return keyframes;
}
