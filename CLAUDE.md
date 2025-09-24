# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development

- `bun run dev` - Start SST development environment with live reloads and infrastructure
- `bun run build` - Build for production
- `bun run typecheck` - Run TypeScript validation across all workspaces
- `bun run deploy:dev` / `bun run deploy:production` - Deploy to AWS environments

### Package-Specific Commands

- `bun run --filter app dev` - Start Vite development server for web app
- `bun run --filter app build` - Build web app for production
- `bun run --filter app lint` - Run ESLint on web app
- `bun run --filter @prompt-saver/desktop dev` - Start Electron desktop app
- `bun run --filter @prompt-saver/core test` - Run core domain tests
- `bun run --filter @prompt-saver/core db:migrate` - Apply database migrations via `sst shell`

### Database Operations (via sst shell)

- `bun run --filter @prompt-saver/core db:generate` - Generate migrations
- `bun run --filter @prompt-saver/core db:push` - Push schema changes
- `bun run --filter @prompt-saver/core db:studio` - Open Drizzle Studio

## Architecture Overview

### Monorepo Structure

This is a Bun workspace monorepo with SST (Serverless Stack) infrastructure management:

- **Root**: SST configuration and shared scripts
- **`infra/`**: AWS resource definitions loaded by `sst.config.ts`
- **`packages/app/`**: Vite + React web application with Replicache sync
- **`packages/core/`**: Shared domain logic, Drizzle schema, and utilities
- **`packages/functions/`**: Hono-based Lambda handlers for API endpoints
- **`packages/desktop/`**: Electron desktop application sharing core domain models
- **`packages/scripts/`**: Bun-powered maintenance and utility scripts

### Key Technologies

- **SST v3**: Infrastructure as code and local development environment
- **Replicache**: Client-side sync and offline-first data management
- **Drizzle ORM**: Type-safe database operations with PostgreSQL
- **Hono**: Lightweight web framework for Lambda functions
- **React 19**: UI framework for both web and desktop clients
- **Electron**: Desktop application wrapper
- **Tailwind CSS + Radix UI**: Styling and component library

### Data Flow

1. **Frontend (Web/Desktop)** uses Replicache for local-first data sync
2. **Core package** defines domain models and shared business logic
3. **Functions package** handles API requests and Replicache sync via Hono
4. **Infrastructure** provisions AWS resources (Lambda, RDS, S3, etc.)

### Authentication & Security

- Uses OpenAuth for authentication flows
- Supabase integration for additional services
- AWS services configured via SST with proper IAM roles

## Development Workflow

### Getting Started

1. Set up AWS SSO: `bun run sso`
2. Start development: `bun run dev`
3. Access local web app via Vite proxy
4. Desktop app connects to same SST endpoints

### Testing

- Core domain: `bun test --cwd packages/core`
- Web app linting: `bun run --filter app lint`
- Type checking: `bun run typecheck` (or package-specific variants)

### Code Style

- TypeScript-first with ES modules
- 2-space indentation, avoid default exports
- PascalCase for components, camelCase for functions, kebab-case for files
- Prettier formatting with import sorting and Tailwind class organization
- Conventional Commits with workspace scoping (e.g., `feat(core): add workspace sync`)

### Environment Configuration

- Desktop app requires environment generation via `bun run desktop:env`
- SST provides automatic environment binding via `sst shell`
- Use `sst bind` for IDE type safety with SST resources

### Basic information for AI agents

- `/agents`-folder has everything from project end goal, design guidelines, feature creation and features
