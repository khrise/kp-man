# AGENTS.md

This file provides guidance to any Coding Agent when working with code in this repository.

## Commands

### Development

- `npm run dev` - Start Next.js development server
- `npm run build` - Build the application for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

### Testing

- `npm run test` - Run unit tests with Jest
- `npm run test:watch` - Run unit tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:integration` - Run integration tests with testcontainers
- `npm run test:integration:watch` - Run integration tests in watch mode

### Database

- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Create and run migrations
- `npm run db:seed` - Seed database with initial data
- `npm run db:reset` - Reset database and run migrations
- `npm run db:studio` - Open Prisma Studio

### Notes

- The project has TypeScript and ESLint error ignoring enabled in next.config.mjs for faster builds during development
- **IMPLEMENTED**: PostgreSQL database with Prisma ORM is fully configured and operational

## Project Purpose

Sports clubv

## Architecture

### Tech Stack (Current Implementation)

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **UI**: shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS v4
- **State**: React state (no external state management)
- **Icons**: Lucide React and Material Icons
- **Database**: PostgreSQL with Kysely
- **Authentication**: NextAuth.js v5 (Auth.js)

### Tech stack (Planned/Future)

- **Forms**: React Hook Form with Zod validation
- **Theme**: next-themes for dark/light mode support
- **Testing**: Jest with @testing-library for unit tests, Testcontainers for integration tests

### Architecture Status

- **API-first Design**: ✅ Implemented via Next.js API routes
- **Database**: ✅ PostgreSQL with Kysely fully configured
- **Performance**: < 300ms response time for standard queries
- **Authentication**: ✅ NextAuth.js

### Project Structure

- Routes live in `app/`: `app/page.tsx` handles season access, `app/spieltage/page.tsx` renders matchdays, `app/admin/*` contains server-driven dashboards.
- Shared UI primitives stay in `components/ui/*`; higher-level pieces (e.g. `season-access-form.tsx`, `spieltage/spieltage-client.tsx`, `admin-header.tsx`) sit inside `components/`.
- Database access and server helpers live in `lib/` (`db.ts`, `data-access.ts`, `server/auth.ts`, `server/i18n.ts`); client helpers (e.g. `auth.ts`, `i18n.ts`) expose fetch-ready utilities.
- Static assets reside in `public/`; SQL DDL and seeds live in `scripts/`.

## Core Features (per PRD)

### Admin area

- User authentication and authorization
- m

### Public ties view

## Data Model (Implemented)

### Core Entities (PostgreSQL + Prisma)

- **User**: ✅ NextAuth.js user model with id, name, email, accounts, sessions, per-user `icsToken`

- **Player**: ✅

- **Season**: ✅

- **Team**: ✅

- **Tie**: ✅

## UI Patterns

### Design System

- shadcn/ui "new-york" style variant
- Path aliases: `@/` maps to project root
- Consistent card-based layouts for management screens
- Sidebar navigation pattern for different sections

### Form Patterns

- React Hook Form + Zod validation standard
- Form components for each entity type (vehicle-form, driver-form, etc.)
- Modal dialogs for creation/editing

### Styling

- Tailwind CSS v4 with CSS variables for theming
- Geist font family (sans and mono)
- Component variants using class-variance-authority

## API Client Architecture

### Centralized API Clients

All API communication is handled through centralized clients to ensure consistency and maintainability:

#### Structure

```
lib/
  api/
    base.ts              # Shared utilities (ApiError, apiRequest)
  types.ts            # Shared TypeScript interfaces
```

#### Usage Pattern

```typescript
// ✅ Correct - Use centralized API client
import { resourcesApi } from "@/lib/api"
import type { Resource } from "@/lib/types/api"

const items = await resourcesApi.list()

// ❌ Incorrect - Don't inline fetch calls
const response = await fetch("/api/resources")
const items = await response.json()
```

#### Error Handling Pattern

```typescript
// ✅ Correct - Use optional chaining
try {
  const data = await resourcesApi.create(payload)
} catch (error) {
  setError(error?.message ?? 'Operation failed')
}

// ❌ Incorrect - Verbose instanceof checks
catch (error) {
  if (error instanceof ApiError) {
    setError(error.message)
  } else {
    setError('Operation failed')
  }
}
```

### Benefits

- **DRY Principle**: No duplicate fetch logic across components
- **Type Safety**: Consistent TypeScript interfaces for all API responses
- **Error Handling**: Centralized error handling with proper HTTP status codes
- **Maintainability**: Single place to update API endpoint URLs or request logic
- **Testing**: Easier to mock API calls in tests

### Migration Status

- ✅ All existing components migrated to use centralized API clients
- ✅ Shared types eliminate interface duplication
- ✅ Consistent error handling across the application

## Development Guidelines

### When implementing new features:

2. ✅ Follow API-first design - all functionality via `app/api/` routes
3. ✅ Use existing form patterns with react-hook-form + zod validation
4. ✅ Leverage Kysely for all database operations
5. ✅ Include authentication checks using NextAuth.js session management
6. ✅ Write integration tests using testcontainers for database testing
7. ✅ Use centralized API clients from `@/lib/api/` - never inline fetch calls
8. ✅ Use shared TypeScript types from `@/lib/types.ts`
9. ✅ Use optional chaining for error handling (`error?.message ?? fallback`)
10. German language context for business terms (Spieltag, etc.)

### Implementation Status

- ✅ PostgreSQL database with Kysely fully operational
- ✅ Authentication system implemented with NextAuth.js
- ✅ Integration testing framework with testcontainers established

## Story-Based Development

This project follows a story-by-story development approach where each user story is implemented incrementally. Stories are managed through individual markdown files in a dedicated folder.

### Story File Management

**Story Location**: All stories must be stored in the `stories/` folder
**Naming Convention**: `[StoryName]_[STATUS].md`

- Status options: `OPEN`, `IN_PROGRESS`, `CLOSED`
- Example: `VehicleRegistration_OPEN.md`, `DriverManagement_IN_PROGRESS.md`, `TaskCreation_CLOSED.md`

**LLM Agent Behavior**:

- Only process stories that are NOT `CLOSED` (i.e., `OPEN` or `IN_PROGRESS`)
- Ignore all `*_CLOSED.md` files when scanning for work
- When completing a story, rename from `_OPEN.md` or `_IN_PROGRESS.md` to `_CLOSED.md`

### Story Definition Rules

Each story markdown file should follow this template:

```markdown
# [Story Title]

## User Story

As a **Contributor**
I want **[specific functionality]**
So that **[business value/benefit]**

## Acceptance Criteria

- [ ] Criterion 1 (testable condition)
- [ ] Criterion 2 (testable condition)
- [ ] Criterion 3 (testable condition)

## Technical Requirements

- Implementation approach
- API endpoints needed
- Database changes required
- Dependencies on other stories

## Implementation Notes

[Any additional technical details or constraints]

## Testing Notes

[How to verify the story is complete]
```

### Story Quality Guidelines

**Good Stories Should Be**:

- **Specific**: Clear, unambiguous requirements
- **Testable**: Acceptance criteria can be verified
- **Independent**: Minimal dependencies on other stories
- **Valuable**: Delivers clear business benefit
- **Focused**: Implementable in 1-3 development sessions

**Technical Standards**:

- Follow existing codebase patterns
- Maintain API-first approach with Next.js API routes
- Use TypeScript with proper types
- Implement react-hook-form + zod validation for all forms
- Use Prisma client for all database operations
- Include authentication checks in protected routes
- Write integration tests for new API endpoints

### Development Workflow

1. **Story Discovery**: Claude scans `stories/` folder for non-CLOSED stories
2. **Story Selection**: Work on `IN_PROGRESS` stories first, then `OPEN` stories
3. **Status Updates**:
   - Change `OPEN` → `IN_PROGRESS` when starting work (rename file)
   - Change `IN_PROGRESS` → `CLOSED` when complete (rename file)
4. **Implementation**: Follow story acceptance criteria and technical requirements
5. **Testing (MANDATORY)**:
   - ALWAYS add or update integration tests for any new or modified API route/behavior.
   - ALWAYS run unit and integration tests locally (`npm test`, `npm run test:integration`) and ensure they pass before closing a story.
6. **Validation (MANDATORY)**:
   - BEFORE closing a story, explicitly verify each Acceptance Criterion in the story file is satisfied.
   - Do not close the story unless all criteria are met and tests are green.
   - Prefer checking off the criteria (convert `- [ ]` to `- [x]`) when appropriate.

### Agent Test & Validation Mandate

- The agent MUST NOT mark a story as `CLOSED` until:
  - All relevant unit and integration tests are written/updated AND passing locally.
  - Acceptance Criteria have been reviewed, and each one is demonstrably satisfied by code and/or tests.
  - Any deprecated layers (e.g., `lib/data`) referenced by the story are removed or unused, as applicable to the change.
- The agent SHOULD include a brief validation summary in the final handoff describing:
  - Which tests cover which acceptance criteria.
  - Any tradeoffs or follow-ups if part of the criteria are deferred (and then leave the story `IN_PROGRESS`).

### Current Development Status

**Story Folder**: `stories/` (to be created)
**File Naming**: `[RunningNumber]_[StoryName]_[STATUS].md`

## Glossary

To ensure consistent understanding across contributors, here are the key domain terms used in this project:

### Seaseon

An entity that represents a sports season. Seasons have properties such as name, start date, end date, and associated teams.

### Team

A team represents a sports team within a season. Teams have properties such as name, logo, and associated players.

### Player

An individual athlete who is a member of a Team. Players have attributes like name, position, and statistics.

### Tie

A scheduled match between two Teams within a Season. Ties have properties such as date, location, opponent and participating players.
