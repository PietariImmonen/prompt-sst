# Quick Start - Development with Microphone Access

## First Time Setup (One Time Only)

### 1. Install Dependencies
```bash
bun install
```

### 2. Setup Development Permissions (macOS)
```bash
cd packages/desktop
bun run setup:dev-permissions
```

**This signs the Electron binary with microphone and accessibility permissions.**

### 3. Grant macOS Permissions

Open **System Settings** → **Privacy & Security** → **Microphone**:

- Enable **"Electron"** (if it appears)
- OR enable your **terminal app** (Terminal, iTerm2, VS Code)

### 4. Start Development
```bash
bun run dev
```

**That's it!** Microphone now works in development mode. 🎤

---

## Daily Development

Just run:
```bash
bun run dev
```

No need to rebuild or re-setup unless you upgrade Electron.

---

## When to Re-Run Setup

Re-run `bun run setup:dev-permissions` if:

- ✅ You upgrade Electron (`bun install` after version change)
- ✅ You delete `node_modules` and reinstall
- ✅ You see "Permission denied" errors

Otherwise, you're good to go! ✨

---

## Testing Transcription

1. Run `bun run dev`
2. Navigate to `/transcription-test-direct`
3. Click "Start Recording"
4. Speak into microphone
5. Click "Stop"
6. Audio player appears with your recording

---

## Troubleshooting

### No microphone access in dev?

```bash
# Re-run setup
bun run setup:dev-permissions

# Check System Settings → Privacy → Microphone
# Enable Electron or your terminal

# Restart dev server
bun run dev
```

### Built app has no permissions?

Production builds are automatically signed with entitlements.
Just build and run:

```bash
bun run build:mac
```

---

## Files Created

- ✅ `scripts/setup-dev-permissions.sh` - Setup script
- ✅ `build/entitlements.mac.plist` - Production entitlements (updated)
- ✅ `DEV_PERMISSIONS_SETUP.md` - Full documentation
- ✅ `package.json` - Added `setup:dev-permissions` script

---

**Time saved**: ~95% faster iteration for microphone features! 🚀
