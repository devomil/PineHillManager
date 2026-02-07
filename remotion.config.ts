import { Config } from "@remotion/cli/config";

Config.setEntryPoint("./remotion/index.ts");
Config.setOutputLocation("out");
Config.setConcurrency(4);
Config.setChromiumOpenGlRenderer('angle');
Config.setDelayRenderTimeoutInMilliseconds(120000);

Config.overrideWebpackConfig((config) => {
  return {
    ...config,
    resolve: {
      ...config.resolve,
      fallback: {
        ...config.resolve?.fallback,
        fs: false,
        path: false,
      },
    },
  };
});
