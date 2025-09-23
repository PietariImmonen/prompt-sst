# Repository Guidelines

## Project Structure & Module Organization

- The monorepo runs on Bun workspaces; root scripts orchestrate SST infrastructure and hoist shared dependencies.
- `infra/` defines AWS resources and stacks referenced from `sst.config.ts`.
- `packages/app/` contains the Vite + React client (components in `src/components`, routes in `src/routes`, providers in `src/providers`).
- `packages/core/` captures domain logic, Drizzle schema, and shared utilities consumed by functions and scripts.
- `packages/functions/` hosts Hono-based Lambda handlers exported from `src/**/index.ts`.
- `packages/scripts/` bundles Bun-powered maintenance tasks such as billing, seeding, and cleanup flows.
- `packages/desktop/` hosts the Electron client with its own React surface; it shares only core domain models and Replicache APIs with the web app.

## Build, Test, and Development Commands

- `bun run dev` starts `sst dev`, wiring the local infrastructure, live Lambda reloads, and frontend proxy.
- `bun run build` performs a production-ready SST build; follow with `bun run deploy:dev` or `bun run deploy:production` to publish.
- `bun run typecheck` runs TypeScript validation across the workspaces.
- Frontend: `bun run --filter app dev` launches Vite; `bun run --filter app build` emits the static bundle.
- Desktop: `bun run --filter @sst-replicache-template/desktop dev` launches Electron against the same SST endpoints.
- Core domain: `bun test --cwd packages/core` executes Bun tests; `bun run --filter @sst-replicache-template/core db:migrate` applies Drizzle migrations via `sst shell`.
- Scripts: invoke utilities with `bun run --filter @sst-replicache-template/scripts <command>` (e.g., `bun run --filter @sst-replicache-template/scripts users:create`).

## Coding Style & Naming Conventions

- TypeScript-first with ES modules and 2-space indentation; avoid default exports unless necessary.
- Use `PascalCase` for React components, `camelCase` for functions and variables, and `kebab-case` for file names.
- Run `bun run --filter app lint` before committing UI work; linting rules live in `eslint.config.mjs`.
- Format with Prettier (`bunx prettier --write "packages/**/*.ts*"`), which sorts imports and aligns Tailwind class names via configured plugins.

## Testing Guidelines

- Prefer Bun's built-in runner (`bun test`) for unit and integration tests inside `packages/core`; co-locate specs as `<name>.test.ts`.
- Stub external AWS, HTTP, and Replicache calls; avoid real service access in automated runs.
- For Lambdas, add contract tests under `packages/functions/src/**/__tests__` and sanity-check with `bun run dev` before deployment.
- Maintain coverage for new domain logic and supply regression tests for bug fixes.

## Commit & Pull Request Guidelines

- Follow Conventional Commits (e.g., `feat(core): add workspace sync metrics`) with imperative subjects capped at 72 characters.
- Scope messages by workspace or feature (`fix(app): correct onboarding redirect`).
- PRs must outline user impact, list verification steps (tests, local dev, deploy), and link to issues or tracking docs.
- Attach screenshots or terminal snippets for UI or script changes and call out follow-up tasks when relevant.
