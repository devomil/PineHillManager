import { useRef, useCallback } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

interface DotLottieAnimationProps {
  src: string;
  loop?: boolean;
  autoplay?: boolean;
  speed?: number;
  className?: string;
  onComplete?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onFrameChange?: (frame: number) => void;
}

export function DotLottieAnimation({
  src,
  loop = true,
  autoplay = true,
  speed = 1,
  className = '',
  onComplete,
  onPlay,
  onPause,
  onFrameChange
}: DotLottieAnimationProps) {
  const dotLottieRef = useRef<any>(null);

  const handleDotLottieRef = useCallback((dotLottie: any) => {
    dotLottieRef.current = dotLottie;
    
    if (dotLottie) {
      if (onPlay) {
        dotLottie.addEventListener('play', onPlay);
      }
      if (onPause) {
        dotLottie.addEventListener('pause', onPause);
      }
      if (onComplete) {
        dotLottie.addEventListener('complete', onComplete);
      }
      if (onFrameChange) {
        dotLottie.addEventListener('frame', ({ currentFrame }: { currentFrame: number }) => {
          onFrameChange(currentFrame);
        });
      }
      
      if (speed !== 1) {
        dotLottie.setSpeed(speed);
      }
    }
  }, [onPlay, onPause, onComplete, onFrameChange, speed]);

  const play = useCallback(() => {
    dotLottieRef.current?.play();
  }, []);

  const pause = useCallback(() => {
    dotLottieRef.current?.pause();
  }, []);

  const stop = useCallback(() => {
    dotLottieRef.current?.stop();
  }, []);

  const seekToFrame = useCallback((frame: number) => {
    dotLottieRef.current?.setFrame(frame);
  }, []);

  return (
    <DotLottieReact
      src={src}
      loop={loop}
      autoplay={autoplay}
      dotLottieRefCallback={handleDotLottieRef}
      className={className}
    />
  );
}

interface LottieAnimationWithControlsProps extends DotLottieAnimationProps {
  showControls?: boolean;
}

export function LottieAnimationWithControls({
  showControls = true,
  ...props
}: LottieAnimationWithControlsProps) {
  const dotLottieRef = useRef<any>(null);

  const handleDotLottieRef = useCallback((dotLottie: any) => {
    dotLottieRef.current = dotLottie;
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <DotLottieReact
        src={props.src}
        loop={props.loop ?? true}
        autoplay={props.autoplay ?? true}
        dotLottieRefCallback={handleDotLottieRef}
        className={props.className}
      />
      {showControls && (
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => dotLottieRef.current?.play()}
            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
            data-testid="btn-lottie-play"
          >
            Play
          </button>
          <button
            onClick={() => dotLottieRef.current?.pause()}
            className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
            data-testid="btn-lottie-pause"
          >
            Pause
          </button>
          <button
            onClick={() => dotLottieRef.current?.stop()}
            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
            data-testid="btn-lottie-stop"
          >
            Stop
          </button>
        </div>
      )}
    </div>
  );
}

export const MARKETING_LOTTIE_ANIMATIONS = {
  success: 'https://lottie.host/c5f9ad4d-3ab8-4b8c-b9e6-8d0f8e0a0b5c/success-check.lottie',
  loading: 'https://lottie.host/a1b2c3d4-e5f6-7890-abcd-ef1234567890/loading-spinner.lottie',
  heartPulse: 'https://lottie.host/b2c3d4e5-f6a7-8901-bcde-f12345678901/heart-pulse.lottie',
  wellness: 'https://lottie.host/c3d4e5f6-a7b8-9012-cdef-123456789012/wellness-yoga.lottie',
  nature: 'https://lottie.host/d4e5f6a7-b8c9-0123-defa-234567890123/nature-plant.lottie',
  celebration: 'https://lottie.host/e5f6a7b8-c9d0-1234-efab-345678901234/celebration.lottie'
};

export default DotLottieAnimation;
