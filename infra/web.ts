import { api } from "./api";
import { auth } from "./auth";
import { domain, useCustomDomain, zoneId } from "./dns";
import { secret } from "./secret";

// Create basic auth for non-production environments

const customDomainEnabled = useCustomDomain && !!zoneId;

export const web = new sst.aws.Nextjs("Web", {
  path: "./packages/www",
  link: [api],
  domain: customDomainEnabled
    ? {
        name: domain,
        dns: sst.aws.dns({ zone: zoneId! }),
        redirects: ["www." + domain],
      }
    : undefined,
  environment: {
    NEXT_PUBLIC_APP_URL: $dev
      ? "http://localhost:3000"
      : customDomainEnabled
        ? `https://${domain}`
        : "https://dummy-domain.com", // This will be replaced by the actual URL
    NEXT_PUBLIC_SITE_URL: $dev
      ? "http://localhost:3000"
      : customDomainEnabled
        ? `https://${domain}`
        : "https://dummy-domain.com", // This will be replaced by the actual URL
    NEXT_PUBLIC_API_URL: api.url,
    NEXT_PUBLIC_AUTH_URL: auth.url,
    NEXT_PUBLIC_POSTHOG_KEY: secret.PostHogApiKey.value,
    NEXT_PUBLIC_POSTHOG_HOST: "https://eu.posthog.com",
  },
});
