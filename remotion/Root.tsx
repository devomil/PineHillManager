import React from "react";
import { Composition } from "remotion";
import { VideoComposition } from "./VideoComposition";
import type { VideoCompositionProps } from "./VideoComposition";

export const RemotionRoot: React.FC = () => {
  return (
    <>
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
        calculateMetadata={async ({ props }) => {
          const totalDuration = props.scenes.reduce(
            (acc: number, scene: any) => acc + (scene.duration || 4),
            0
          );
          return {
            durationInFrames: Math.max(totalDuration * 30, 150),
            props,
          };
        }}
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
        calculateMetadata={async ({ props }) => {
          const totalDuration = props.scenes.reduce(
            (acc: number, scene: any) => acc + (scene.duration || 4),
            0
          );
          return {
            durationInFrames: Math.max(totalDuration * 30, 150),
            props,
          };
        }}
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
        calculateMetadata={async ({ props }) => {
          const totalDuration = props.scenes.reduce(
            (acc: number, scene: any) => acc + (scene.duration || 4),
            0
          );
          return {
            durationInFrames: Math.max(totalDuration * 30, 150),
            props,
          };
        }}
      />
    </>
  );
};
