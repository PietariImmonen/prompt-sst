# Prompt Saver Desktop App - Product Requirements Document

## 1. Product Overview

### 1.1 Product Vision

A seamless desktop application that automatically captures, categorizes, and manages AI prompts across multiple platforms (Claude, ChatGPT, Gemini, Grok) with minimal user intervention. The app runs in the background and enables intelligent prompt management, sharing, and improvement.

### 1.2 Core Principles

- **Automation First**: Minimal user interaction required
- **Clean UI**: Simple, intuitive interface with minimal clicks
- **Background Operation**: Runs seamlessly without interrupting workflow
- **Cross-Platform AI Support**: Works with all major AI platforms
- **Intelligent Organization**: AI-powered categorization and improvement

### 1.3 Tech Stack

- **Frontend**: Electron + Vite + React + ShadCN UI
- **Backend**: Supabase (Auth, Database, Real-time)
- **AI Processing**: OpenRouter API with structured output
- **Global Shortcuts**: Native Electron APIs
- **Web Scraping**: Puppeteer/Playwright for automatic prompt detection

## 2. User Personas

### 2.1 Primary User

- AI power users (researchers, developers, content creators)
- Frequent users of multiple AI platforms
- Values efficiency and automation
- Wants to build a personal prompt library

## 3. Feature Specifications

### 3.1 User Authentication (Priority: P0)

#### 3.1.1 Requirements

- Simple email/password authentication via Supabase Auth
- OAuth integration with Google/GitHub for quick signup
- Session persistence across app restarts
- Automatic token refresh

#### 3.1.2 User Stories

- As a user, I want to sign up quickly with my Google account
- As a user, I want to stay logged in between app sessions
- As a user, I want to securely access my prompts from any instance of the app

#### 3.1.3 Technical Implementation

```typescript
interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
}

// Supabase Auth integration
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google'
})
```

#### 3.1.4 Current Implementation Snapshot

- **Preload Bridge**: `src/preload/index.ts` exposes a typed `window.auth` bridge backed by Supabase, validating payloads with Zod schemas before data crosses to the renderer.
- **Shared Modules**: `src/shared/config/supabase.ts` centralizes environment access, `src/shared/supabase/client.ts` instantiates the client, and `src/shared/schemas/auth.ts` constrains user/session payloads.
- **Renderer Integration**: `src/renderer/src/services/auth/` delegates to the bridge, while `src/renderer/src/store/auth.ts` (Zustand) tracks session, errors, and initialization.
- **UI Surface**: `src/renderer/src/pages/auth/` contains `components/auth-layout/` and `components/provider-button/` folders built with Shadcn primitives for a Linear-style sign-in. `src/renderer/src/App.tsx` routes authenticated users to `pages/dashboard/`.
- **Session Persistence**: Supabase auto-refresh handles token lifecycle; the store rehydrates on boot via `AuthService.getSession()` and the preload `onAuthStateChange` subscription.

### 3.2 Manual Prompt Saving (Priority: P0)

#### 3.2.1 Requirements

- Global shortcut: `Cmd + Shift + P` (macOS) / `Ctrl + Shift + P` (Windows/Linux)
- Capture highlighted text from any application
- Quick save with minimal UI interruption
- Immediate categorization via AI

#### 3.2.2 User Stories

- As a user, I want to quickly save any highlighted text as a prompt
- As a user, I want the save process to be instant and non-intrusive
- As a user, I want my prompts automatically categorized

#### 3.2.3 Technical Implementation

```typescript
// Global shortcut registration
globalShortcut.register('CommandOrControl+Shift+P', () => {
  const selectedText = clipboard.readText('selection')
  if (selectedText) {
    savePromptManually(selectedText)
  }
})

interface SavePromptPayload {
  content: string
  source: 'manual' | 'auto'
  url?: string
  timestamp: Date
  userId: string
}
```

### 3.3 Automatic Prompt Detection (Priority: P0)

#### 3.3.1 Requirements

- Monitor active browser tabs for supported AI platforms
- Detect when user submits prompts to Claude, ChatGPT, Gemini, Grok
- Automatically extract and save prompts without user intervention
- Handle different UI structures across platforms

#### 3.3.2 Supported Platforms

- **Claude**: claude.ai
- **ChatGPT**: chat.openai.com
- **Gemini**: gemini.google.com
- **Grok**: x.ai/grok

#### 3.3.3 User Stories

- As a user, I want my prompts automatically saved when I use AI platforms
- As a user, I want the app to work silently in the background
- As a user, I want to see a subtle notification when a prompt is saved

#### 3.3.4 Technical Implementation

```typescript
interface PlatformConfig {
  domain: string
  promptSelector: string
  submitSelector: string
  conversationSelector?: string
}

const PLATFORM_CONFIGS: PlatformConfig[] = [
  {
    domain: 'claude.ai',
    promptSelector: '[data-testid="chat-input"]',
    submitSelector: '[data-testid="send-button"]'
  },
  {
    domain: 'chat.openai.com',
    promptSelector: '#prompt-textarea',
    submitSelector: '[data-testid="send-button"]'
  }
  // ... other platforms
]
```

