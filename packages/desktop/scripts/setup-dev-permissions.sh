#!/bin/bash

# Setup Development Permissions for Electron
# This script adds necessary entitlements to the Electron binary for development
# so you can test microphone, accessibility, etc. without building the app

set -e

echo "🔧 Setting up development permissions for Electron..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the Electron path
ELECTRON_PATH="./node_modules/electron/dist/Electron.app"

if [ ! -d "$ELECTRON_PATH" ]; then
  echo -e "${RED}❌ Electron not found at $ELECTRON_PATH${NC}"
  echo "   Run 'bun install' first"
  exit 1
fi

echo "📍 Found Electron at: $ELECTRON_PATH"

# Create temporary entitlements file for development
TEMP_ENTITLEMENTS=$(mktemp).plist
cat > "$TEMP_ENTITLEMENTS" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <!-- JIT and memory permissions for Chromium/V8 -->
  <key>com.apple.security.cs.allow-jit</key>
  <true/>
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
  <true/>
  <key>com.apple.security.cs.allow-dyld-environment-variables</key>
  <true/>

  <!-- Accessibility for keyboard shortcuts and text insertion -->
  <key>com.apple.security.device.accessibility</key>
  <true/>

  <!-- Apple Events for AppleScript -->
  <key>com.apple.security.automation.apple-events</key>
  <true/>

  <!-- Microphone access for transcription -->
  <key>com.apple.security.device.audio-input</key>
  <true/>

  <!-- Camera access (if needed later) -->
  <key>com.apple.security.device.camera</key>
  <true/>

  <!-- Disable library validation for development -->
  <key>com.apple.security.cs.disable-library-validation</key>
  <true/>
</dict>
</plist>
EOF

echo "📝 Created temporary entitlements file"

# Codesign the Electron binary with entitlements
echo "🔏 Code-signing Electron.app with development entitlements..."

# Remove existing signature first
codesign --remove-signature "$ELECTRON_PATH/Contents/MacOS/Electron" 2>/dev/null || true

# Sign with ad-hoc signature and entitlements
codesign --force --deep --sign - \
  --entitlements "$TEMP_ENTITLEMENTS" \
  "$ELECTRON_PATH"

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Successfully signed Electron with development entitlements${NC}"
else
  echo -e "${RED}❌ Failed to sign Electron${NC}"
  rm "$TEMP_ENTITLEMENTS"
  exit 1
fi

# Clean up
rm "$TEMP_ENTITLEMENTS"

echo ""
echo -e "${GREEN}✅ Development permissions setup complete!${NC}"
echo ""
echo "You can now test microphone features in development mode."
echo ""
echo -e "${YELLOW}⚠️  You'll need to grant permissions in System Settings:${NC}"
echo "   1. System Settings → Privacy & Security → Microphone"
echo "   2. Enable 'Electron' or your terminal app"
echo "   3. Restart the development server: bun run dev"
echo ""
echo -e "${YELLOW}📌 Note: Re-run this script if you:${NC}"
echo "   - Upgrade Electron version (npm/bun install)"
echo "   - Delete node_modules and reinstall"
echo "   - See permission denied errors"
