# Repository Guidelines

## Project Structure & Module Organization
- `src/main` owns the Electron main process, window lifecycle, and auto-update glue.
- `src/preload` exposes typed context bridges; keep the surface area minimal and audited.
- `src/renderer/src` contains the React app with feature folders (`components/`, `pages/`, `store/`, `services/`, `hooks/`, `lib/`, `types/`, `utils/`).
- `src/shared` hosts cross-process utilities, IPC contracts, and shared constants.
- `resources/` stores packaging assets; build outputs land in `build/` (intermediate) and `out/` (distributables).
- `agents/context.md` must always mirror the latest product scope and the canonical project tree; update it whenever architecture, flows, or directory layout shift.
- Track upcoming work in `agents/features/` by creating or updating TODO markdown files per feature, outlining goal, owner, blockers, and acceptance notes.

## Build, Test, and Development Commands
- `pnpm install` prepares dependencies and native Electron binaries.
- `pnpm dev` launches Electron + Vite with hot reload across main, preload, and renderer.
- `pnpm start` runs the packaged preview for production validation.
- `pnpm build` performs full type checks and emits bundles into `out/`.
- `pnpm lint`, `pnpm format`, and `pnpm typecheck` enforce ESLint, Prettier, and TypeScript standards; run them before each commit.

## Coding Style & Naming Conventions
- Default to TypeScript with 2-space indentation and defer formatting to Prettier; do not hand-edit generated files.
- Components, stores, and Zod schemas use PascalCase; hooks and utilities use camelCase; global constants prefer SCREAMING_SNAKE_CASE.
- Keep renderer logic scoped to its feature folder and shared contracts in `src/shared` to avoid drift.
- Reuse helpers like `cn` from `lib/utils.ts` for Tailwind composition instead of custom string joins.

## Testing Guidelines
- Automated tests are pending; run `pnpm lint` and `pnpm typecheck` and document manual scenarios exercised via `pnpm dev` in every PR.
- When adding modules, drop lightweight fixtures or walkthrough notes into the related `agents/features/` TODO to seed future automation.
- Flag risky surfaces (auth, filesystem, updates) with reproduction steps so reviewers can verify behavior.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (`feat:`, `fix:`, `chore:`) with optional scopes describing the affected area.
- Keep commits focused and runnable; avoid mixing unrelated renderer and main updates without rationale.
- PRs must include a concise summary, linked issues, screenshots or screen recordings for UI work, environment notes, and updates to `agents/context.md` or `agents/features/` when scope changes.
