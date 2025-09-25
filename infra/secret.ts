export const secret = {
  GoogleClientID: new sst.Secret("GoogleClientID"),
  GoogleClientSecret: new sst.Secret("GoogleClientSecret"),
  NeonDatabaseUrl: new sst.Secret("NeonDatabaseUrl"),
  NeonApiKey: new sst.Secret("NeonApiKey"),
};

export const allSecrets = Object.values(secret);
