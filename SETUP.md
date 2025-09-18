# Prompt Saver - Setup Guide

## Prerequisites

- Node.js 18+ with pnpm
- Supabase account and project
- OpenRouter API account (for AI categorization)

## Environment Setup

1. **Copy environment file:**

   ```bash
   cp .env.example .env
   ```

2. **Configure Supabase:**

   - Create a new Supabase project at [supabase.com](https://supabase.com)
   - Get your project URL and anon key from Settings > API
   - Update `.env` with your Supabase credentials:
     ```
     VITE_SUPABASE_URL=https://your-project.supabase.co
     VITE_SUPABASE_ANON_KEY=your-anon-key
     ```

3. **Set up Supabase database:**

   - Run the SQL schema from `src/renderer/src/services/supabase/schema.sql` in your Supabase SQL editor
   - This will create the required tables and security policies

4. **Configure OpenRouter (optional):**
   - Get API key from [openrouter.ai](https://openrouter.ai)
   - Add to `.env`:
     ```
     VITE_OPENROUTER_API_KEY=your-openrouter-key
     ```

## Installation

1. **Install dependencies:**

   ```bash
   pnpm install
   ```

2. **Run in development mode:**

   ```bash
   pnpm dev
   ```

3. **Build for production:**
   ```bash
   pnpm build
   ```

## Project Structure

The project follows a modular architecture:

- `src/main/` - Electron main process (background operations)
- `src/renderer/src/` - React frontend application
- `src/shared/` - Shared types and utilities
- `src/preload/` - Electron preload scripts

### Key Directories

- `src/renderer/src/components/` - UI components organized by feature
- `src/renderer/src/services/` - API services and external integrations
- `src/renderer/src/store/` - Zustand state management stores
- `src/renderer/src/hooks/` - Custom React hooks

## Development Guidelines

1. **State Management:** Use Zustand stores with custom hooks for clean abstractions
2. **API Calls:** All external API calls go through service layers
3. **Types:** Shared types are in `src/shared/types/`
4. **Styling:** Use Tailwind CSS with ShadCN UI components

## Authentication Flow

1. User signs in via Supabase Auth (email/password or OAuth)
2. Auth state is managed by `useAuthStore` with persistence
3. Protected routes require authentication
4. Session automatically refreshes

## Database Schema

See `src/renderer/src/services/supabase/schema.sql` for the complete database schema including:

- `prompts` table with RLS policies
- `categories` table for organization
- `shared_prompts` table for public sharing
- Full-text search capabilities

## Next Steps

Once the basic setup is complete, you can start implementing:

1. Authentication UI components
2. Dashboard and prompt library
3. Automatic prompt detection
4. Public prompt sharing
5. AI-powered categorization

## Troubleshooting

- **Build errors:** Run `pnpm typecheck` to check TypeScript issues
- **Supabase connection:** Verify environment variables and network access
- **Auth issues:** Check Supabase Auth settings and RLS policies
