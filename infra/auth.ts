import { database } from "./database";
import { allSecrets } from "./secret";

export const auth = new sst.aws.Auth("Auth", {
  authorizer: {
    url: true,
    link: [...allSecrets, database],

    handler: "./packages/functions/src/auth/auth.handler",
    environment: {
      AUTH_APP_URL: "http://localhost:3000",
      AUTH_SITE_URL: "http://localhost:3001",
    },
  },
  forceUpgrade: "v2",
});

// maybe we can insert password there manually using the same hash function as the sst auth uses?
export const authTable = sst.aws.Dynamo.get("AuthTable", auth.nodes.table.name);
