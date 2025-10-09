# Chrome Extension Replicache Migration

## Overview
Migrated the Chrome extension from direct API calls to using Replicache for prompt synchronization, enabling automatic background sync without requiring users to open the popup.

## Problem
- Extension was making direct API calls to `/prompt` endpoint
- Required users to open the popup to trigger sync
- Chrome extension and desktop app used different Replicache key formats causing duplicates
- Prompts appeared 3 times in desktop after being saved from Chrome

## Solution

### 1. Fixed Key Format Inconsistency
**File**: `packages/chrome-plugin/src/lib/mutators.ts`

Changed all Replicache keys to use leading slash format:
- Before: `prompt/${id}`
- After: `/prompt/${id}`

This matches the desktop app's key format, ensuring proper deduplication.

### 2. Background Replicache Integration
**File**: `packages/chrome-plugin/src/background.ts`

Added Replicache to the background service worker:

```typescript
import { Replicache } from 'replicache'
import { mutators } from './lib/mutators'

let replicache: Replicache<typeof mutators> | null = null

async function initReplicache(token: string, workspaceId: string, email: string) {
  replicache = new Replicache({
    name: `prompt-saver-${workspaceId}`,
    licenseKey: process.env.PLASMO_PUBLIC_REPLICACHE_LICENSE_KEY || '',
    mutators,
    pushURL: `${apiBaseUrl}/replicache/push`,
    pullURL: `${apiBaseUrl}/replicache/pull`,
    auth: `Bearer ${token}`,
    pullInterval: 30000,
    requestOptions: {
      headers: {
        'x-prompt-saver-workspace': workspaceId,
        'x-prompt-saver-email': email
      }
    }
  })
}
```

**Key Features**:
- Replicache instance lives in background service worker
- Initializes automatically when user authenticates
- Auto-syncs every 30 seconds via `pullInterval`
- Persists across Chrome sessions

### 3. Replaced API Calls with Replicache Mutations
**File**: `packages/chrome-plugin/src/background.ts` (line 252-262)

Before:
```typescript
const response = await fetch(`${apiBaseUrl}/prompt`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${account.token}`,
    'x-prompt-saver-workspace': workspaceId
  },
  body: JSON.stringify({ /* prompt data */ })
})
```

After:
```typescript
await replicache.mutate.prompt_create({
  content: prompt.content,
  title: prompt.title,
  source: prompt.source,
  metadata: {
    url: prompt.url,
    captureTimestamp: prompt.timestamp.toString(),
    captureSource: 'chrome-extension'
  }
})
```

### 4. Simplified Popup to Status Display
**File**: `packages/chrome-plugin/src/popup.tsx`

**Removed**:
- ReplicacheProvider wrapper
- Popup-based sync logic
- Manual sync triggering

**Changed To**:
- Status display only (pending count, last sync time)
- Listens for background sync events
- Updates every 5 seconds
- Shows visual indicators (pending/synced badges)

**UI Features**:
```tsx
<div className="flex items-center justify-between">
  <p className="text-sm font-medium">Capture Status</p>
  {capturedCount > 0 ? (
    <span className="text-xs bg-blue-500/10 text-blue-500 px-2 py-1 rounded">
      {capturedCount} pending
    </span>
  ) : (
    <span className="text-xs bg-green-500/10 text-green-500 px-2 py-1 rounded">
      ✓ Synced
    </span>
  )}
</div>
```

## Architecture

### Before
```
Content Script → Captures prompt
       ↓
Background Script → Stores in memory
       ↓
User Opens Popup → Triggers sync
       ↓
Popup Replicache → API Call → Backend
```

### After
```
Content Script → Captures prompt
       ↓
Background Script → Stores in memory
       ↓
Background Replicache → Auto-syncs every 30s → Backend
       ↑
Background Script → Triggers immediate sync on capture
```

### Benefits
1. **No popup required**: Sync happens automatically in background
2. **Persistent connection**: Background service worker maintains Replicache
3. **Automatic deduplication**: Proper key format prevents duplicates
4. **Consistent architecture**: Both desktop and extension use Replicache
5. **Offline support**: Replicache handles network issues gracefully
6. **Real-time sync**: 30-second pull interval keeps data fresh

## Data Flow

### Prompt Capture
1. User types prompt in ChatGPT/Claude/Gemini
2. Content script intercepts and sends to background
3. Background script stores in `capturedPrompts` array
4. Background script persists to `chrome.storage.local`
5. Background script triggers `syncCapturedPrompts()`

### Background Sync
1. `syncCapturedPrompts()` checks if Replicache is initialized
2. Iterates through `capturedPrompts` queue
3. For each prompt: `replicache.mutate.prompt_create()`
4. Removes from queue on success
5. Updates storage and notifies popup

### Replicache Sync
1. Mutation added to local Replicache state
2. Push happens automatically (optimistic UI)
3. Pull happens every 30 seconds
4. Desktop app receives update via same Replicache infrastructure

## Files Modified

### Core Changes
- `packages/chrome-plugin/src/background.ts` - Added Replicache, removed API calls
- `packages/chrome-plugin/src/popup.tsx` - Simplified to status display
- `packages/chrome-plugin/src/lib/mutators.ts` - Fixed key format

### Documentation
- `claudedocs/chrome-extension-replicache-migration.md` - This file

## Testing Checklist

- [x] Background Replicache initializes on auth
- [x] Prompts captured from ChatGPT/Claude/Gemini
- [x] Background sync happens automatically
- [x] No duplicates in desktop app
- [x] Popup shows correct status
- [x] Sync indicator updates properly
- [x] Works without opening popup
- [x] Persists across Chrome restarts

## Configuration

**Environment Variables Required**:
- `PLASMO_PUBLIC_REPLICACHE_LICENSE_KEY` - Replicache license
- `PLASMO_PUBLIC_API_URL` - Backend API base URL
- `PLASMO_PUBLIC_AUTH_URL` - Authentication service URL

## Known Limitations

1. **Service Worker Lifecycle**: Chrome may terminate background service workers after inactivity. Replicache instance will be recreated on next interaction.

2. **Initial Sync Delay**: When extension first starts, there may be a brief delay before Replicache connects.

3. **Network Issues**: If offline for extended period, captured prompts accumulate until connection restored.

## Future Enhancements

- Add retry logic with exponential backoff
- Show sync errors in popup UI
- Add manual sync button for troubleshooting
- Implement sync queue size limits
- Add telemetry for sync success/failure rates
