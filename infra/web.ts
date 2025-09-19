import { api } from "./api";
import { auth } from "./auth";
import { realtime } from "./realtime";

const username = "user";
const password = "password";
const basicAuth = $resolve([username, password]).apply(([username, password]) =>
  Buffer.from(`${username}:${password}`).toString("base64"),
);

new sst.aws.StaticSite("Web", {
  build: {
    command: "bun run build",
    output: "dist",
  },
  path: "./packages/app",
  environment: {
    VITE_APP_URL: "http://localhost:3000",
    VITE_PUBLIC_APP_URL: "http://localhost:3001",
    VITE_API_URL: api.url,
    VITE_AUTH_URL: auth.url,
    VITE_STAGE: $app.stage,
    VITE_REALTIME_ENDPOINT: realtime.endpoint,
    VITE_AUTHORIZER: realtime.authorizer,
  },

  edge:
    $app.stage !== "production" && !$dev
      ? {
          viewerRequest: {
            injection: $interpolate`
              if (
                  !event.request.headers.authorization
                    || event.request.headers.authorization.value !== "Basic ${basicAuth}"
                 ) {
                return {
                  statusCode: 401,
                  headers: {
                    "www-authenticate": { value: "Basic" }
                  }
                };
              }`,
          },
        }
      : undefined,
});

// new sst.aws.Astro("Site", {
//   path: "./packages/www",
//   link: [api],
//   domain: {
//     name: domain,
//     dns: sst.aws.dns({ zone }),
//   },
//   environment: {
//     APP_URL: $dev ? "http://localhost:3000" : "https://" + appDomain,
//     PUBLIC_SITE_URL: $dev ? "http://localhost:3001" : "https://" + domain,
//     PUBLIC_API_URL: api.url,
//     PUBLIC_AUTH_URL: auth.url,
//   },
// });

// new sst.aws.Nextjs("NextJs", {
//   path: "./packages/www",
//   link: [api],
//
//   environment: {
//     NEXT_PUBLIC_APP_URL: "http://localhost:3000",
//     NEXT_PUBLIC_SITE_URL: "http://localhost:3001",
//     NEXT_PUBLIC_API_URL: api.url,
//     NEXT_PUBLIC_AUTH_URL: auth.url,
//   },
//   // domain: {
//   //   name: "www.localhost",
//   // },
//   edge:
//     $app.stage !== "production" && !$dev
//       ? {
//           viewerRequest: {
//             injection: $interpolate`
//             if (
//                 !event.request.headers.authorization
//                   || event.request.headers.authorization.value !== "Basic ${basicAuth}"
//                ) {
//               return {
//                 statusCode: 401,
//                 headers: {
//                   "www-authenticate": { value: "Basic" }
//                 }
//               };
//             }`,
//           },
//         }
//       : undefined,
// });
