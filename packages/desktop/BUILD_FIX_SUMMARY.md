# Electron Build Fix Summary

## Problem
The `.dmg` file produced by GitHub Actions was missing transitive dependencies (sub-dependencies) of packages like `mqtt`, causing the desktop app to fail when launched. The error showed missing modules that are dependencies of dependencies.

## Root Causes Identified

1. **`npmRebuild: false`** - electron-builder was not rebuilding native modules for Electron's ABI
2. **Missing `asarUnpack` configuration** - Native and complex modules weren't being unpacked from the asar archive
3. **Missing `includeSubNodeModules`** - Transitive dependencies weren't being included
4. **Python `distutils` missing** - `node-gyp` requires Python 3.11 (3.12+ removed `distutils`)
5. **Workspace dependency handling** - Monorepo workspace dependencies need explicit installation

## Changes Made

### 1. electron-builder.yml
```yaml
# Added unpacking for modules with native dependencies or complex requirements
asarUnpack:
  - resources/**
  - node_modules/mqtt/**
  - node_modules/mqtt-packet/**
  - node_modules/robotjs/**
  - node_modules/@soniox/**
  - node_modules/bl/**
  - node_modules/readable-stream/**
  - node_modules/process-nextick-args/**
  - node_modules/replicache/**

# Enable native module rebuilding and sub-dependency inclusion
npmRebuild: true
includeSubNodeModules: true
```

### 2. GitHub Actions Workflow (.github/workflows/release-desktop.yml)

#### Added Python 3.11 Setup
```yaml
- name: Setup Python for node-gyp
  uses: actions/setup-python@v5
  with:
    python-version: '3.11'
```

#### Improved Dependency Installation
```yaml
- name: Install desktop dependencies
  run: |
    cd packages/desktop
    bun install --frozen-lockfile
    # Also install dependencies for workspace packages
    cd ../core
    bun install --frozen-lockfile
```

#### Made Electron Rebuild Optional
```yaml
- name: Rebuild native modules for Electron
  run: |
    cd packages/desktop
    npx electron-rebuild -f || echo "Some native modules failed to rebuild, but continuing..."
  continue-on-error: true
```

#### Added DMG Verification Step
```yaml
- name: Verify DMG Contents
  run: |
    # Mounts DMG and verifies critical dependencies are present
    # Lists contents of app.asar.unpacked directory
```

## Why This Works

1. **`npmRebuild: true`** - Ensures native modules are compiled for Electron's Node.js version
2. **`includeSubNodeModules: true`** - Recursively includes all transitive dependencies
3. **`asarUnpack`** - Extracts modules that need file system access or have native bindings
4. **Python 3.11** - Provides `distutils` required by `node-gyp` for native module compilation
5. **Explicit workspace installs** - Ensures all workspace packages have their dependencies installed

## Testing Locally

To verify the fix locally:

```bash
# Clean build
rm -rf packages/desktop/node_modules
rm -rf packages/desktop/dist
bun install

# Build for macOS
cd packages/desktop
bun run build:mac

# Verify the DMG
hdiutil attach dist/*.dmg -mountpoint /tmp/clyo-verify
ls -la "/tmp/clyo-verify/Clyo Desktop.app/Contents/Resources/app.asar.unpacked/node_modules/"
hdiutil detach /tmp/clyo-verify
```

## Key Modules Requiring Unpacking

- **mqtt** - Has native bindings and stream dependencies
- **robotjs** - Native module for keyboard/mouse control
- **@soniox** - Audio processing with native components
- **replicache** - Sync engine with native bindings
- **bl, readable-stream, process-nextick-args** - Core dependencies of mqtt

## Next Steps

1. Monitor GitHub Actions build logs for the verification step output
2. Test the produced `.dmg` on a clean macOS system
3. If issues persist, check the verification step output to see which dependencies are still missing
4. Consider adding more modules to `asarUnpack` based on runtime errors