### 3.4 Database Integration (Priority: P0)

#### 3.4.1 Database Schema

```sql
-- Users table (handled by Supabase Auth)

-- Prompts table
CREATE TABLE prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  title TEXT, -- Auto-generated by AI
  category TEXT, -- Auto-categorized by AI
  subcategory TEXT,
  tags TEXT[], -- AI-generated tags
  source TEXT NOT NULL, -- 'manual' | 'claude' | 'chatgpt' | 'gemini' | 'grok'
  url TEXT, -- Source URL if auto-captured
  is_public BOOLEAN DEFAULT FALSE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories table (for consistency)
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES categories(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shared prompts (for public sharing)
CREATE TABLE shared_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE,
  shared_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  share_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3.4.2 Row Level Security (RLS)

```sql
-- Users can only access their own prompts
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own prompts" ON prompts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own prompts" ON prompts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### 3.5 AI-Powered Categorization (Priority: P1)

#### 3.5.1 Requirements

- Automatic categorization using OpenRouter API
- Structured output for consistency
- Support for multiple categorization levels (category, subcategory, tags)
- Batch processing for efficiency

#### 3.5.2 Category Structure

```typescript
interface PromptCategory {
  category: string // Primary category (e.g., "Writing", "Code", "Analysis")
  subcategory: string // Specific type (e.g., "Blog Post", "Debug", "Research")
  tags: string[] // Relevant tags (e.g., ["creative", "marketing", "technical"])
  confidence: number // AI confidence score (0-1)
  suggestedTitle?: string // Auto-generated title
}
```

#### 3.5.3 OpenRouter Integration

```typescript
const categorizePrompt = async (content: string): Promise<PromptCategory> => {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'openai/gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: CATEGORIZATION_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: content
        }
      ],
      response_format: { type: 'json_object' }
    })
  })

  return response.json()
}
```

### 3.6 Prompt Sharing System (Priority: P1)

#### 3.6.1 Requirements

- Make prompts public with one click
- Search public prompts by category, tags, or content
- Copy public prompts to personal collection
- Like/rating system for quality control

#### 3.6.2 User Stories

- As a user, I want to share my best prompts with the community
- As a user, I want to discover high-quality prompts from other users
- As a user, I want to easily copy community prompts to my collection

#### 3.6.3 Search Implementation

```typescript
interface SearchFilters {
  query?: string
  category?: string
  tags?: string[]
  sortBy: 'relevance' | 'recent' | 'popular'
  limit: number
  offset: number
}

const searchPublicPrompts = async (filters: SearchFilters) => {
  return supabase
    .from('prompts')
    .select(
      `
      *,
      shared_prompts!inner(share_count)
    `
    )
    .eq('is_public', true)
    .ilike('content', `%${filters.query}%`)
    .order(filters.sortBy === 'popular' ? 'usage_count' : 'created_at', { ascending: false })
}
```

### 3.7 AI-Powered Prompt Improvement (Priority: P2)

#### 3.7.1 Requirements

- Analyze existing prompts and suggest improvements
- Generate variations of successful prompts
- Combine multiple prompts into better versions
- Learning from user feedback and usage patterns

#### 3.7.2 Improvement Types

```typescript
interface PromptImprovement {
  type: 'clarity' | 'specificity' | 'structure' | 'variation'
  originalPrompt: string
  improvedPrompt: string
  explanation: string
  confidence: number
}

const improvePrompt = async (promptId: string): Promise<PromptImprovement[]> => {
  // Analyze prompt history, usage patterns, and generate improvements
  const prompt = await getPrompt(promptId)
  const context = await getPromptContext(prompt.user_id, prompt.category)

  return generateImprovements(prompt.content, context)
}
```

### 3.8 Quick Copy System (Priority: P1)

#### 3.8.1 Requirements

- One-click copy to clipboard
- Format prompts for different AI platforms
- Quick access via system tray or global shortcut
- Recently used prompts for quick access

#### 3.8.2 User Stories

- As a user, I want to quickly copy any of my saved prompts
- As a user, I want prompts formatted appropriately for different AI platforms
- As a user, I want quick access to my most-used prompts

## 4. User Interface Specifications

### 4.1 Design Principles

- **Minimal UI**: Clean, distraction-free interface
- **Quick Actions**: Everything accessible within 2 clicks
- **Contextual**: Show relevant information based on current activity
- **Responsive**: Fast loading and smooth interactions

### 4.2 Main Views

#### 4.2.1 Dashboard

- Recently saved prompts
- Quick stats (total prompts, categories, recent activity)
- Search bar prominently displayed
- Quick action buttons (New Prompt, Browse Public)

#### 4.2.2 Prompt Library

- Filterable list of all prompts
- Grid/list view toggle
- Category sidebar with counts
- Search and filter controls

#### 4.2.3 Public Browse

- Trending prompts
- Category-based browsing
- Search functionality
- Copy/save actions

