# S3 + CloudFront Release Distribution Setup

This document describes the implementation of S3 + CloudFront distribution for desktop app releases and auto-updates, allowing public downloads without making the repository public.

## Overview

The system provides:
- ✅ Public S3 bucket for release artifacts with CloudFront CDN acceleration
- ✅ Dual publishing to both GitHub Releases (fallback) and S3 (primary)
- ✅ Automatic update discovery via electron-updater with CDN URLs
- ✅ Cost-effective distribution (~$1-5/month for small-medium scale)
- ✅ No rate limiting issues (unlike GitHub API)
- ✅ Private repository remains private

## Architecture

```
GitHub Actions (CI/CD)
    ↓
Deploy SST Infrastructure
    ↓
Build Desktop App (electron-builder)
    ↓
Publish to:
    1. S3 Bucket → CloudFront CDN (primary)
    2. GitHub Releases (fallback)
    ↓
Desktop App Auto-Updater
    ↓
Checks CDN for Updates
    ↓
Downloads from CloudFront
    ↓
Installs Update
```

## Infrastructure Components

### 1. S3 Bucket (`infra/releases.ts`)

**Resource**: `DesktopReleasesBucket`
- Public read access for downloads
- CORS configured for web downloads
- Stores release artifacts in `/releases/{version}/` path

### 2. CloudFront Distribution (`infra/releases.ts`)

**Resource**: `DesktopReleasesCdn`
- CDN acceleration for faster downloads globally
- PriceClass_100 (North America + Europe edge locations)
- HTTPS redirect enabled
- Caching optimized for release artifacts

### 3. Environment Configuration (`infra/desktop.ts`)

**New Environment Variable**: `VITE_RELEASES_CDN_URL`
- Injected into desktop app at build time
- Used by electron-updater for update discovery
- Points to CloudFront distribution URL

## Release Publishing Flow

### GitHub Actions Workflow Updates

**File**: `.github/workflows/release-desktop.yml`

**Key Changes**:

1. **SST Deployment Step** - Exports bucket name and CDN URL:
```bash
echo "DESKTOP_RELEASES_BUCKET=$(sst shell --stage production --run 'console.log(Resource.DesktopReleasesBucket.name)')" >> $GITHUB_ENV
echo "DESKTOP_RELEASES_CDN_URL=$(sst shell --stage production --run 'console.log(Resource.DesktopReleasesCdn.url)')" >> $GITHUB_ENV
```

2. **Environment File** - Includes CDN URL:
```bash
VITE_RELEASES_CDN_URL=${{ env.DESKTOP_RELEASES_CDN_URL }}
```

3. **Build Step** - Passes bucket name to electron-builder:
```bash
DESKTOP_RELEASES_BUCKET: ${{ env.DESKTOP_RELEASES_BUCKET }}
DESKTOP_RELEASES_CDN_URL: ${{ env.DESKTOP_RELEASES_CDN_URL }}
```

### electron-builder Configuration

**File**: `packages/desktop/electron-builder.yml`

**Publishing Configuration**:
```yaml
publish:
  # GitHub releases (for fallback and visibility)
  - provider: github
    owner: PietariImmonen
    repo: prompt-sst
    releaseType: release
  # S3 + CloudFront for primary distribution
  - provider: s3
    bucket: ${DESKTOP_RELEASES_BUCKET}
    region: eu-north-1
    path: /releases/${version}/
    acl: public-read
```

**Artifacts Published**:
- `clyo-desktop-{version}-mac.dmg` - macOS installer
- `latest-mac.yml` - Update metadata for electron-updater
- `*.blockmap` - Efficient delta update files

## Auto-Update Configuration

### Auto-Updater Setup

**File**: `packages/desktop/src/main/auto-updater.ts`

**Key Configuration**:
```typescript
const cdnUrl = process.env.VITE_RELEASES_CDN_URL
if (cdnUrl && app.isPackaged) {
  autoUpdater.setFeedURL({
    provider: 'generic',
    url: cdnUrl,
    channel: 'latest'
  })
  console.log('🌐 Using CDN for updates:', cdnUrl)
}
```

**Update Discovery Flow**:
1. App checks `{CDN_URL}/latest-mac.yml` for update metadata
2. Compares remote version with local version
3. If newer version available, triggers `update-available` event
4. Downloads installer from `{CDN_URL}/clyo-desktop-{version}-mac.dmg`
5. Installs on app quit via `quitAndInstall()`

### Update UI Integration

**Files**:
- `packages/desktop/src/renderer/src/hooks/use-desktop-updater.ts` - React hook for update state
- `packages/desktop/src/renderer/src/pages/settings.tsx` - Settings page with update UI

**Features**:
- Current version display
- Check for updates button
- Download progress indicator
- Install update button
- Toast notifications for update events

