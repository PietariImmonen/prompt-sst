# SST Replicache Template — Product Context

## 1. Product Overview

### 1.1 Vision
Deliver a reference-quality SaaS workspace experience that showcases how SST, Replicache, and Bun combine to build a real-time, multi-tenant application. The template ships opinionated patterns for account onboarding, workspace administration, and collaborative data sync so new product teams can fork the repo and ship customer-facing features immediately.

### 1.2 Core Principles
- **Multi-tenant by Default** – every account can own or join multiple workspaces with isolated data scopes.
- **Offline-friendly Collaboration** – Replicache drives optimistic updates, local-first UX, and "poke" notifications to keep clients in sync.
- **AWS-native Infrastructure** – SST provisions AppSync-adjacent primitives (Lambda, Api, IoT Core) with minimal boilerplate.
- **Single Source of Truth** – `packages/core` defines the domain models, migrations, and utilities consumed by all runtimes.
- **Bun Everywhere** – Bun workspaces orchestrate builds, tests, and scripts across the monorepo.

## 2. User & Persona Snapshot

### 2.1 Primary User
- SaaS founders and product engineers who need a working baseline for real-time collaboration features (workspace setup, user invites, shared settings).
- Trusts server-driven validation, expects instant feedback, and requires deploy-ready infrastructure from day one.

### 2.2 Secondary User
- Workspace members invited by an account owner. They care about frictionless sign-in, default settings, and predictable sharing semantics.

## 3. Platform Surfaces

- **Web Client (`packages/app`)** – Vite + React 19, Tailwind CSS v4, i18n-ready routes under `src/routes/**`. Provides auth flows, workspace creation, dashboard shell, and settings panels. Replicache providers live in `src/providers/replicache-provider` and feed hooks in `src/data/**`.
- **Desktop Client (`packages/desktop`)** – Electron + React shell that consumes the same core contracts. Mirrors the workspace UX for desktop-centric teams and relies on Bun-powered Electron tooling.
- **Serverless Functions (`packages/functions`)** – Hono handlers for REST endpoints (`src/api/**`), Replicache push/pull, and OpenAuth flows. Uses SST bindings for resources such as Cognito/OpenAuth, event bus, and IoT topics.
- **Domain Core (`packages/core`)** – Drizzle schema, domain services, and shared utilities. Exposes typed models (e.g., `WorkspaceSchema`, `UserSchema`), actor context helpers, and transaction utilities.
- **Infrastructure (`infra/`)** – SST stacks for Auth, API Gateway, IoT, Postgres (via RDS or LibSQL), and supporting queues. Configured through `sst.config.ts` and deployed with `bun run build && bun run deploy:<stage>`.

## 4. Key Capabilities

### 4.1 Authentication & Accounts (P0)
- OpenAuth issuer (Google OAuth out of the box) issues JWTs for the web and desktop clients.
- Account-level middleware (`packages/functions/src/api/auth.ts`) materialises actors (`account`, `user`, `system`) for downstream handlers.
- `/auth/login` and `/auth/register` React routes provide localized copy, toast-based error handling, and redirect awareness.

### 4.2 Workspace Lifecycle (P0)
- Accounts can create new workspaces via POST `/workspace`, selecting `organization` or `individual` types.
- Workspace creation automatically seeds an admin `User` record and default `UserSettings` using system-actor transactions.
- Workspace routing follows `/:workspaceSlug/*`, with fallbacks at `src/routes/workspace/not-found.tsx`.

### 4.3 Membership & Settings (P1)
- Replicache mutators manage optimistic user CRUD (`packages/app/src/data/user-store.tsx`) and settings updates (`user-settings.tsx`).
- Server-side domain logic (`packages/core/src/domain/user`) enforces workspace scoping, invite status, and soft deletes (`timeDeleted`).
- User settings persist preferences such as language and onboarding state; defaults are established at workspace bootstrap.

### 4.4 Real-time Sync (P1)
- Replicache pull endpoints serve workspace-scoped data snapshots; push handlers fan-out changes through the `Replicache` domain.
- `packages/core/src/domain/realtime` publishes IoT Core messages (`poke`) so subscribed clients refetch deltas immediately.
- Client-side `ReplicacheProvider` wires auth headers, diff server URLs, and mutation definitions.

### 4.5 Admin & Observability (P2)
- Event bus hooks exist for auditing (`User.Events.UserCreated`) and can be extended for metrics ingestion.
- Scripts in `packages/scripts` target data cleanup, seeding, and billing reconciliation via Bun entrypoints.

## 5. Data & Domain Model

| Entity | Description | Source |
| --- | --- | --- |
| `Account` | Top-level identity created via OpenAuth; may own multiple workspaces. | `packages/core/src/domain/account` |
| `Workspace` | Tenant boundary with slug, type, and soft-delete fields. | `packages/core/src/domain/workspace` |
| `User` | Workspace member tied to an account email; tracks role, status, onboarding flags. | `packages/core/src/domain/user` |
| `UserSettings` | Per-user preferences surfaced in the client. | `packages/core/src/domain/user-settings` |
| `Replicache` | Helpers to poke connected clients after mutations. | `packages/core/src/domain/replicache` |

Refer to `packages/core/src/models/**` for the Zod schemas that the app and functions consume.

## 6. Environments & Tooling

- **Local Development**: `bun run dev` launches SST dev (API + Hono functions) and proxies the Vite client. Use `bun run --filter app dev` for a standalone web preview, or `bun run --filter @sst-replicache-template/desktop dev` for Electron.
- **Type Safety**: `bun run typecheck` validates TypeScript across workspaces. Individual packages expose their own `typecheck` scripts when needed.
- **Linting & Format**: `bun run --filter app lint` ensures UI code meets ESLint rules. Run `bunx prettier --write "packages/**/*.ts*"` to keep imports and Tailwind class names normalized.
- **Database**: Drizzle migrations live in `packages/core/migrations`. Execute via `bun run --filter @sst-replicache-template/core db:migrate` inside an SST shell.

## 7. Success Indicators

- Seamless workspace creation and navigation with no console errors in web or desktop shells.
- Replicache mutations reconcile within 100 ms of a poke across clients.
- Bun-based scripts and tests complete without falling back to Node-specific tooling.
- Domain changes flow through `packages/core` and remain type-safe in dependents without drift.

## 8. Open Opportunities

- Expand provider coverage beyond Google (e.g., code or password flows are scaffolded but disabled in `auth.ts`).
- Introduce richer sample data and dashboards under `src/routes/workspace/<feature>` to illustrate deeper Replicache patterns.
- Layer automated contract tests in `packages/functions/src/**/__tests__` to guard the API surface as features scale.
