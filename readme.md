# SST-Replicache Template

A modern, local-first web application template built with SST for AWS infrastructure, Replicache for offline-first data synchronization, and a powerful frontend stack.

## 🚀 Features

- **Local-First Architecture**: Built with Replicache for seamless offline support and data synchronization
- **Authentication**: Google OAuth integration for secure user authentication
- **Workspace Support**: Multi-workspace structure for organizing content
- **Onboarding Flow**: Guided user onboarding experience
- **Modern UI Components**: Built with Shadcn UI and Tailwind CSS
- **Type Safety**: End-to-end TypeScript for better developer experience
- **Infrastructure as Code**: AWS resources managed through SST

## 🛠️ Tech Stack

### Frontend

- **Framework**: Vite + React 19
- **Styling**: Tailwind CSS with Shadcn UI components
- **State Management**: Replicache for local-first data
- **Routing**: React Router
- **Form Handling**: React Hook Form with Zod validation
- **Internationalization**: i18next

### Backend

- **Infrastructure**: SST (Serverless Stack) for AWS deployments
- **API**: Hono for lightweight, fast API endpoints
- **Database**: Supabase PostgreSQL with Drizzle ORM
- **Authentication**: OAuth via Google

### Development

- **Runtime**: Bun for fast JavaScript execution
- **Language**: TypeScript for type safety
- **Architecture**: Domain-Driven Design principles

## 🏗️ Project Structure

```
├── .sst/                # SST configuration
├── infra/               # Infrastructure code
├── packages/
│   ├── app/             # Frontend application
│   ├── core/            # Shared business logic
│   ├── functions/       # Backend serverless functions
│   └── scripts/         # Utility scripts
└── sst.config.ts        # SST main configuration
```

## 🚦 Getting Started

### TODO: Will be creating a website with full tutorial on how to use the template ;)
