# Repository Guidelines

## Project Structure & Module Organization
- Routes live in `app/`: `app/page.tsx` handles season access, `app/spieltage/page.tsx` renders matchdays, `app/admin/*` contains server-driven dashboards.
- Shared UI primitives stay in `components/ui/*`; higher-level pieces (e.g. `season-access-form.tsx`, `spieltage/spieltage-client.tsx`, `admin-header.tsx`) sit inside `components/`.
- Database access and server helpers live in `lib/` (`db.ts`, `data-access.ts`, `server/auth.ts`, `server/i18n.ts`); client helpers (e.g. `auth.ts`, `i18n.ts`) expose fetch-ready utilities.
- Static assets reside in `public/`; SQL DDL and seeds live in `scripts/`.

## Build, Test, and Development Commands
- `npm install` — install dependencies after cloning or rebasing.
- `npm run dev` — start the dev server on `http://localhost:3000` with hot reload.
- `npm run build` — compile the production bundle; run before releasing or deploying.
- `npm run start` — serve the optimized build for smoke checks.
- `npm run lint` — run ESLint (Next.js core, TypeScript rules); keep the tree clean.

## Coding Style & Naming Conventions
- TypeScript-first: `.tsx` for components, `.ts` for libs, with typed exports.
- Components use PascalCase, hooks and utilities camelCase, shared constants SCREAMING_SNAKE_CASE.
- Keep the existing two-space indent and Tailwind utility-first styling; group classes roughly layout → spacing → color.
- Reuse `components/ui/*` primitives before adding variants; co-locate route-specific helpers.
- Run `npm run lint` or `npx next lint --fix` before pushing.

## Testing Guidelines
- No automated harness yet—capture manual QA steps in your PR.
- If adding tests, colocate `*.test.tsx` beside source or in `__tests__/` and align on React Testing Library + Vitest/Jest with maintainers before adding deps.
- Prioritise coverage on server access flows (`lib/data-access.ts`, `lib/server/auth.ts`) and interactive clients (`components/spieltage/*`).
- Prefer seeded data from `scripts/*.sql`; add stable fixtures under `tests/fixtures/` when mocking is required.

## Commit & Pull Request Guidelines
- Use imperative, scoped commit subjects (`Add admin season filter`) under ~70 characters.
- Reference issues in the footer (`Refs #123`) and avoid mixing unrelated work.
- PRs need context, UI screenshots/GIFs, manual QA notes, and schema/seed callouts.
- Confirm `npm run lint` (plus any new test scripts) before review and tag area owners.

## Data & Configuration Notes
- Postgres DDL and seeds (`scripts/01-create-tables.sql`–`03-add-team-players.sql`) define schema and demo content; apply sequentially and document any revisions.
- `DATABASE_URL` must point to the Postgres instance; all server data access flows through `lib/db.ts`.
- Store secrets in `.env.local`; list new env vars in PRs and update docs as needed.
