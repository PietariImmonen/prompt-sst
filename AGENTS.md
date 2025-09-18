# Repository Guidelines

## Project Structure & Module Organization
- `src/main` owns the Electron main process, window lifecycle, and auto-update wiring.
- `src/preload` exposes typed context bridges; keep the API surface minimal and audited.
- `src/renderer/src` houses the React app with feature folders (`pages/`, `components/`, `store/`, `services/`, `hooks/`, `lib/`, `types/`, `utils/`, `constants/`, `assets/`). Page folders must include a `components/` subdirectory with one folder per component (e.g., `components/profile-card/{profile-card.tsx,index.tsx}`).
- `src/shared` centralizes cross-process utilities, IPC contracts, and shared constants typed with Zod.
- `resources/` stores packaging assets; build artifacts land in `build/` (intermediate) and `out/` (distributables).
- `agents/context.md` mirrors the latest product scope and canonical directory layout; update it whenever architecture or flows change.
- `agents/features/` tracks feature TODOs—create or update a markdown checklist per feature describing goal, owner, blockers, and acceptance notes.
- `agents/design-guidelines.md` defines the UI system, file conventions, and Shadcn composition rules; consult it before shipping visual work.

## Build, Test, and Development Commands
- `pnpm install` prepares dependencies and native Electron binaries.
- `pnpm dev` launches Electron + Vite with hot reload across main, preload, and renderer.
- `pnpm start` runs the built preview for production validation.
- `pnpm build` performs full type checks and emits bundles into `out/`.
- `pnpm lint`, `pnpm format`, and `pnpm typecheck` enforce ESLint, Prettier, and TypeScript standards; run them before each commit.

## Coding Style & Naming Conventions
- Default to TypeScript with 2-space indentation and let Prettier format; do not hand-edit generated files.
- Compose all UI from Shadcn primitives found in `components/ui`; extend via wraps or variants rather than custom base components.
- Use PascalCase for React component exports and Zustand stores, camelCase for hooks/utilities, SCREAMING_SNAKE_CASE for constants, and kebab-case for file names (`profile-card.tsx`).
- Keep component files under 300 lines; extract hooks or subcomponents to maintain brevity and preserve AI context tokens.
- Reusable components live in `src/renderer/src/components/<component-name>/` mirroring page-level structure with an `index.tsx` barrel.

## Testing Guidelines
- Automated tests are pending; run `pnpm lint` and `pnpm typecheck` and document manual scenarios exercised via `pnpm dev` in every PR.
- When adding modules, drop lightweight fixtures or walkthrough notes into the related `agents/features/` TODO to seed future automation.
- Flag risky surfaces (auth, filesystem, updates) with reproduction steps so reviewers can verify behavior.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (`feat:`, `fix:`, `chore:`) with optional scopes describing the affected area.
- Keep commits focused and runnable; avoid mixing unrelated renderer and main updates without rationale.
- PRs must include a concise summary, linked issues, screenshots or screen recordings for UI work, environment notes, and updates to `agents/context.md`, `agents/features/`, or `agents/design-guidelines.md` when scope changes.
