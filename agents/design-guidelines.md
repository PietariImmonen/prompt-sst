# Design Guidelines

## Design Language

- Target a Linear-inspired aesthetic: muted grayscale palette, high contrast for primary actions, ample whitespace, and consistent 8px spacing.
- Prefer minimal ornamentation; rely on typography and subtle elevation to communicate hierarchy.
- Adopt existing Shadcn UI tokens for typography and radius; extend only when the component library cannot cover a use case.

## Component Foundations

- Build all UI using Shadcn components (`src/renderer/src/components/ui`) as the base. Compose rather than rewrite primitives.
- Keep component files under 300 lines to preserve AI context accuracy. Split stateful logic into hooks or reducer modules when files grow large.
- Extract shared logic (hooks, utils) into `src/renderer/src/hooks` or `src/renderer/src/utils` and reference them from components.

## Naming & File Structure

- Use kebab-case for component files: `profile-card.tsx`, `side-nav.tsx`, `prompt-table.tsx`.
- Every component lives inside its own folder with an `index.tsx` barrel exporting the main component and related hooks/types.
- Page-level folders contain a `components/` directory with subfolders per component, mirroring the naming pattern:
  - `src/renderer/src/pages/prompt-library/components/profile-card/profile-card.tsx`
  - `src/renderer/src/pages/prompt-library/components/profile-card/index.tsx`
- Reusable components belong in `src/renderer/src/components/` under their own folder (e.g., `components/prompt-card/`). This mirrors page structure for discoverability.

## Composition Practices

- Prioritize composable Shadcn primitives (e.g., `Button`, `Card`, `Dialog`) and extend via slots or wrapper components.
- Maintain layout consistency with `Stack`, `Grid`, or flex utility wrappers; avoid hard-coded pixel offsets.
- Define variant styling using `class-variance-authority` inside the component folder (`variants.ts`) when multiple visual states are required.

## Review Checklist

- [ ] Component folder and file names follow kebab-case convention.
- [ ] Files remain under 300 lines, or the split rationale is documented.
- [ ] Shadcn primitives compose the UI; no custom base components unless mirrored in `components/ui`.
- [ ] Page folders contain a `components/` subdirectory and re-export via `index.tsx`.
- [ ] Reusables live under `src/renderer/src/components/` with matching structure.
