import { database } from "./database";
import { domain, useCustomDomain, zoneId } from "./dns";
import { allSecrets } from "./secret";

const customDomainEnabled = useCustomDomain && !!zoneId;

export const auth = new sst.aws.Auth("Auth", {
  authorizer: {
    url: true,
    link: [...allSecrets, database],
    handler: "./packages/functions/src/auth/auth.handler",
    environment: {
      AUTH_APP_URL: $dev ? "http://localhost:3000" : `https://${domain}`,
      AUTH_SITE_URL: $dev ? "http://localhost:3001" : `https://${domain}`,
    },
  },
  forceUpgrade: "v2",
  ...(customDomainEnabled
    ? {
        domain: {
          name: `auth.${domain}`,
          dns: sst.aws.dns({ zone: zoneId! }),
        },
      }
    : {}),
});

// maybe we can insert password there manually using the same hash function as the sst auth uses?
export const authTable = sst.aws.Dynamo.get("AuthTable", auth.nodes.table.name);