**User Flow**:
1. User opens Settings page
2. Sees current version (e.g., "v0.1.40")
3. Clicks "Check for Updates"
4. If update available, sees "Version 0.1.41 is available"
5. Clicks "Download Update" (shows progress bar)
6. After download, clicks "Restart & Install"
7. App restarts with new version

## Deployment Process

### Step 1: Deploy Infrastructure

```bash
# Deploy SST infrastructure to create S3 bucket and CloudFront distribution
bun run deploy:production
```

**This creates**:
- S3 bucket: `prompt-saver-production-desktopreleasesbu-{random-id}`
- CloudFront distribution: `https://{cloudfront-id}.cloudfront.net`

### Step 2: Trigger Release

**Option A: Git Tag**
```bash
git tag v0.1.41
git push origin v0.1.41
```

**Option B: Manual GitHub Actions Dispatch**
1. Go to Actions → Release macOS Desktop App
2. Click "Run workflow"
3. Enter version (e.g., `0.1.41`)

### Step 3: CI/CD Pipeline

GitHub Actions will:
1. ✅ Deploy SST infrastructure
2. ✅ Get S3 bucket name and CDN URL from SST outputs
3. ✅ Bump version in `package.json`
4. ✅ Build Electron app with code signing + notarization
5. ✅ Publish to S3 bucket at `/releases/{version}/`
6. ✅ Publish to GitHub Releases (fallback)
7. ✅ Create Git tag and release notes

### Step 4: Verify Deployment

**Check S3 Bucket**:
```bash
# Using AWS CLI
aws s3 ls s3://prompt-saver-production-desktopreleasesbu-{id}/releases/0.1.41/ --profile prompt-saver-production
```

**Expected Files**:
```
clyo-desktop-0.1.41-mac.dmg
latest-mac.yml
clyo-desktop-0.1.41-mac.dmg.blockmap
```

**Check CloudFront**:
```bash
# Test CDN URL
curl https://{cloudfront-id}.cloudfront.net/latest-mac.yml
```

**Expected Response** (example):
```yaml
version: 0.1.41
files:
  - url: clyo-desktop-0.1.41-mac.dmg
    sha512: {hash}
    size: {bytes}
path: clyo-desktop-0.1.41-mac.dmg
sha512: {hash}
releaseDate: '2025-01-16T10:30:00.000Z'
```

## Testing Auto-Updates

### Local Testing

**1. Build Production App Locally**:
```bash
cd packages/desktop
VITE_RELEASES_CDN_URL=https://{cloudfront-id}.cloudfront.net bun run build:mac
```

**2. Install Built App**:
```bash
# Mount DMG and install to /Applications
open dist/clyo-desktop-{version}-mac.dmg
```

**3. Open Installed App**:
- Launch app from /Applications
- Open Settings page
- Click "Check for Updates"
- Verify it checks CDN URL (check console logs)

### Production Testing

**1. Deploy New Version**:
```bash
git tag v0.1.42
git push origin v0.1.42
```

**2. Wait for CI/CD** (watch GitHub Actions)

**3. Test Update Flow**:
- Open installed app (v0.1.41)
- Settings → Check for Updates
- Should detect v0.1.42
- Download update → Restart & Install
- App should restart with v0.1.42

## Monitoring & Analytics

### CloudWatch Metrics (AWS)

**Bucket Metrics**:
- Request count
- Data transfer (GB)
- Error rates

**CloudFront Metrics**:
- Download count by edge location
- Cache hit ratio
- Request latency

**Estimated Costs**:
- S3 Storage: ~$0.01-0.05/month (artifacts < 1 GB)
- S3 Requests: ~$0.01-0.50/month (< 10K downloads)
- CloudFront Data Transfer: ~$0.50-4.00/month (varies by downloads)
- **Total**: ~$1-5/month for small-medium scale

### Update Analytics (Future Enhancement)

**Potential Tracking**:
- Download count per version
- Update success rate
- Update adoption timeline
- Geographic distribution

**Implementation Options**:
1. CloudWatch Logs (built-in, AWS-native)
2. Custom Lambda function for download tracking
3. Third-party analytics (Mixpanel, Amplitude)

## Rollback & Recovery

### Rollback to Previous Version

**Option 1: Re-publish Previous Version**
```bash
# Re-tag previous version
git tag -f v0.1.40 <previous-commit-hash>
git push origin v0.1.40 --force
```

**Option 2: Manual S3 Update**
```bash
# Copy previous version metadata as latest
aws s3 cp \
  s3://bucket/releases/0.1.40/latest-mac.yml \
  s3://bucket/latest-mac.yml
```

### Disaster Recovery

**GitHub Releases Fallback**:
- If S3/CloudFront fails, users can download from GitHub Releases
- Auto-updater will fall back to GitHub if CDN URL is unavailable
- Manual download link on website/documentation

