import React from 'react';
import { Audio, Sequence, useVideoConfig } from 'remotion';
import { SoundEffect, SOUND_EFFECTS, getSoundForTransition, TransitionConfig } from '../../../shared/config/sound-design';

interface SoundDesignLayerProps {
  transitions: Array<{
    config: TransitionConfig;
    startFrame: number;
  }>;
  logoRevealFrame?: number;
  ctaStartFrame?: number;
  enableAmbient: boolean;
  ambientType?: 'warm' | 'nature';
  masterVolume?: number;
}

export const SoundDesignLayer: React.FC<SoundDesignLayerProps> = ({
  transitions,
  logoRevealFrame,
  ctaStartFrame,
  enableAmbient,
  ambientType = 'warm',
  masterVolume = 1.0,
}) => {
  const { fps } = useVideoConfig();
  
  const applyMasterVolume = (volume: number) => volume * masterVolume;
  
  const ambientSoundKey = ambientType === 'nature' ? 'room-tone-nature' : 'room-tone-warm';
  const ambientSound = SOUND_EFFECTS[ambientSoundKey];
  const logoSound = SOUND_EFFECTS['logo-reveal'];
  const riseSound = SOUND_EFFECTS['rise-swell'];
  
  return (
    <>
      {transitions.map((transition, index) => {
        const sound = getSoundForTransition(transition.config.type);
        if (!sound) return null;
        
        return (
          <Sequence key={`trans-${index}`} from={transition.startFrame}>
            <Audio
              src={sound.file}
              volume={applyMasterVolume(sound.volume)}
              startFrom={0}
            />
          </Sequence>
        );
      })}
      
      {logoRevealFrame !== undefined && logoRevealFrame > 0 && logoSound && (
        <Sequence from={logoRevealFrame}>
          <Audio
            src={logoSound.file}
            volume={applyMasterVolume(logoSound.volume)}
          />
        </Sequence>
      )}
      
      {ctaStartFrame !== undefined && ctaStartFrame > 0 && riseSound && (
        <Sequence from={ctaStartFrame - Math.round(3 * fps)}>
          <Audio
            src={riseSound.file}
            volume={applyMasterVolume(riseSound.volume)}
          />
        </Sequence>
      )}
      
      {enableAmbient && ambientSound && (
        <Audio
          src={ambientSound.file}
          volume={applyMasterVolume(ambientSound.volume)}
          loop
        />
      )}
    </>
  );
};
