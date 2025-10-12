// DNS configuration used by the infrastructure components.
// Custom domains are only configured for the production stage.

import { isPermanentStage } from "./config";

const PRODUCTION_DOMAIN = "clyo.app";
const PRODUCTION_ZONE_ID = "Z07374831FDYT0O4QOWPM";

// Public domain used by the web application in production
export const domain = PRODUCTION_DOMAIN;

// Flag to indicate whether DNS resources should be provisioned
export const useCustomDomain = isPermanentStage;

// Route 53 configuration is only available when custom domains are enabled
export const zoneId = useCustomDomain ? PRODUCTION_ZONE_ID : undefined;
export const zone = useCustomDomain ? PRODUCTION_DOMAIN : undefined;
