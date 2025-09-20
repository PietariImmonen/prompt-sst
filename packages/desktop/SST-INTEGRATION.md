# Desktop App SST Integration

This document explains how the Electron desktop app is integrated with SST (Serverless Stack) to use the same backend resources as the web application.

## Overview

The desktop app now properly connects to SST resources using the same approach as the web app:

- **API endpoints** from the SST backend
- **Authentication** through the same auth service
- **Real-time updates** via the same WebSocket infrastructure
- **Database access** through the same Replicache sync system

## Development Workflow

### Option 1: Using `sst bind` (Recommended)

This is the cleanest approach that automatically injects SST resources as environment variables:

```bash
# Start SST backend
bun run dev

# In another terminal, start desktop app with SST binding
bun run desktop:dev
```

The `desktop:dev` script uses `sst bind` to automatically inject all SST resources as environment variables, so the desktop app can access `Resource.Database`, `Resource.Auth`, etc. just like the backend functions.

### Option 2: Using environment file generation

If you prefer to generate a `.env` file:

```bash
# Start SST backend
bun run dev

# Generate environment variables from SST outputs
bun run desktop:env

# Start desktop app normally
bun run --filter @sst-replicache-template/desktop dev
```

## How It Works

### 1. Infrastructure Configuration

The desktop app gets the same environment variables as the web app through `infra/desktop.ts`:

```typescript
export const desktopConfig = {
  environment: {
    VITE_API_URL: api.url,
    VITE_AUTH_URL: auth.url,
    VITE_STAGE: $app.stage,
    VITE_REALTIME_ENDPOINT: realtime.endpoint,
    VITE_AUTHORIZER: realtime.authorizer
  }
}
```

### 2. Environment Variable Injection

**Development**: `sst bind` injects SST resources directly into the process environment.

**Production**: The `generate-desktop-env.js` script creates a `.env` file from SST outputs.

### 3. Type Safety

The desktop app includes proper TypeScript definitions for all environment variables in `src/renderer/src/env.d.ts`.

## Benefits

✅ **No more type issues** - Full access to core and functions packages without workarounds
✅ **Same backend** - Uses identical API, auth, and database as the web app  
✅ **Hot reloading** - SST dev mode + Vite HMR work together seamlessly
✅ **Type safety** - Proper TypeScript support for all SST resources
✅ **Simplified development** - No manual configuration or environment setup

## Scripts

| Script                  | Description                                      |
| ----------------------- | ------------------------------------------------ |
| `bun run desktop:dev`   | Start desktop app with SST binding (recommended) |
| `bun run desktop:env`   | Generate `.env` file from SST outputs            |
| `bun run desktop:build` | Build desktop app with environment variables     |

## Troubleshooting

### "Resource not found" errors

Make sure SST is running:

```bash
bun run dev
```

### Environment variables not loading

Try regenerating the environment file:

```bash
bun run desktop:env
```

### TypeScript errors in core/functions

The desktop app now uses the same SST resources as the backend, so there should be no type issues. If you see errors, make sure you're using `sst bind` or have generated the environment file.
