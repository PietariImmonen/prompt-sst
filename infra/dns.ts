// DNS configuration for custom domains
// Provides stage-aware domain and subdomain configuration

// Base domain configuration per stage
export const domain =
  {
    production: "clyo.app",
    dev: "dev.clyo.app",
  }[$app.stage] || $app.stage + ".dev.clyo.app";

// Route 53 Hosted Zone IDs per stage
export const zone =
  $app.stage === "production"
    ? "Z07374831FDYT0O4QOWPM"
    : "Z07404991OYOCRO2VH5SP";