**Backup Strategy**:
- GitHub Releases serve as automatic backup
- All artifacts stored in both S3 and GitHub
- CloudFront cache provides additional redundancy

## Troubleshooting

### Issue: Auto-updater not finding updates

**Diagnosis**:
```bash
# Check electron-updater console logs
# Look for: "🌐 Using CDN for updates: https://..."
```

**Solutions**:
1. Verify `VITE_RELEASES_CDN_URL` is set in environment
2. Check CloudFront URL is accessible: `curl {CDN_URL}/latest-mac.yml`
3. Verify S3 bucket has public read permissions
4. Check electron-updater configuration in auto-updater.ts:15

### Issue: "Update failed: 404"

**Diagnosis**:
```bash
# Check if artifacts exist in S3
aws s3 ls s3://bucket/releases/{version}/
```

**Solutions**:
1. Verify electron-builder published to S3 successfully
2. Check S3 bucket name matches environment variable
3. Verify CloudFront distribution is active (not disabled)
4. Check file paths match electron-builder configuration

### Issue: Slow download speeds

**Diagnosis**:
```bash
# Test download speed from CDN
time curl -o /dev/null https://{CDN_URL}/clyo-desktop-{version}-mac.dmg
```

**Solutions**:
1. Verify CloudFront distribution is active
2. Check PriceClass includes user's geographic region
3. Consider upgrading PriceClass for global coverage
4. Check cache hit ratio (should be >80% after initial downloads)

### Issue: High AWS costs

**Diagnosis**:
```bash
# Check CloudWatch metrics for unexpected traffic
# AWS Console → CloudFront → Metrics
```

**Solutions**:
1. Review data transfer metrics (unexpected downloads?)
2. Enable CloudFront logging for traffic analysis
3. Consider reducing PriceClass if not needed globally
4. Implement download throttling if necessary

## Security Considerations

### Code Signing & Notarization

**Required for macOS**:
- ✅ Apple Developer certificate configured
- ✅ App notarized with Apple
- ✅ Hardened runtime enabled
- ✅ Entitlements configured

**Verification**:
```bash
# Check code signature
codesign -dv --verbose=4 /Applications/Clyo\ Desktop.app

# Check notarization
spctl -a -vv -t install /Applications/Clyo\ Desktop.app
```

### S3 Security

**Public Read Only**:
- ✅ Bucket allows public read for downloads
- ✅ No write permissions for public
- ✅ Uploads only via GitHub Actions (IAM role)

**IAM Role Permissions**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:PutObjectAcl"],
      "Resource": "arn:aws:s3:::bucket/releases/*"
    }
  ]
}
```

### Update Integrity

**electron-updater Verification**:
- ✅ SHA-512 checksums in `latest-mac.yml`
- ✅ Files verified before installation
- ✅ Code signature checked on macOS

**Metadata Protection**:
- CloudFront caches `latest-mac.yml` (5 min TTL)
- S3 versioning enabled (optional)
- Immutable release artifacts

## Future Enhancements

### Cross-Platform Support

**Windows + Linux Builds**:
```yaml
# In .github/workflows/release-desktop.yml
strategy:
  matrix:
    os: [macos-latest, windows-latest, ubuntu-latest]
```

**Artifacts**:
- Windows: `.exe` installer + `latest.yml`
- Linux: `.AppImage`, `.deb`, `.snap` + `latest-linux.yml`

### Staged Rollouts

**Progressive Deployment**:
1. Deploy to 10% of users
2. Monitor error rates
3. Gradually increase to 100%

**Implementation**:
- Lambda@Edge for staged routing
- Feature flags in app
- Canary release strategy

### Analytics Integration

**Tracking Metrics**:
- Update check count
- Download success rate
- Installation completion
- Version adoption timeline

**Tools**:
- CloudWatch custom metrics
- AWS Lambda for event processing
- Dashboard for visualization

### Custom Update Server

**Benefits**:
- Complete control over update flow
- Advanced analytics
- Staged rollouts
- Smart update scheduling

**Architecture**:
- API Gateway + Lambda for update server
- DynamoDB for version management
- CloudWatch for monitoring

## Summary

This implementation provides:

✅ **Public Distribution**: Users can download releases without repo access
✅ **Auto-Updates**: Seamless update experience with electron-updater
✅ **CDN Acceleration**: Fast downloads globally via CloudFront
✅ **Cost-Effective**: ~$1-5/month for small-medium user base
✅ **Reliable**: Dual publishing to S3 (primary) + GitHub (fallback)
✅ **Private Repo**: Repository remains private
✅ **Production-Ready**: Code signing, notarization, security best practices

The system is now ready for production use with minimal operational overhead.
