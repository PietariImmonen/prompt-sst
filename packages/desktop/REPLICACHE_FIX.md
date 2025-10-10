# Replicache Pull Issue Fix

## Problems Identified

1. **Malformed URLs (`ERR_NAME_NOT_RESOLVED`)**

   - The `VITE_API_URL` was missing a trailing slash
   - When concatenated with `'sync/pull'`, it created invalid URLs like `http://localhost:3001/apisync/pull`
   - Should be `http://localhost:3001/api/sync/pull`

2. **Excessive Concurrent Pull Requests**

   - React StrictMode was causing Replicache to be instantiated multiple times
   - Multiple concurrent pull requests to the same database were causing serialization errors
   - Error code `40001` from PostgreSQL: "could not serialize access due to concurrent update"

3. **Continuous Failed Pull Attempts**
   - The malformed URLs meant Replicache kept retrying failed requests
   - This created a spam loop hitting the Lambda endpoint

## Solutions Implemented

### 1. Fixed URL Construction in `replicache-context.tsx`

```typescript
// Ensure API URL has trailing slash for proper URL construction
const apiUrl = import.meta.env.VITE_API_URL.endsWith('/')
  ? import.meta.env.VITE_API_URL
  : import.meta.env.VITE_API_URL + '/'

const rep = new Replicache({
  pullURL: apiUrl + 'sync/pull',
  pushURL: apiUrl + 'sync/push'
  // ...
})
```

### 2. Updated Environment Generation Script

Modified `scripts/generate-desktop-env.mjs` to handle URL formatting correctly:

```javascript
// API URL needs trailing slash for Replicache sync endpoint construction
const apiUrl =
  (process.env.DESKTOP_API_URL ?? outputs.DesktopApiUrl ?? 'http://localhost:3001/api').replace(
    /\/$/,
    ''
  ) + '/'

// Auth URL should NOT have trailing slash - OpenAuth client adds paths like /authorize
const authUrl = (
  process.env.DESKTOP_AUTH_URL ??
  outputs.DesktopAuthUrl ??
  'http://localhost:3001/auth'
).replace(/\/$/, '')
```

**Important:** Different libraries have different URL conventions:

- **Replicache** needs trailing slash → `http://localhost:3001/api/`
- **OpenAuth** needs no trailing slash → `http://localhost:3001/auth`
- **Hono client** needs no trailing slash → handled in code

### 3. Improved Replicache Lifecycle Management

Updated `replicache-provider.tsx` to prevent double-mounting issues in React StrictMode:

```typescript
React.useEffect(() => {
  let isSubscribed = true

  const _replicache = createReplicache({
    token: props.token,
    workspaceId: props.workspaceID
  })

  // Only set replicache if the component is still mounted
  if (isSubscribed) {
    setReplicache(_replicache)
  } else {
    _replicache.close()
  }

  return () => {
    isSubscribed = false
    _replicache.close()
  }
}, [props.token, props.workspaceID])
```

### 4. Fixed Hono Client URL Handling

Updated `lib/hono.ts` to handle trailing slashes properly (Hono client prefers no trailing slash):

```typescript
const apiUrl = import.meta.env.VITE_API_URL.endsWith('/')
  ? import.meta.env.VITE_API_URL.slice(0, -1) // Remove trailing slash for hono client
  : import.meta.env.VITE_API_URL
```

## Backend Retry Logic

The backend already has proper retry logic for database serialization errors in `packages/functions/src/api/replicache.ts`:

- Up to 3 retry attempts with exponential backoff (50ms, 100ms)
- Only retries on PostgreSQL error code `40001` (serialization failure)
- Properly logs retry attempts

## Testing

After applying these fixes:

1. Regenerate the `.env` file: `bun run scripts/generate-desktop-env.mjs`
2. Restart the desktop app
3. Monitor the console - you should see:
   - Valid URLs being constructed
   - Fewer pull requests
   - No `ERR_NAME_NOT_RESOLVED` errors
   - Occasional retry messages for serialization errors (which is normal and will succeed on retry)

## Additional Fixes

### 5. Reduced Background Service Sync Frequency

The background data service was syncing every 30 seconds, which was excessive since Replicache in the renderer already handles all sync operations. Updated to:

- Initial sync on startup (to populate cache)
- Periodic sync every 5 minutes (just to keep cache fresh for offline use)
- The background service is primarily for offline prompt capture, not for regular data sync

### 6. Normalized URLs in Background Service

Added `normalizeApiUrl()` helper method in `background-data-service.ts` to remove trailing slashes before URL construction:

```typescript
private normalizeApiUrl(url: string | null): string | null {
  if (!url) return null
  // Remove trailing slash for consistent URL construction
  return url.endsWith('/') ? url.slice(0, -1) : url
}
```

This is applied when loading environment config and when setting auth data.

### 7. Fixed MQTT Connection Errors in Development

Added check to skip MQTT connection attempts when using development fallback values (when `realtimeEndpoint` is `localhost`):

```typescript
// Skip MQTT connection in development when using fallback localhost values
if (this.realtimeEndpoint === 'localhost' || this.realtimeEndpoint.includes('127.0.0.1')) {
  console.log('⚠️  Skipping MQTT connection - using development fallback configuration')
  console.log('   Start SST backend and regenerate .env for realtime updates')
  return
}
```

This prevents the `ECONNREFUSED` errors when the app tries to connect to `localhost:443` for MQTT in development mode.

## Expected Behavior

- ✅ Replicache will make pull requests to the correct endpoint
- ✅ Database serialization errors may still occur occasionally during concurrent operations, but will automatically retry and succeed
- ✅ No more spam loops of failed requests
- ✅ Background service syncs every 5 minutes instead of 30 seconds
- ✅ No MQTT connection errors in development mode with fallback config
- ✅ Cleaner console logs with successful sync operations
- ✅ Reduced load on the Lambda backend
