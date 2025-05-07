import { fileUploadBucket } from "./bucket";
import { database } from "./database";
import { realtime } from "./realtime";
import { allSecrets } from "./secret";

export const bus = new sst.aws.Bus("Bus");

bus.subscribe("BusSubscriber", {
  handler: "./packages/functions/src/event/event.handler",
  link: [database, realtime, fileUploadBucket, ...allSecrets],
  timeout: "5 minutes",
  permissions: [
    {
      actions: ["iot:*", "sts:*"],
      resources: ["*"],
    },
  ],
  environment: {
    APP_DOMAIN: "http://localhost:3000",
  },
});
