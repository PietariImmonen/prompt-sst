// Desktop app releases distribution infrastructure
// Provides S3 bucket with CloudFront CDN for app downloads and auto-updates

// S3 bucket with CloudFront access (not public)
export const releasesBucket = new sst.aws.Bucket("DesktopReleasesBucket", {
  access: "cloudfront",
  transform: {
    bucket: {
      corsRules: [
        {
          allowedHeaders: ["*"],
          allowedMethods: ["GET", "HEAD"],
          allowedOrigins: ["*"],
          exposeHeaders: ["ETag"],
          maxAgeSeconds: 3000,
        },
      ],
    },
  },
});

// CloudFront distribution router for CDN acceleration
const releasesRouter = new sst.aws.Router("DesktopReleasesRouter", {
  routes: {
    "/*": {
      bucket: releasesBucket,
    },
  },
});

// Export the environment variables for CI/CD and desktop config
export const outputs = {
  DesktopReleasesBucket: releasesBucket.name,
  DesktopReleasesCdnUrl: releasesRouter.url,
};
