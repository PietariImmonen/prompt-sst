export const secret = {
  GoogleClientID: new sst.Secret("GoogleClientID"),
  GoogleClientSecret: new sst.Secret("GoogleClientSecret"),
  NeonDatabaseUrl: new sst.Secret("NeonDatabaseUrl"),
  NeonApiKey: new sst.Secret("NeonApiKey"),
  OpenRouterApiKey: new sst.Secret("OpenRouterApiKey"),
  SonioxApiKey: new sst.Secret("SonioxApiKey"),
  PostHogApiKey: new sst.Secret("PostHogApiKey"),
};

export const allSecrets = Object.values(secret);
