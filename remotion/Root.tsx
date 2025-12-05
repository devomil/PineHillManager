import { Composition, CalculateMetadataFunction } from "remotion";
import { VideoComposition } from "./VideoComposition";
import type { VideoCompositionProps } from "./VideoComposition";
import { UniversalVideoComposition } from "./UniversalVideoComposition";
import type { UniversalVideoProps } from "./UniversalVideoComposition";
import { PINE_HILL_FARM_BRAND, OUTPUT_FORMATS } from "../shared/video-types";

const defaultUniversalProps: UniversalVideoProps = {
  scenes: [],
  voiceoverUrl: null,
  musicUrl: null,
  musicVolume: 0.18,
  brand: PINE_HILL_FARM_BRAND,
  outputFormat: OUTPUT_FORMATS.youtube,
};

const calculateUniversalMetadata: CalculateMetadataFunction<UniversalVideoProps> = async ({ props }) => {
  const totalDuration = props.scenes.reduce(
    (acc: number, scene) => acc + (scene.duration || 4),
    0
  );
  return {
    durationInFrames: Math.max(totalDuration * 30, 150),
    props,
  };
};

const calculateLegacyMetadata: CalculateMetadataFunction<VideoCompositionProps> = async ({ props }) => {
  const totalDuration = props.scenes.reduce(
    (acc: number, scene) => acc + (scene.duration || 4),
    0
  );
  return {
    durationInFrames: Math.max(totalDuration * 30, 150),
    props,
  };
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Universal Video Compositions - New System */}
      <Composition
        id="UniversalVideo"
        component={UniversalVideoComposition}
        durationInFrames={900}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={defaultUniversalProps}
        calculateMetadata={calculateUniversalMetadata}
      />
      <Composition
        id="UniversalVideoVertical"
        component={UniversalVideoComposition}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          ...defaultUniversalProps,
          outputFormat: OUTPUT_FORMATS.tiktok,
        }}
        calculateMetadata={calculateUniversalMetadata}
      />
      <Composition
        id="UniversalVideoSquare"
        component={UniversalVideoComposition}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1080}
        defaultProps={{
          ...defaultUniversalProps,
          outputFormat: OUTPUT_FORMATS.instagram,
        }}
        calculateMetadata={calculateUniversalMetadata}
      />
      
      {/* Legacy Marketing Video Compositions */}
      <Composition
        id="MarketingVideo"
        component={VideoComposition}
        durationInFrames={900}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          scenes: [],
          voiceoverUrl: null,
          musicUrl: null,
          watermark: null,
          productName: "Product",
          style: "professional",
        }}
        calculateMetadata={calculateLegacyMetadata}
      />
      <Composition
        id="MarketingVideoVertical"
        component={VideoComposition}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          scenes: [],
          voiceoverUrl: null,
          musicUrl: null,
          watermark: null,
          productName: "Product",
          style: "professional",
        }}
        calculateMetadata={calculateLegacyMetadata}
      />
      <Composition
        id="MarketingVideoSquare"
        component={VideoComposition}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1080}
        defaultProps={{
          scenes: [],
          voiceoverUrl: null,
          musicUrl: null,
          watermark: null,
          productName: "Product",
          style: "professional",
        }}
        calculateMetadata={calculateLegacyMetadata}
      />
    </>
  );
};
