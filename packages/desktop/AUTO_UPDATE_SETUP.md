# Auto-Update Setup Guide

This guide explains how to set up automatic updates for the Clyo Desktop app using electron-updater and GitHub Releases.

## Overview

The auto-update system:
- Automatically checks for updates every 6 hours
- Downloads updates in the background
- Notifies users when updates are available
- Installs updates on app quit
- Supports macOS (with code signing & notarization), Windows, and Linux

## Prerequisites

### For macOS Code Signing and Notarization

You'll need:
1. **Apple Developer Account** (Apple Developer Program membership)
2. **Developer ID Application Certificate** from Apple
3. **App-Specific Password** for notarization

### Getting Your Apple Credentials

#### 1. Apple ID
Your Apple ID email address (e.g., `your-email@example.com`)

#### 2. Apple Team ID
1. Go to [Apple Developer Account](https://developer.apple.com/account)
2. Navigate to "Membership" section
3. Your Team ID is displayed (e.g., `ABC123DEF4`)

#### 3. Developer ID Application Certificate (CSC_NAME)
1. Open **Keychain Access** on macOS
2. Find your certificate: `Developer ID Application: Your Name (TEAMID)`
3. The **CSC_NAME** is: `Your Name (TEAMID)`
   - Example: `Pietari Immonen (ABC123DEF4)`

#### 4. App-Specific Password
1. Go to [appleid.apple.com](https://appleid.apple.com)
2. Sign in with your Apple ID
3. Navigate to "Security" → "App-Specific Passwords"
4. Click "Generate an app-specific password..."
5. Name it: "Clyo Desktop Notarization"
6. Copy the generated password (e.g., `abcd-efgh-ijkl-mnop`)

#### 5. Certificate for GitHub Actions (Base64)

You need to export your certificate as base64 for GitHub Actions:

```bash
# Export certificate from Keychain Access
security find-identity -v -p codesigning

# Export the certificate (you'll be prompted for a password)
security export -k ~/Library/Keychains/login.keychain-db \
  -t identities -f pkcs12 -o certificate.p12

# Convert to base64
base64 -i certificate.p12 | pbcopy
```

The base64 string is now in your clipboard. You'll use this as `MACOS_CERTIFICATE`.

Choose a password when exporting - you'll use this as `MACOS_CERTIFICATE_PASSWORD`.

## GitHub Repository Setup

### 1. Add GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

Add the following secrets:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `APPLE_ID` | Your Apple ID email | `your-email@example.com` |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password from Apple | `abcd-efgh-ijkl-mnop` |
| `APPLE_TEAM_ID` | Your Apple Developer Team ID | `ABC123DEF4` |
| `CSC_NAME` | Certificate name from Keychain | `Pietari Immonen (ABC123DEF4)` |
| `MACOS_CERTIFICATE` | Base64-encoded .p12 certificate | `MIIKzAIBAzCCCo...` (very long) |
| `MACOS_CERTIFICATE_PASSWORD` | Password you set when exporting cert | `your-chosen-password` |

**Note:** `GITHUB_TOKEN` is automatically provided by GitHub Actions - you don't need to add it.

### 2. Environment Variables Screenshot

Here's what your GitHub Secrets page should look like:

```
Repository secrets
├── APPLE_ID                      ✓
├── APPLE_APP_SPECIFIC_PASSWORD   ✓
├── APPLE_TEAM_ID                 ✓
├── CSC_NAME                      ✓
├── MACOS_CERTIFICATE             ✓
└── MACOS_CERTIFICATE_PASSWORD    ✓
```

## Creating a Release

### Option 1: Create a Git Tag (Recommended)

```bash
# Update version in package.json
cd packages/desktop
# Edit package.json and update version to e.g., "1.0.0"

# Commit the version change
git add package.json
git commit -m "chore(desktop): bump version to 1.0.0"

# Create and push a tag
git tag v1.0.0
git push origin v1.0.0
```

The GitHub Action will automatically:
1. Build the app for macOS, Windows, and Linux
2. Code sign the macOS app
3. Notarize the macOS app with Apple
4. Create a GitHub Release
5. Upload all installers to the release
6. Publish update metadata for electron-updater

### Option 2: Manual Workflow Dispatch

1. Go to GitHub → Actions → "Release Desktop App"
2. Click "Run workflow"
3. Enter version (e.g., `1.0.0`)
4. Click "Run workflow"

## Testing Auto-Updates

### Local Testing (Development)

The auto-updater is disabled in development mode. To test:

```bash
# Build a production version
cd packages/desktop
bun run build

# Package the app (without signing)
bunx electron-builder --dir

# Test the packaged app
open dist/mac-arm64/Clyo\ Desktop.app
```

### Testing with Real Updates

1. Create a release (v1.0.0)
2. Install that version on your machine
3. Create a new release (v1.0.1)
4. The installed app should detect and download the update
5. Quit the app - it will install the update and restart

## Update Flow for Users

1. **Background Check**: App checks for updates every 6 hours
2. **Update Available**: User sees notification "Update available"
3. **Download**: User can download update (or it downloads automatically)
4. **Install on Quit**: Update installs when user quits the app
5. **Restart**: App restarts with new version

## Troubleshooting

### Notarization Fails

**Error:** `The operation couldn't be completed. Unable to notarize app.`

**Solution:**
- Verify your Apple ID and app-specific password are correct
- Ensure your Apple Developer account is active
- Check that your Team ID matches your certificate

### Code Signing Fails

**Error:** `Command failed: codesign`

**Solution:**
- Verify the certificate is installed in Keychain Access
- Ensure `CSC_NAME` exactly matches the certificate name
- Check that the certificate hasn't expired

### Updates Not Detected

**Error:** App doesn't detect new releases

**Solution:**
- Ensure the app is built in production mode
- Verify GitHub release is published (not draft)
- Check that `latest.yml` is uploaded to the release
- Confirm the repository URL in `electron-builder.yml` is correct

### GitHub Actions Fails

**Error:** Workflow fails during build

**Solution:**
- Check all required secrets are set correctly
- Verify the certificate base64 encoding is correct
- Ensure your Apple Developer account has proper permissions
- Review the Actions logs for specific error messages

## How It Works

### Auto-Update Architecture

1. **electron-updater**: Checks GitHub Releases for new versions
2. **GitHub Releases**: Hosts the installer files and update metadata
3. **Code Signing**: Ensures the app is from a trusted source
4. **Notarization**: Apple verifies the app is safe (macOS only)

### Update Metadata Files

Each release includes:
- `latest.yml` (Linux) / `latest-mac.yml` (macOS) / `latest.yml` (Windows)
- Contains version info and download URLs
- electron-updater reads these files to check for updates

### File Structure

```
GitHub Release v1.0.0
├── clyo-desktop-1.0.0-mac.dmg           # macOS installer
├── clyo-desktop-1.0.0-windows.exe       # Windows installer
├── clyo-desktop-1.0.0-linux.AppImage    # Linux AppImage
├── clyo-desktop-1.0.0-linux.deb         # Linux Debian package
├── latest-mac.yml                        # macOS update metadata
├── latest.yml                            # Windows/Linux update metadata
└── RELEASES                              # Windows-specific metadata
```

## Security Notes

### Certificate Security
- **Never commit** certificates or passwords to git
- Store certificates securely (1Password, etc.)
- Use GitHub Secrets for CI/CD
- Rotate app-specific passwords if compromised

### Update Security
- Updates are verified using code signatures
- electron-updater validates signatures before installing
- HTTPS ensures secure download
- Notarization adds an extra layer of Apple verification

## Manual Build (Without CI/CD)

If you need to build and release manually:

```bash
# Set environment variables
export APPLE_ID="your-email@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="abcd-efgh-ijkl-mnop"
export APPLE_TEAM_ID="ABC123DEF4"
export CSC_NAME="Pietari Immonen (ABC123DEF4)"

# Build and publish
cd packages/desktop
bun run build:mac:notarized

# Upload to GitHub manually
# Go to Releases → Draft a new release → Upload the .dmg file
```

## Additional Resources

- [electron-updater documentation](https://www.electron.build/auto-update)
- [Apple Notarization Guide](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [Code Signing Guide](https://www.electron.build/code-signing)
- [GitHub Actions for Electron](https://www.electron.build/configuration/publish#github-repository)

## Support

If you encounter issues:
1. Check the GitHub Actions logs for error messages
2. Review the troubleshooting section above
3. Verify all credentials are correct
4. Test locally before pushing to CI/CD
