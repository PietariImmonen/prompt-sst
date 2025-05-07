import { auth } from "./auth";
import { database } from "./database";

export const realtime = new sst.aws.Realtime("Realtime", {
  authorizer: {
    handler: "./packages/functions/src/auth/auth-iot.handler",
    link: [auth, database],
  },
});
