# Survey System Agent Instructions

## Workspace & Commands

- **Monorepo:** Managed with `pnpm` workspaces.
- **Root Scripts:**
  - `pnpm dev`: Runs development servers for all apps in parallel.
- **Dependencies:** Always use `pnpm` in the root or appropriate workspace directory.

## Backend (apps/api)

- **Framework:** Express + TypeScript.
- **Database:** PostgreSQL with Prisma ORM.
- **OpenAPI:** Uses `@asteasolutions/zod-to-openapi`.
  - Always update `apps/api/src/lib/openapi.ts` when modifying or adding API endpoints.
  - Endpoints should use `defaultResponses` (defined in `openapi.ts`) for consistent `application/problem+json` error handling.
- **Validation:** Zod schemas are the source of truth for both validation and OpenAPI documentation.
- **Error Handling:**
  - All errors are handled by `ErrorMiddleware`.
  - Always use `AppError` (exported from `apps/api/src/utils/appError.ts`) for operational errors.
  - Ensure all routes are protected with `AuthMiddleware` where applicable.

## Frontend (apps/web)

- **Framework:** Vite + React + Tailwind CSS.
- **Styling:** shadcn/ui components (located in `apps/web/src/components/ui`).
- **Routing:** React Router
- **Global State:** Tanstack Query

## Important Conventions

- **Migrations:** Prisma is used for migrations. Check `apps/api/prisma/migrations` if schema changes are needed.
- **Generated Code:** `apps/api/src/generated/prisma` is generated code; do not edit directly.
