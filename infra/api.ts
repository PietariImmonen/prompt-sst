import { auth } from "./auth";
import { fileUploadBucket } from "./bucket";
import { bus } from "./bus";
import { database } from "./database";
import { domain, useCustomDomain, zoneId } from "./dns";
import { realtime } from "./realtime";
import { allSecrets } from "./secret";

const customDomainEnabled = useCustomDomain && !!zoneId;

export const api = new sst.aws.Router("ApiRouter", {
  ...(customDomainEnabled
    ? {
        domain: {
          name: `api.${domain}`,
          dns: sst.aws.dns({ zone: zoneId! }),
        },
      }
    : {}),
});

const honoApiFn = new sst.aws.Function("Api", {
  handler: "./packages/functions/src/api/index.handler",
  link: [bus, auth, database, realtime, fileUploadBucket, ...allSecrets],
  permissions: [
    {
      actions: ["ses:SendEmail", "iot:*", "sts:*", "bedrock:*"],
      resources: ["*"],
    },
  ],
  environment: {
    APP_DOMAIN: $dev
      ? "http://localhost:3000"
      : customDomainEnabled
      ? `https://${domain}`
      : api.url,
  },
  nodejs: {
    esbuild: {
      external: ["@aws-sdk/*"],
      minify: true,
    },
  },
  url: {
    router: {
      instance: api,
      path: "/",
    },
  },
});
