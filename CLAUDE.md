# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Root (monorepo)
```bash
pnpm dev              # Run backend + frontend concurrently
pnpm dev:backend      # Backend only (port 4000)
pnpm dev:frontend     # Frontend only (port 3000)
pnpm build            # Build both packages
pnpm lint             # Lint all packages
pnpm test             # Test all packages
pnpm db:up            # Start PostgreSQL via Docker
pnpm db:down          # Stop PostgreSQL
```

### Backend (`backend-node/`)
```bash
pnpm dev              # tsx watch (hot reload)
pnpm build            # tsc compile
pnpm test             # jest
pnpm test:watch       # jest --watch
pnpm test:coverage    # jest --coverage
pnpm lint             # eslint src --ext .ts
pnpm db:generate      # drizzle-kit generate:pg (after schema changes)
pnpm db:migrate       # run migrations
pnpm db:seed          # seed data
pnpm db:studio        # Drizzle Studio browser UI
```

### Frontend (`frontend/`)
```bash
pnpm dev              # next dev
pnpm build            # next build
pnpm lint             # next lint
```

## Architecture

### Monorepo Layout
- `backend-node/` — Express + TypeScript API server
- `frontend/` — Next.js 14 App Router frontend
- `docker-compose.yml` — PostgreSQL 16

### Backend: Clean Architecture

The backend enforces strict layering. Dependencies only flow inward:

```
api/ → application/ → domain/
infrastructure/ → application/
core/  (used by all layers)
```

| Layer | Path | Responsibility |
|---|---|---|
| API | `src/api/` | Express routes, middleware (auth, rate limit, org role) |
| Application | `src/application/` | Use cases, DTOs, repository interfaces |
| Domain | `src/domain/` | Entities, domain events, business rules |
| Infrastructure | `src/infrastructure/` | Drizzle ORM repositories, email, file storage, cache |
| Core | `src/core/` | DI (TSyringe), event bus, error classes, Result pattern, logger |

**Dependency injection** is done via TSyringe. All services and repositories are registered in `src/api/server.ts`.

**Repository pattern**: `application/interfaces/` defines contracts; `infrastructure/persistence/` implements them. Use cases depend only on interfaces.

**Result pattern**: Use cases return `Result<T, E>` types from `core/result/` — never throw across layer boundaries.

### Frontend: Provider-Based Data Flow

The frontend uses Next.js App Router with strict provider ownership rules:

| Provider | Owns |
|---|---|
| `OrgSessionProvider` | `activeOrgId` — the sole authority for current org |
| `MetadataIndexProvider` | All list API calls |
| `HydratedContentProvider` | All detail API calls |
| `InstalledAppsSessionProvider` | App discovery |
| `AuthSessionProvider` | Auth state and auth API calls |

**Pages** declare intent only — they must not fetch data or call APIs directly.

**Route structure** under `app/(dashboard)/orgs/[orgId]/`:
- `airunote/` — rich document editor (TipTap)
- `collections/` — data collections
- `records/` — data records
- `posts/` — social posts
- `members/` — team management
- `settings/` — org settings

**Key libraries**: Zustand (client state), React Query (server state), TipTap (rich text), @dnd-kit (drag-and-drop), Monaco Editor (code), React Hook Form + Zod (forms), UploadThing (file upload).

**Styling**: Tailwind CSS with a custom airunote blue palette and an 8px grid spacing system. Always use `className={classes.*}` patterns already present in a file — do not remove or replace existing class structures.

## Architectural Rules (Non-Negotiable)

These rules come from `.cursorrules` and govern all code changes:

1. **`activeOrgId` ONLY from `OrgSessionProvider`** — never from `params.orgId` or any other source.
2. **Pages must not fetch data** — all data loading lives in providers.
3. **Strict provider ownership** — no provider may handle another's data domain.
4. **Providers reset on org change or logout** — memory-only, no persistence, no background fetching.
5. **Multi-bucket rule** — if a file violates more than one architectural bucket, do not partially fix it; mark as deferred.
6. **Fix only the explicitly requested bucket** — never expand scope opportunistically.

## File Size Limits

| Type | Max Lines |
|---|---|
| Components | 300 |
| Hooks | 500 |
| Services | 400 |
| Pages | 600 |

Extract based on complexity, not just line count.

## TypeScript

Both packages run `strict: true` and `strictNullChecks: true`. All `T | undefined` and `T | null | undefined` unions must be guarded, defaulted, or asserted with a documented invariant. No new TS errors are acceptable.

## Multi-Tenancy

All data is scoped to an organization. The org context always flows from `OrgSessionProvider`. Backend routes enforce org membership via `requireOrgRole` middleware. Role-based access control (RBAC) is applied at the route layer.
