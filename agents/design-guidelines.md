# Design Guidelines

## Design Language
- Maintain a Linear-inspired aesthetic: neutral grays, strong contrast on primary actions, generous whitespace, and an 8px spacing grid.
- Tailwind CSS v4 powers tokens; prefer semantic vars from `globals.css` instead of hard-coded colors.
- Components should feel native to both web and desktop shells—avoid browser-only affordances unless a desktop equivalent exists.

## Component Foundations
- Base all UI on Shadcn primitives under `packages/app/src/components/ui`. Compose and extend via props or slot wrappers instead of re-implementing raw Radix bindings.
- Co-locate feature-specific components under `packages/app/src/routes/<area>/<feature>/components/<component-name>/` with an `index.ts` barrel. Keep files under ~300 lines; extract hooks/utilities to `packages/app/src/hooks` or `packages/app/src/lib` when logic grows.
- Shared surfaces (navigation, tables, dialogs) belong in `packages/app/src/components/` with their own folder containing `component.tsx` (or `*.tsx`), styles, and an `index.ts` exporter.
- Desktop-specific shells follow the same conventions under `packages/desktop/src/renderer/components` to preserve parity. When a component must be shared between web and desktop, lift it into a workspace package that both apps can import (e.g., a new module in `packages/core`) and re-export it via `packages/app/src/components`.

## Naming & File Structure
- Use kebab-case for file and folder names (`workspace-sidebar`, `user-invite-form`).
- React components remain PascalCase, hooks camelCase, and stick to named exports.
- Route directories expose a top-level `index.ts` that re-exports the main component (`export * from "./workspace-create";`).
- Store Replicache data helpers inside `packages/app/src/data`; mutators live in `mutators.tsx` and should stay tree-shakeable.

## Composition Practices
- Leverage layout scaffolds from `packages/app/src/components/layout` (`RootLayout`, `SettingsLayout`, `WorkspaceLayout`) before introducing new wrappers.
- Centralize mutations through the Replicache provider: build UI against selectors from `@/data/*-store` and enqueue writes via `@/data/mutators`.
- Keep forms powered by `react-hook-form` + `zod` resolvers; declare schemas next to the component to align validation between client and domain models.
- Use variant helpers (Class Variance Authority) when components expose multiple visual states; store definitions alongside the component (`variants.ts`).

## Review Checklist
- [ ] Folder and file names follow kebab-case; components export via barrel files.
- [ ] Component files remain approachable (<300 LoC) or delegate logic to hooks/utilities.
- [ ] UI composes Shadcn primitives and Tailwind utility classes—no ad hoc DOM structures without reason.
- [ ] Routes include a `components/` directory for complex UIs and reuse shared components where practical.
- [ ] Replicache data flows reference `@/data` stores/mutators rather than duplicating fetch logic.
- [ ] Bun-era tooling (`bun run --filter app lint`, `bun run typecheck`) passes before submitting for review.
