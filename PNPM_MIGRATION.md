# Bun to pnpm Migration

## Overview

This repository has been successfully migrated from **Bun** to **pnpm** as the package manager. All scripts and dependencies have been updated accordingly.

## Changes Made

### 1. Root package.json (`package.json`)

Updated all scripts to use `pnpm` instead of `bun`:

- `"bun run --filter"` → `"pnpm --filter"`
- `"bun run"` → `"pnpm run"`

**Scripts updated:**

- `desktop:dev`
- `desktop:dev:fallback`
- `desktop:typecheck`
- `desktop:build`
- `chrome:dev`
- `chrome:build`

Added pnpm configuration for built dependencies:

```json
"pnpm": {
  "onlyBuiltDependencies": [
    "electron",
    "esbuild"
  ]
}
```

### 2. Desktop Package (`packages/desktop/package.json`)

- Replaced `bunx` with direct command invocation (since packages are available in node_modules)
- Changed `bun run` to `pnpm run` for local script execution
- Removed `pnpm.onlyBuiltDependencies` (moved to root)

**Script updates:**

- `format`: `bunx prettier` → `prettier`
- `lint`: `bunx eslint` → `eslint`
- `typecheck:node` & `typecheck:web`: `bunx tsc` → `tsc`
- `start`: `bunx electron-vite` → `pnpm dlx electron-vite`
- `build`: Updated to use `pnpm run` and `pnpm dlx`
- `build:mac`: Removed `bun --bun` prefix, uses `pnpm run`

### 3. Core Package (`packages/core/package.json`)

- Removed `@types/bun` from devDependencies
- Updated test scripts (currently placeholder: `echo 'No tests configured yet'`)

### 4. Chrome Plugin (`packages/chrome-plugin/package.json`)

- Updated `generate-icons`: `bun scripts/generate-icons.mjs` → `pnpm dlx node scripts/generate-icons.mjs`

### 5. Scripts Package (`packages/scripts/package.json`)

- Replaced `sst shell bun` with `sst shell pnpm exec tsx`
- Added `tsx` to devDependencies (required for TypeScript execution with pnpm)

**Commands updated:**

- `document-templates:create`
- `document-templates:create:production`
- `billing:prepare`
- `workspace:create`
- `workspace:create:production`
- `document-template:create:specific`
- `document-template:create:specific:production`
- `user-settings:create`
- `user-settings:clean`
- `clean-resources`
- `account:create`
- `account:insert`
- `usage:update`
- `users:create`

### 6. Web Package (`packages/www/package.json`)

- Updated build script: `bun --bun next build` → `pnpm next build`

## Installation

All dependencies have been freshly installed with pnpm. The old `bun.lock` file has been removed.

### Verify Installation

```bash
# Check key packages are installed
ls node_modules | grep -E "sonner|react|typescript|vite"

# Should show:
# - sonner
# - typescript
# - vite
# - react (and react-dom)
```

## Key Differences: pnpm vs Bun

| Feature               | Bun                 | pnpm                              |
| --------------------- | ------------------- | --------------------------------- |
| **Filter workspaces** | `bun run --filter`  | `pnpm --filter`                   |
| **Run npm packages**  | `bunx <package>`    | `pnpm dlx <package>`              |
| **Execute scripts**   | `bun <script.ts>`   | `pnpm exec tsx <script.ts>`       |
| **Run local scripts** | `bun run <script>`  | `pnpm run <script>`               |
| **Test runner**       | Built-in `bun test` | Needs vitest/other test framework |

## Verification Checklist

✅ All `package.json` files updated  
✅ Dependencies installed with pnpm  
✅ Desktop typecheck works: `pnpm --filter @prompt-saver/desktop typecheck:node`  
✅ Desktop typecheck web works: `pnpm --filter @prompt-saver/desktop typecheck:web`  
✅ Sonner package installed correctly  
✅ pnpm workspace hoisting configured  
✅ TSX available for script execution

## Troubleshooting

### Issue: Commands not found

**Solution**: Ensure you've run `pnpm install` from the repo root after pulling changes.

### Issue: TypeScript compilation fails

**Solution**: The `typescript` package should be installed. If not, run `pnpm install` again.

### Issue: "Module not found" in dev/build

**Solution**: Clear `node_modules` and `.pnpm-store`, then run `pnpm install --force`.

## Future Considerations

1. If using tests, replace `echo` placeholders with actual test runner commands (vitest, jest, etc.)
2. The `@types/bun` removal was deliberate - any Bun-specific APIs should be replaced with standard Node/npm alternatives
3. Consider adding `.pnpm-store` to `.gitignore` if not already present
