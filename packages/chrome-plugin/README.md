# Clyo Chrome Extension

A Chrome extension built with Plasmo framework that syncs with the Clyo backend using Replicache for offline-first data synchronization.

## Features

- 🔐 Authentication synced with main Clyo app
- 📦 Offline-first data sync with Replicache
- ⚡ Built with Plasmo framework for modern Chrome extension development
- 🎨 React-based UI with TypeScript
- 🔄 Real-time synchronization with backend

## Development

### Prerequisites

- Bun installed
- SST project running (`bun dev` in root)

### Setup

1. Generate icons (first time only):
   ```bash
   bun run generate-icons
   ```

2. Install dependencies (done automatically via workspace):
   ```bash
   bun install
   ```

3. Start development server:
   ```bash
   bun run dev
   # or from root:
   bun run chrome:dev
   ```

4. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `build/chrome-mv3-dev` directory

See [SETUP.md](./SETUP.md) for detailed setup instructions and troubleshooting.

### Building for Production

```bash
bun run build
# or from root:
bun run chrome:build
```

## Project Structure

```
src/
├── popup.tsx              # Main popup UI
├── background.ts          # Background service worker
├── content.ts            # Content script for auth callback
├── providers/
│   ├── auth-provider.tsx # Authentication state management
│   └── replicache-provider.tsx # Replicache client setup
├── hooks/
│   └── use-prompts.ts    # Hook for accessing prompts
├── lib/
│   ├── mutators.ts       # Replicache mutators
│   └── types.ts          # Type definitions from core
└── components/           # Reusable UI components
```

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
PLASMO_PUBLIC_API_URL=http://localhost:3000
```

For production, update the API URL to your production backend.

## Authentication Flow

1. User clicks "Login" in the extension popup
2. New tab opens to the auth URL
3. After successful authentication, the content script captures the token
4. Token is sent to background script and stored in Chrome storage
5. Extension popup updates with authenticated state

## Replicache Sync

The extension uses Replicache for:
- Offline-first data access
- Optimistic UI updates
- Automatic sync with backend when online
- Conflict resolution

Sync endpoints:
- Pull: `/sync/pull`
- Push: `/sync/push`

## Type Safety

All types are imported from `@prompt-saver/core` package to ensure consistency across the application:

- `Prompt` - Prompt data structure
- `User` - User information
- `Workspace` - Workspace details
- `UserSettings` - User preferences

## Integration with SST

The extension is integrated with the SST development workflow:

- Running `bun dev` in the root starts both SST and the Chrome extension
- The extension automatically connects to the local SST backend
- Environment variables are managed through `.env` files
