# Copilot Instructions for kp-man

This is a Next.js 15 application for managing a sports team (Kleinpunkten Management) with TypeScript, PostgreSQL, and Next-Auth.

## Technology Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode enabled)
- **Database**: PostgreSQL (via @neondatabase/serverless, Kysely query builder)
- **Authentication**: NextAuth.js v5 (beta)
- **UI**: React 19, Tailwind CSS 4, Radix UI components
- **Styling**: Tailwind CSS with custom components in `components/ui/`
- **Deployment**: Docker support with standalone output

## Key Project Conventions

### File Organization
- App routes: `app/page.tsx` (season access), `app/spieltage/page.tsx` (matchdays), `app/admin/*` (admin dashboards)
- UI components: `components/ui/*` for primitives, root `components/` for feature components
- Database & server utilities: `lib/` directory (db.ts, auth.ts, i18n.ts)
- SQL scripts: `scripts/` directory for DDL and seed data

### TypeScript Guidelines
- Use strict typing; prefer `unknown` over `any` (narrow types before use)
- File extensions: `.tsx` for components, `.ts` for utilities
- Naming: PascalCase for components, camelCase for functions/variables, SCREAMING_SNAKE_CASE for constants

### Code Style
- Two-space indentation
- Tailwind utility-first approach; group classes: layout → spacing → color
- Reuse `components/ui/*` primitives before creating new variants
- Server components by default; mark client components with `"use client"`

### Development Workflow
- Run `npm install` after pulling changes
- Use `npm run dev` for local development (http://localhost:3000)
- Run `npm run lint` before commits (ESLint with Next.js rules)
- Run `npm run build` to verify production builds

### Database Access
- All queries go through Kysely query builder in `lib/db.ts`
- Database schema defined in `scripts/*.sql` files
- Environment variable `DATABASE_URL` must be configured
- Use seeded test data from `scripts/` when possible

### Authentication
- NextAuth.js v5 (beta) configured in `lib/auth.ts` and `lib/auth-config.ts`
- Protected routes use middleware in `middleware.ts`
- Auth guards in `components/auth-guard.tsx`

### Internationalization
- i18n utilities in `lib/i18n.ts`
- Language switcher components: `components/language-switcher.tsx`, `components/admin-language-switcher.tsx`

## Making Changes

### When Adding Features
1. Check existing patterns in similar components/routes
2. Reuse UI primitives from `components/ui/*`
3. Follow TypeScript strict typing requirements
4. Update relevant SQL scripts if schema changes are needed
5. Test with Docker setup if database changes are involved

### When Fixing Bugs
1. Reproduce the issue locally with `npm run dev`
2. Check related components and server actions
3. Verify database queries in `lib/db.ts` if data-related
4. Run `npm run lint` to catch style issues

### When Refactoring
1. Keep changes minimal and focused
2. Maintain existing patterns and conventions
3. Don't remove working code unless necessary
4. Test thoroughly with `npm run build` and manual verification

## Testing Approach
- No automated test suite currently in place
- Manual QA steps should be documented in PRs
- Priority testing areas: server actions, auth flows, data access layer
- Use Docker setup (`./test-docker.sh`) for integration testing

## Important Notes
- This is a Docker-ready application with standalone output
- Database uses Neon Serverless PostgreSQL
- Admin routes require authentication
- Follow the repository guidelines in `AGENTS.md` for detailed conventions

For detailed repository guidelines, commit standards, and PR requirements, see the root-level `AGENTS.md` file.
