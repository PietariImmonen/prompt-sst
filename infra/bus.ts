import { fileUploadBucket } from "./bucket";
import { database } from "./database";
import { domain, zone } from "./dns";
import { realtime } from "./realtime";
import { allSecrets, secret } from "./secret";

export const bus = new sst.aws.Bus("Bus");

bus.subscribe("BusSubscriber", {
  handler: "./packages/functions/src/event/event.handler",
  link: [
    database,
    realtime,
    fileUploadBucket,
    secret.OpenRouterApiKey,
    ...allSecrets,
  ],
  timeout: "5 minutes",
  permissions: [
    {
      actions: ["iot:*", "sts:*"],
      resources: ["*"],
    },
  ],
  environment: {
    APP_DOMAIN: $dev ? "http://localhost:3000" : `https://${domain}`,
  },
});
