// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./.sst/platform/config.d.ts" />

//TODO:CHANGE WHEN PROD
export default $config({
  app(input) {
    return {
      name: "sst-replicache-template",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
      providers: {
        aws: {
          region: "eu-north-1",
          profile: "sst-replicache-template-dev",
        },
        supabase: true,
        random: true,
      },
    };
  },
  async run() {
    const { readdirSync } = await import("fs");

    const outputs = {};
    for (const value of readdirSync("./infra/")) {
      const result = await import("./infra/" + value);
      if (result.outputs) Object.assign(outputs, result.outputs);
    }
    return outputs;
  },
});
