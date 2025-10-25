import posthog from "posthog-js";

posthog.init("phc_HfnQrxPQJo2I01PXljw5HcaiN3SVGcolrgh132kmdsB", {
  api_host: "/ingest",
  ui_host: "https://eu.posthog.com",
  defaults: "2025-05-24",
  capture_exceptions: true, // This enables capturing exceptions using Error Tracking, set to false if you don't want this
  debug: process.env.NODE_ENV === "development",
});
