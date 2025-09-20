import { api } from "./api";
import { auth } from "./auth";
import { realtime } from "./realtime";

// Desktop app configuration - provides the same environment variables as the web app
// This allows the desktop app to connect to the same SST resources
export const desktopConfig = {
  environment: {
    VITE_APP_URL: "http://localhost:3000",
    VITE_PUBLIC_APP_URL: "http://localhost:3001",
    VITE_API_URL: api.url,
    VITE_AUTH_URL: auth.url,
    VITE_STAGE: $app.stage,
    VITE_REALTIME_ENDPOINT: realtime.endpoint,
    VITE_AUTHORIZER: realtime.authorizer,
  },
};

// Export the environment variables for use in scripts
export const outputs = {
  DesktopApiUrl: api.url,
  DesktopAuthUrl: auth.url,
  DesktopStage: $app.stage,
  DesktopRealtimeEndpoint: realtime.endpoint,
  DesktopAuthorizer: realtime.authorizer,
};
