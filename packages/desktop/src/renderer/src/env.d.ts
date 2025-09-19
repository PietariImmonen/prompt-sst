/// <reference types="vite/client" />

declare interface ImportMetaEnv {
  readonly VITE_APP_URL: string;
  readonly VITE_API_URL: string;
  readonly VITE_STAGE: string;
  readonly VITE_REALTIME_ENDPOINT: string;
  readonly VITE_AUTHORIZER: string;
  readonly VITE_AUTH_URL: string;
}

declare interface ImportMeta {
  readonly env: ImportMetaEnv;
}