#### 4.2.4 Settings

- Account management
- Auto-save preferences
- Categorization settings
- Platform configurations

### 4.3 System Tray Integration

```typescript
interface TrayMenu {
  quickAccess: PromptMenuItem[] // Last 5 used prompts
  categories: CategoryMenuItem[]
  actions: {
    openApp: () => void
    newPrompt: () => void
    settings: () => void
    quit: () => void
  }
}
```

## 5. Technical Architecture

### 5.1 Application Structure

```
src/
├── main/                           # Electron main process
│   ├── index.ts                   # Main entry point
│   └── services/                  # Main process services
│       ├── prompt-detector/       # Automatic prompt detection
│       ├── shortcuts/             # Global shortcuts management
│       └── tray/                  # System tray integration
├── renderer/                      # React application
│   ├── index.html                 # HTML entry point
│   └── src/
│       ├── App.tsx                # Main app component
│       ├── main.tsx               # React entry point
│       ├── components/            # UI components
│       │   ├── auth/             # Authentication components
│       │   ├── layout/           # Layout components
│       │   ├── prompts/          # Prompt-related components
│       │   ├── shared/           # Shared/reusable components
│       │   └── ui/               # ShadCN UI components
│       ├── pages/                # Page components
│       │   ├── dashboard/        # Dashboard page
│       │   ├── library/          # Prompt library page
│       │   ├── public-browse/    # Public prompts browsing
│       │   └── settings/         # Settings page
│       ├── hooks/                # Custom React hooks
│       ├── services/             # API and external services
│       │   ├── api/              # API service layers
│       │   ├── auth/             # Authentication services
│       │   └── supabase/         # Supabase client and config
│       ├── store/                # Zustand state stores
│       ├── types/                # TypeScript type definitions
│       ├── utils/                # Utility functions
│       ├── constants/            # App constants
│       ├── lib/                  # Utility libraries
│       └── assets/               # Static assets
├── shared/                       # Cross-process shared code
│   ├── types/                    # Shared TypeScript types
│   ├── constants/                # Shared constants
│   └── utils/                    # Shared utility functions
└── preload/                      # Preload scripts
    ├── index.ts                  # Preload entry point
    └── index.d.ts                # Preload type definitions
```

### 5.2 State Management

- **Zustand**: Primary state management for auth, prompts, and app state
  - `useAuthStore`: Authentication state and actions
  - `usePromptsStore`: Prompts data and operations
  - `useAppStore`: App settings and UI state
- **Supabase Realtime**: Live updates for collaborative features
- **Custom Hooks**: Abstraction layer over Zustand stores
  - `useAuth()`: Authentication hook
  - `usePrompts()`: Prompts management hook
  - `useApp()`: App state hook

### 5.3 Security Considerations

- API keys stored in secure electron store
- Row-level security in Supabase
- Content validation and sanitization
- Rate limiting for AI API calls

## 6. Performance Requirements

### 6.1 Response Times

- Prompt saving: < 500ms
- Search results: < 1s
- AI categorization: < 3s (background)
- App startup: < 2s

### 6.2 Resource Usage

- Memory usage: < 150MB idle
- CPU usage: < 5% during background monitoring
- Network: Efficient batching of API calls

## 7. Success Metrics

### 7.1 Key Performance Indicators

- **Adoption**: Daily active users
- **Engagement**: Prompts saved per user per day
- **Retention**: 7-day and 30-day retention rates
- **Quality**: AI categorization accuracy (>85%)
- **Community**: Public prompt shares and copies

### 7.2 User Experience Metrics

- **Efficiency**: Time saved vs manual prompt management
- **Satisfaction**: User ratings and feedback
- **Reliability**: Uptime and error rates

## 8. Development Phases

### 8.1 Phase 1 - Core Features (MVP)

- [ ] User authentication
- [ ] Manual prompt saving (Cmd+Shift+P)
- [ ] Basic prompt library
- [ ] Supabase integration
- [ ] Simple categorization

### 8.2 Phase 2 - Automation

- [ ] Automatic prompt detection
- [ ] AI-powered categorization
- [ ] System tray integration
- [ ] Enhanced UI/UX

### 8.3 Phase 3 - Community & AI

- [ ] Public prompt sharing
- [ ] Prompt search and discovery
- [ ] AI-powered prompt improvements
- [ ] Advanced analytics

## 9. Risk Assessment

### 9.1 Technical Risks

- **Platform Changes**: AI platforms updating their UI
- **API Reliability**: OpenRouter/Supabase service availability
- **Performance**: Background monitoring impact

### 9.2 Mitigation Strategies

- **Robust Selectors**: Use multiple fallback selectors
- **Error Handling**: Graceful degradation and retry logic
- **Monitoring**: Performance and error tracking
- **User Feedback**: Quick response to platform changes

## 10. Conclusion

This PRD provides a comprehensive specification for building a desktop prompt saver application that prioritizes automation, clean UI, and intelligent features. The app should work seamlessly in the background while providing powerful prompt management capabilities through minimal user interaction.
