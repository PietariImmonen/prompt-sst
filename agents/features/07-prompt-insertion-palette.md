# Prompt Insertion Palette

- ID: 07-prompt-insertion-palette
- Owner: TBA
- Priority: P0
- Target Release: Next milestone

## Context Snapshot

- Extends the captured prompt workflow (see `03-desktop-prompt-capture`) by letting users re-use stored prompts inline, supporting the single source of truth and offline-first goals in `agents/context.md`.
- Helps both primary personas—founders building flows and invited workspace members composing replies—avoid context switching when drafting text across the web and desktop clients.
- Aligns with design guidance favouring compact, Linear-inspired overlays; references pictured command palette pattern as the visual benchmark.

## Goals & Non-Goals

- **Goals**
  - Provide a keyboard shortcut (`Cmd+Shift+O` on macOS, `Ctrl+Shift+O` on Windows/Linux) that opens a prompt search palette when focus is inside any text input or textarea across web and desktop shells.
  - Surface a small, high-contrast dropdown anchored to the active field that lists prompts from the cached Replicache store with fuzzy search and keyboard navigation.
  - Insert the selected prompt’s body (and optionally its title as a prefix toggle) into the active field at the caret position when the user presses `Enter` or clicks.
  - Ensure palette interactions are accessible (ARIA roles, focus trap, clear dismissal shortcuts) and do not break existing input behaviour.
- **Non-Goals**
  - Prompt editing, tagging, or creation flows; palette only consumes existing captured prompts.
  - Advanced formatting or templating (e.g., variable substitution, markdown rendering).
  - Cross-workspace selection UI; palette respects the workspace already resolved in client state.

## Dependencies & Risks

- Requires reliable access to the prompt collection in local client state; Replicache pulls must include all fields needed for search and insertion.
- Keyboard shortcut conflicts may occur with browser extensions or OS-level palettes; need fallback UI affordance (e.g., button) and configurable shortcut.
- Desktop global activation (“anywhere in your computer”) may demand Electron global shortcuts plus focused window injection; must ensure security and privacy when pasting into external apps.
- Must guard against inserting prompts into password fields or inputs with restricted formats; need detection/opt-out.

## Implementation Blueprint

- **packages/core**
  - Expose a lightweight prompt projection (ID, title, body, tags) for client consumption if not already present; consider adding search metadata (normalized text) for future server-side filtering.
- **packages/functions**
  - Ensure Replicache pull payloads include prompt fields required for palette search; optionally add `/prompt/search` endpoint for long-term scalability while keeping MVP client-side.
  - Confirm auth middleware enforces workspace scoping for prompt reads.
- **packages/app**
  - Create `src/components/prompt-insertion-palette/` hosting the UI (using Shadcn `Command` primitive) plus a hook `usePromptInsertionPalette` for state, keyboard bindings, and anchor positioning.
  - Introduce a tiny DOM utility that listens for `Cmd/Ctrl+Shift+O` when `document.activeElement` is an editable control; mount palette via portal so it renders above all routes.
  - Pull prompt data via selectors from `@/data/prompt-store`; implement client-side fuzzy search (e.g., `match-sorter` or custom score) with debounced input.
  - On selection, inject prompt text into the active element using native APIs (`setRangeText`) while respecting undo stack and leaving caret at end.
  - Provide secondary trigger (icon button) for accessibility and conflict fallbacks; wrap instructions in tooltip.
- **packages/desktop**
  - Reuse the shared React component; ensure Electron renderer registers the same keyboard listener even when the palette is rendered in embedded webviews.
  - If “anywhere on computer” is required, extend main process to watch global shortcut and determine the target editable surface (likely future work/open question).
- **packages/scripts**
  - Optional: add maintenance script to backfill prompt slugs/normalized text if needed for search performance.

## Strict TODO Checklist

- [x] Verify `packages/core` prompt models expose required fields and serialization for palette search; extend domain/types if needed.
- [x] Update Replicache pull schema and `packages/app/src/data/prompt-store.tsx` selectors to supply prompt lists capped for client search.
- [x] Build `packages/app/src/components/prompt-insertion-palette/` with Shadcn command list, keyboard navigation, pointer support, and portal anchoring.
- [x] Implement global shortcut listener respecting focused editable elements and preventing conflicts with existing shortcuts.
- [x] Insert prompt text into inputs/textareas with undo support and guardrails for sensitive fields (e.g., `type="password"`).
- [x] Mirror the palette in the desktop renderer, confirming parity and shortcut handling within Electron windows.
- [x] Document fallback trigger UI/icon in shared layout so users discover the feature if shortcuts fail.
- [ ] Run `bun run --filter app lint`, `bun run typecheck`, and `bun run --filter @sst-replicache-template/desktop dev` smoke test to confirm no regressions.

## Test & QA Plan

- Manual web test: focus a textarea in various routes, press `Cmd+Shift+O`, search, navigate with arrow keys, press `Enter`, confirm insertion at caret and palette dismissal.
- Manual desktop test: same as web plus verifying shortcut works in Electron shell and undo (`Cmd+Z`) removes inserted text.
- Edge cases: empty prompt library (show friendly empty state), long prompt bodies (ensure list truncation but full insertion), multi-line insertion inside single-line inputs, presence in modals.
- Automated: add unit tests for prompt palette hook (search scoring, insertion functions) with React Testing Library; extend domain tests if new selectors or serializers added.
- Pre-flight checks: `bun run --filter app lint`, `bun run typecheck`, relevant desktop smoke run.

## Open Questions

- Does “use this anywhere in your computer” imply inserting into non-app contexts (e.g., native apps) via desktop global shortcut, or is scope limited to our web/desktop clients? You should be able to use it for example in Cursor and other desktop apps as well as in Browser.
- Should users be able to configure the keyboard shortcut or disable palette per workspace/user preference? Lets limit it now to cmd + shift + o
- Do we need to respect field-specific formatting (e.g., markdown vs plain text) or apply template variables before insertion? No
