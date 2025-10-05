# Chrome Extension Setup Guide

## Quick Start

1. **Generate Icons** (first time only):
   ```bash
   bun run generate-icons
   ```

2. **Start Development**:
   ```bash
   bun run dev
   ```

   Or from project root:
   ```bash
   bun dev  # Starts both SST and Chrome plugin
   ```

3. **Load Extension in Chrome**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select: `/packages/chrome-plugin/build/chrome-mv3-dev`

4. **Test the Extension**:
   - Click the extension icon in Chrome toolbar
   - Click "Login" to authenticate
   - Extension will sync with your local backend

## Development Workflow

### Environment Setup

The `.env` file contains your API configuration:
```env
PLASMO_PUBLIC_API_URL=http://localhost:3000
```

Make sure your SST backend is running:
```bash
# In project root
bun dev
```

### File Structure

```
src/
├── popup.tsx              # Main popup UI (appears when clicking extension icon)
├── background.ts          # Background service worker
├── content.ts            # Runs on auth callback pages
├── providers/
│   ├── auth-provider.tsx # Handles authentication state
│   └── replicache-provider.tsx # Manages data sync
├── hooks/
│   └── use-prompts.ts    # Access prompts from Replicache
├── lib/
│   ├── mutators.ts       # Replicache mutation functions
│   └── types.ts          # Type definitions from @prompt-saver/core
└── components/           # Reusable React components
```

### Making Changes

1. Edit files in `src/`
2. Plasmo will automatically rebuild
3. Reload the extension in Chrome (click reload icon in `chrome://extensions/`)

### Hot Reload

Plasmo supports hot reload for most changes. For some changes (like manifest updates or background script changes), you may need to reload the extension manually.

## Authentication Flow

1. User clicks "Login" button
2. New Chrome tab opens to auth URL
3. User completes authentication
4. Content script captures auth token from URL
5. Token is stored in Chrome storage
6. Extension popup updates with logged-in state

## Data Sync with Replicache

The extension syncs data with your backend using the same Replicache setup as the desktop app:

- **Offline-first**: Data is cached locally
- **Optimistic updates**: UI updates immediately
- **Automatic sync**: Changes sync when online
- **Conflict resolution**: Handled by Replicache

## Building for Production

```bash
bun run build
```

Output will be in `build/chrome-mv3-prod/`

To create a distributable ZIP:
```bash
bun run package
```

## Troubleshooting

### Extension won't load
- Make sure you've run `bun run generate-icons` first
- Check that the build directory exists
- Try rebuilding: `rm -rf build && bun dev`

### Authentication not working
- Verify SST backend is running
- Check API URL in `.env`
- Look for errors in browser console (F12)

### Replicache sync issues
- Check network tab for failed API calls
- Verify workspace ID is correct
- Check backend logs for sync endpoint errors

### Icons not showing
- Run `bun run generate-icons`
- Rebuild the extension
- Reload in Chrome

## Next Steps

- Customize the popup UI in `src/popup.tsx`
- Add content scripts for specific websites
- Implement additional features using the hooks
- Add options page for settings
- Customize icons in `assets/`

## Resources

- [Plasmo Documentation](https://docs.plasmo.com/)
- [Chrome Extension API](https://developer.chrome.com/docs/extensions/)
- [Replicache Documentation](https://replicache.dev/)
