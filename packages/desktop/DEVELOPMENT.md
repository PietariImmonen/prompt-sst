# Desktop App Development Guide

## Quick Start

### Option 1: With SST Running (Recommended)

1. Start SST backend:

   ```bash
   bun run dev
   ```

2. In another terminal, start the desktop app:
   ```bash
   bun run desktop:dev
   ```

### Option 2: Without SST (Development Mode)

If SST is not running, the desktop app will use fallback development values:

```bash
bun run desktop:dev:fallback
```

The app will work with mock endpoints for development purposes.

## Development Workflow

### Full Stack Development (Recommended)

```bash
# Terminal 1: Start SST backend
bun run dev

# Terminal 2: Start desktop app with SST resources
bun run desktop:dev
```

### Frontend-Only Development

```bash
# Start desktop app with fallback values (no SST needed)
bun run desktop:dev:fallback
```

### Type Checking

```bash
# With SST running (full type checking)
bun run desktop:typecheck

# Without SST (may have some type issues in backend imports)
bun run --filter @sst-replicache-template/desktop typecheck
```

## What Changed

### ✅ Before (Problematic)

- Manual environment variable configuration
- Type errors when importing from core/functions packages
- Workarounds and try-catch blocks for Resource access
- Fragile TypeScript configuration with complex excludes

### ✅ After (Clean)

- Automatic SST resource injection via `sst bind`
- Full type safety for all core and functions imports
- Clean, simple TypeScript configuration
- Same backend resources as web app

## Key Benefits

1. **No Type Issues**: Full access to `@sst-replicache-template/core` and `@sst-replicache-template/functions` packages without any TypeScript errors.

2. **Same Backend**: Uses identical API endpoints, authentication, database, and real-time infrastructure as the web application.

3. **Hot Reloading**:

   - SST backend changes reload automatically
   - Vite frontend changes reload automatically
   - Perfect development experience

4. **Simplified Configuration**: No manual environment setup or configuration files needed.

## Scripts Explained

| Script                         | Purpose                                         |
| ------------------------------ | ----------------------------------------------- |
| `bun run desktop:dev`          | Start desktop app with SST resources injected   |
| `bun run desktop:dev:fallback` | Start desktop app with fallback values (no SST) |
| `bun run desktop:typecheck`    | Type check with SST resources available         |
| `bun run desktop:env`          | Generate `.env` file (alternative approach)     |
| `bun run desktop:build`        | Build for production with environment variables |

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Desktop App   │    │    SST Backend  │    │   Web App       │
│                 │    │                 │    │                 │
│ • Same API      │◄──►│ • Lambda Funcs  │◄──►│ • Same API      │
│ • Same Auth     │    │ • Database      │    │ • Same Auth     │
│ • Same Realtime │    │ • Auth Service  │    │ • Same Realtime │
│ • Same Database │    │ • Realtime      │    │ • Same Database │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Troubleshooting

### "Resource not found" errors

Make sure SST is running: `bun run dev`

### Type errors in core/functions

Use the SST-bound typecheck: `bun run desktop:typecheck`

### Environment variables not loading

The desktop app should work automatically with `sst bind`. If you need manual env vars, run: `bun run desktop:env`
