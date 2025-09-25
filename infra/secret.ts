export const secret = {
  GoogleClientID: new sst.Secret("GoogleClientID"),
  GoogleClientSecret: new sst.Secret("GoogleClientSecret"),
  SupabaseDatabasePassword: new sst.Secret("SupabaseDatabasePassword"),
};

export const allSecrets = Object.values(secret);
