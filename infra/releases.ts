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
    policy: (args) => {
      // Allow GitHub Actions IAM role to publish releases and public read access for auto-updates
      args.policy = $jsonStringify({
        Version: "2012-10-17",
        Statement: [
          {
            Sid: "PublicReadAccess",
            Effect: "Allow",
            Principal: "*",
            Action: "s3:GetObject",
            Resource: $interpolate`arn:aws:s3:::${args.bucket}/*`,
          },
          {
            Sid: "CloudFrontReadAccess",
            Effect: "Allow",
            Principal: {
              Service: "cloudfront.amazonaws.com",
            },
            Action: "s3:GetObject",
            Resource: $interpolate`arn:aws:s3:::${args.bucket}/*`,
          },
          {
            Sid: "GitHubActionsPublishAccess",
            Effect: "Allow",
            Principal: {
              AWS: "arn:aws:iam::093827727335:role/prompt-saver-production-github",
            },
            Action: ["s3:PutObject", "s3:PutObjectAcl"],
            Resource: $interpolate`arn:aws:s3:::${args.bucket}/*`,
          },
        ],
      });
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
