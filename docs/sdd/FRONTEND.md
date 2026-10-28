← Back to [MAIN](MAIN.md)

# Frontend

- **Module:** Frontend
- **Module code:** FE
- **Version:** v3.0
- **Status:** Approved
- **Last updated:** 2026-10-28

## Description

The web app (`apps/web`): stack and UI conventions, the generated API client, routes, and every page (login, dashboard layout, top bar and section navigation, survey list with the active-survey small multiples, survey creation and details with its statistics, invitations, invitation acceptance, public answering page). Brand identity and the visual system («Anuario estadístico»: color tokens, light/dark themes, typography, shape, tables, small multiples, bars, motion, logo) are specified in [BRAND.md](BRAND.md); this module specifies where and how each page uses them.

Requirement numbers keep the legacy IDs: legacy `FE-13` is `REQ-FE-013`.

Related: [BRAND.md](BRAND.md), [ARCHITECTURE.md](ARCHITECTURE.md), [API.md](API.md), [AUTH.md](AUTH.md), [SURVEYS.md](SURVEYS.md), [ANSWERS.md](ANSWERS.md), [STATS.md](STATS.md).

### Routes (`apps/web/src/App.tsx`)

| Path | Element | Access |
|------|---------|--------|
| `/` | redirect → `/auth/login` | public |
| `/auth/login` | `AuthPage` › `LoginPage` (holds `LoginForm`) | public |
| `/auth/invite/:token` | `AuthPage` › `AcceptInvitationPage` | public |
| `/dashboard` | `DashboardPage` › `Surveys` | session |
| `/dashboard/surveys/create` | `DashboardPage` › `SurveyCreatePage` | session |
| `/dashboard/surveys/:slug` | `DashboardPage` › `SurveyDetailsPage` | session |
| `/dashboard/invitations` | `DashboardPage` › `InvitationsPage` | session |
| `/surveys/:slug` | `SurveyAnsweringPage` | public |

### Pages and components

| Area | Code | Requirements |
|------|------|--------------|
| Login | `pages/AuthPage.tsx`, `pages/LoginPage.tsx`, `components/login-form.tsx`, `components/PasswordInput.tsx` | REQ-FE-015, REQ-FE-030 |
| Dashboard layout and session guard | `pages/DashboardPage.tsx` | REQ-FE-013 |
| Top bar and section navigation | `components/TopBar.tsx`, `components/ThemeSelector.tsx`, `components/Logo.tsx` | REQ-FE-016, REQ-FE-029, REQ-FE-031 |
| Survey list (`/dashboard`) | `components/Surveys.tsx`, `components/ActiveSurveys.tsx`, `components/ListPagination.tsx` | REQ-FE-017, REQ-FE-018, REQ-FE-032 |
| Create survey | `pages/SurveyCreatePage.tsx` | REQ-FE-019, REQ-FE-020 |
| Survey details | `pages/SurveyDetailsPage.tsx`, `components/SurveyStatistics.tsx`, `components/LockedBadge.tsx` | REQ-FE-021, REQ-FE-022, REQ-FE-026, REQ-FE-033 |
| Invitations (`/dashboard/invitations`) | `pages/InvitationsPage.tsx` | REQ-FE-027 |
| Accept invitation (`/auth/invite/:token`, public) | `pages/AuthPage.tsx`, `pages/AcceptInvitationPage.tsx` | REQ-FE-028, REQ-FE-030 |
| Answering (`/surveys/:slug`, public) | `pages/SurveyAnsweringPage.tsx` | REQ-FE-023, REQ-FE-024, REQ-FE-034 |
| Destructive confirmations | `components/ConfirmationDialog.tsx` | REQ-FE-025 |
| Shared visual components | `components/SmallMultiples.tsx`, `components/Bar.tsx` | REQ-BRAND-027, REQ-BRAND-028 |

## Requirements

### REQ-FE-001 — Web stack

Legacy ID: FE-01.

Vite 8 + React 19 with the React Compiler (`babel-plugin-react-compiler` via `@rolldown/plugin-babel`), TypeScript, Tailwind CSS 4 (`@tailwindcss/vite`), `tw-animate-css`, and the Work Sans variable font (`@fontsource-variable/work-sans`, REQ-BRAND-012) as the only family. Brand identity and the visual system are in [BRAND.md](BRAND.md).

**Acceptance criteria**

- **AC-FE-001-1**
  - **Given** `apps/web/package.json` and `apps/web/vite.config.ts`
  - **When** they are read
  - **Then** the app uses Vite 8, React 19, TypeScript, Tailwind CSS 4 through `@tailwindcss/vite`, `tw-animate-css`, `@fontsource-variable/work-sans` (and neither `@fontsource-variable/inter` nor `@fontsource-variable/manrope`), and the React Compiler (`babel-plugin-react-compiler`) through `@rolldown/plugin-babel`

### REQ-FE-002 — UI component libraries

Legacy ID: FE-02.

UI components are shadcn/ui primitives (config `components.json`) in `apps/web/src/components/ui`, built on `radix-ui` and restyled against the tokens of [BRAND.md](BRAND.md) (REQ-BRAND-009); icons from `lucide-react`; toasts with `sonner` (`<Toaster position="top-center" theme={theme} />`, following the active theme, REQ-BRAND-011); tables with `@tanstack/react-table` (`ui/data-table.tsx`, REQ-BRAND-029). Data bars are the custom `components/Bar.tsx` (REQ-BRAND-028); there is no chart library. Primitives no longer used are removed: `ui/sidebar.tsx`, `ui/card.tsx` and `ui/chart.tsx`, and the `recharts` dependency.

**Acceptance criteria**

- **AC-FE-002-1**
  - **Given** the web source
  - **When** UI primitives, icons, toasts, tables and charts are looked up
  - **Then** primitives come from `components/ui` (shadcn/ui on `radix-ui`, configured in `components.json`), icons from `lucide-react`, tables from `ui/data-table.tsx` (`@tanstack/react-table`) and data bars from `components/Bar.tsx`
- **AC-FE-002-3**
  - **Given** `apps/web/src/components/ui` and `apps/web/package.json`
  - **When** they are read
  - **Then** `sidebar.tsx`, `card.tsx` and `chart.tsx` do not exist and `recharts` is not a dependency
- **AC-FE-002-2**
  - **Given** the app root (`App.tsx`)
  - **When** it renders
  - **Then** it mounts `<Toaster position="top-center" theme={theme} />` with the active theme

### REQ-FE-003 — Routing and server state

Legacy ID: FE-03.

Routing with React Router 7 (`BrowserRouter`); server state with TanStack Query 5. There is no other global state store.

**Acceptance criteria**

- **AC-FE-003-1**
  - **Given** `apps/web/package.json` and `App.tsx`
  - **When** they are read
  - **Then** routing uses React Router 7 `BrowserRouter`, server state uses TanStack Query 5, and no other global state library is a dependency

### REQ-FE-004 — Forms and form schemas

Legacy ID: FE-04.

Forms with `react-hook-form`. Forms backed by an API body are validated through `zodResolver` with the web's own form schemas in `apps/web/src/lib/schemas/` (`loginFormSchema`, `createInvitationFormSchema`, `acceptInvitationFormSchema`): Spanish messages, the same rules as the API schemas, numeric limits imported from `@survey-system/schemas` (`USERNAME_MIN`, `USERNAME_MAX`, `PASSWORD_MIN`, never repeated), and `satisfies z.ZodType<…>` against the generated request types. The survey form (REQ-FE-019) uses `react-hook-form` rules with `SURVEY_NAME_MIN` and `QUESTION_NAME_MIN`. The API keeps its English messages.

**Acceptance criteria**

- **AC-FE-004-1**
  - **Given** `apps/web/src/lib/schemas`
  - **When** it is read
  - **Then** it exports `loginFormSchema`, `createInvitationFormSchema` and `acceptInvitationFormSchema`, with Spanish messages, each declared `satisfies z.ZodType<…>` against the generated request type, and length limits imported from `@survey-system/schemas` (no repeated numbers)
- **AC-FE-004-2**
  - **Given** the login, invitation and accept-invitation forms
  - **When** they are inspected
  - **Then** each uses `react-hook-form` with `zodResolver` of its form schema
- **AC-FE-004-3**
  - **Given** the survey creation form
  - **When** it is inspected
  - **Then** its name and question name rules use `SURVEY_NAME_MIN` and `QUESTION_NAME_MIN` from `@survey-system/schemas`
- **AC-FE-004-4**
  - **Given** the login form with an invalid email
  - **When** it is submitted
  - **Then** a Spanish validation message is shown next to the field and no request is sent

### REQ-FE-005 — Import alias

Legacy ID: FE-05.

Import alias `@` → `apps/web/src`.

**Acceptance criteria**

- **AC-FE-005-1**
  - **Given** the web TypeScript and Vite configs
  - **When** they are read
  - **Then** `@` resolves to `apps/web/src` in both

### REQ-FE-006 — Spanish UI

Legacy ID: FE-06.

UI copy is in Spanish, the login form included (legacy OQ-13, decided 2026-10-09), and the document language is `<html lang="es">`; dates are formatted with locale `es-CU`.

**Acceptance criteria**

- **AC-FE-006-1**
  - **Given** `apps/web/index.html`
  - **When** it is read
  - **Then** the root element is `<html lang="es">`
- **AC-FE-006-2**
  - **Given** any page of the web app, the login form included
  - **When** it is rendered
  - **Then** every visible UI text is in Spanish
- **AC-FE-006-3**
  - **Given** a date shown in the UI (survey list, answers)
  - **When** it is rendered
  - **Then** it is formatted with locale `es-CU`

### REQ-FE-007 — StrictMode disabled

Legacy ID: FE-07.

`React.StrictMode` is disabled in `main.tsx`.

**Acceptance criteria**

- **AC-FE-007-1**
  - **Given** `apps/web/src/main.tsx`
  - **When** it is read
  - **Then** `<App />` is rendered without a `StrictMode` wrapper

### REQ-FE-008 — Generated API client

Legacy ID: FE-08.

The API client in `apps/web/src/lib/api/{users,invitations,stats,surveys,answers}/*.ts` and `sondixAPI.schemas.ts` is **generated by Orval** from the API's OpenAPI document (`pnpm generate:api` at the root). It must not be edited manually; regenerate after any API contract change (REQ-API-032). Hook names derive from OpenAPI `operationId` (e.g. `useGetAllSurveys`, `useCreateSurveyAnswer`).

**Acceptance criteria**

- **AC-FE-008-1**
  - **Given** the running API and a clean checkout
  - **When** `pnpm generate:api` runs at the root
  - **Then** `apps/web/src/lib/api/{users,invitations,stats,surveys,answers}` and `sondixAPI.schemas.ts` have no differences from the committed version
- **AC-FE-008-2**
  - **Given** an endpoint with `operationId` `getAllSurveys`
  - **When** the client is generated
  - **Then** its hook is named `useGetAllSurveys`

### REQ-FE-009 — `customInstance`, the only HTTP entry point

Legacy ID: FE-09.

`apps/web/src/lib/api/mutator/customInstance.ts` is hand-written and is the only HTTP entry point:

- sends `credentials: "include"` (cookies);
- serializes `params` into the query string;
- on a non-OK response parses the problem JSON and throws it (so `error.detail` is shown in toasts); if the body is not JSON or has no `detail`, the thrown problem gets the detail "El servidor respondió con un error inesperado.";
- if the request cannot reach the server (`fetch` rejects), throws a problem with status `0`, title "Network error" and detail "No se pudo conectar con el servidor. Inténtalo de nuevo." — every thrown error has a `detail`, so toasts are never empty;
- on `401` (except for the refresh call itself) performs **one shared** `POST /api/v1/users/refresh` (concurrent 401s wait on the same promise) and, if it succeeds, retries the original request once;
- returns `null` for `204`.

**Acceptance criteria**

- **AC-FE-009-1**
  - **Given** any request through `customInstance`
  - **When** `fetch` is called
  - **Then** it carries `credentials: "include"` and `params` serialized into the query string
- **AC-FE-009-2**
  - **Given** a non-OK response with a problem JSON body
  - **When** it is received
  - **Then** the problem is thrown with its `detail`
- **AC-FE-009-3**
  - **Given** a non-OK response whose body is not JSON or has no `detail`
  - **When** it is received
  - **Then** the thrown problem has the detail "El servidor respondió con un error inesperado."
- **AC-FE-009-4**
  - **Given** `fetch` rejects (server unreachable)
  - **When** the request is made
  - **Then** a problem with status `0`, title "Network error" and detail "No se pudo conectar con el servidor. Inténtalo de nuevo." is thrown
- **AC-FE-009-5**
  - **Given** two concurrent requests that both receive `401`
  - **When** they are handled
  - **Then** exactly one `POST /api/v1/users/refresh` is sent and, if it succeeds, each original request is retried once
- **AC-FE-009-6**
  - **Given** the refresh call itself receives `401`
  - **When** it is handled
  - **Then** no further refresh is attempted and the error is thrown
- **AC-FE-009-7**
  - **Given** a `204` response
  - **When** it is received
  - **Then** `customInstance` returns `null`

### REQ-FE-010 — Query retries

Legacy ID: FE-10.

`QueryClient` retries failed queries up to 3 times, except `401`/`403` which are not retried.

**Acceptance criteria**

- **AC-FE-010-1**
  - **Given** a query failing with status `500`
  - **When** it is run
  - **Then** it is retried up to 3 times
- **AC-FE-010-2**
  - **Given** a query failing with status `401` or `403`
  - **When** it is run
  - **Then** it is not retried

### REQ-FE-011 — Response types are the body

Legacy ID: FE-11.

Orval is configured so each generated response type is the response **body** (`fetch.includeHttpResponseReturnType: false`), matching what `customInstance` returns. Pages read `data?.data` with real types and never cast responses (`as any`, `as unknown as`).

**Acceptance criteria**

- **AC-FE-011-1**
  - **Given** `orval.config.ts`
  - **When** it is read
  - **Then** `fetch.includeHttpResponseReturnType` is `false`
- **AC-FE-011-2**
  - **Given** the pages and components of `apps/web/src`
  - **When** they read API responses
  - **Then** they use `data?.data` with generated types and contain no `as any` or `as unknown as` casts of responses

### REQ-FE-012 — API base URL and query keys

Legacy ID: FE-12.

The API base URL comes from `VITE_API_URL` (REQ-CFG-007, REQ-CFG-009). Query keys always come from the generated helpers (e.g. `getGetSurveyBySlugQueryKey`), never hardcoded.

**Acceptance criteria**

- **AC-FE-012-1**
  - **Given** the web source
  - **When** it is searched for the API host
  - **Then** no host is hardcoded; requests are prefixed with `VITE_API_URL`
- **AC-FE-012-2**
  - **Given** every `invalidateQueries`, `setQueryData` or query-key use
  - **When** it is inspected
  - **Then** the key comes from a generated `get…QueryKey` helper

### REQ-FE-013 — Dashboard session guard and layout

Legacy ID: FE-13.

`DashboardPage` is the session guard: it calls `useGetCurrentUser`; while loading shows the single line "Cargando panel..." (REQ-BRAND-033), on error navigates to `/auth/login`. Layout: `TooltipProvider` > the top bar (`TopBar`, REQ-FE-016) above a `<main>` holding the centered `<Outlet />`, at most 80 rem wide with the gutters of REQ-BRAND-015. There is no sidebar and no `sidebar_state` cookie (REQ-BRAND-022).

The code today shows the English text "Loading dashboard..." (`apps/web/src/pages/DashboardPage.tsx`); it is corrected in PH-BRAND-3.

**Acceptance criteria**

- **AC-FE-013-1**
  - **Given** `GET /users/me` is pending
  - **When** a `/dashboard` route is opened
  - **Then** the page shows "Cargando panel..."
- **AC-FE-013-2**
  - **Given** `GET /users/me` fails
  - **When** a `/dashboard` route is opened
  - **Then** the app navigates to `/auth/login`
- **AC-FE-013-3**
  - **Given** a valid session
  - **When** a `/dashboard` route is opened
  - **Then** the page renders `TopBar` and, in a `<main>` element, the child route centered, at most 80 rem (1280 px) wide

### REQ-FE-014 — No signup page

Legacy ID: FE-14.

Accounts are created only from an invitation link (REQ-FE-028); there is no signup page.

**Acceptance criteria**

- **AC-FE-014-1**
  - **Given** the route table of `App.tsx`
  - **When** it is read
  - **Then** there is no signup route and no page links to one

### REQ-FE-015 — Login form

Legacy ID: FE-15.

Email + password validated with the web's `loginFormSchema` (REQ-FE-004). Copy: title "Inicia sesión", description "Accede al sistema de gestión de encuestas", fields "Correo electrónico" (placeholder `correo@ejemplo.com`) and "Contraseña" (placeholder "Introduce tu contraseña"), button "Iniciar sesión". The password field (`components/PasswordInput.tsx`) has an eye button that toggles its visibility ("Mostrar contraseña" / "Ocultar contraseña", `aria-pressed`). On success stores the returned user in the `getCurrentUser` query cache and navigates to `/dashboard`; on error shows `error.detail` in a toast.

**Acceptance criteria**

- **AC-FE-015-1**
  - **Given** the login page
  - **When** it is rendered
  - **Then** it shows the title "Inicia sesión", the description "Accede al sistema de gestión de encuestas", the fields "Correo electrónico" (placeholder `correo@ejemplo.com`) and "Contraseña" (placeholder "Introduce tu contraseña") and the button "Iniciar sesión"
- **AC-FE-015-2**
  - **Given** the password field
  - **When** its eye button is pressed
  - **Then** the password becomes visible, the button's label switches from "Mostrar contraseña" to "Ocultar contraseña" and `aria-pressed` becomes `true`; pressing again reverts it
- **AC-FE-015-3**
  - **Given** valid credentials
  - **When** the form is submitted
  - **Then** the returned user is stored in the `getCurrentUser` query cache and the app navigates to `/dashboard`
- **AC-FE-015-4**
  - **Given** the API answers with an error
  - **When** the form is submitted
  - **Then** the error's `detail` is shown in a toast

### REQ-FE-016 — Top bar

Legacy ID: FE-16.

Top bar of the dashboard (`components/TopBar.tsx`), full width, 58 px tall, on `--paper` with a 2 px `--rule-strong` rule under it, content aligned with the page gutters (REQ-BRAND-015). From `md`, left to right: the logo (REQ-BRAND-021) as the link to `/dashboard` (accessible name "Sondix, ir a encuestas"); the section navigation (REQ-FE-031); then, pushed to the right, the theme selector (REQ-BRAND-011), the username in `--ink-muted` and the "Salir" button (`ghost`). Below `md`: the logo on the left and, on the right, a menu button (icon-only, accessible name "Abrir menú", `aria-expanded`) that opens a sheet from the right holding the section navigation, the theme options "Claro" / "Oscuro" / "Sistema" as a radio group labelled "Tema", the username and "Salir"; the sheet closes on navigation, on Escape and with its close button ("Cerrar menú"). "Salir" asks for confirmation (`ConfirmationDialog`, REQ-FE-025); on success it clears the whole query cache and navigates to `/auth/login`. When the current user is not available once loading has finished, the top bar shows "Redirigiendo..." in place of the username and "Salir".

The code today shows the English text "Redirecting..."; it is corrected in PH-BRAND-3.

**Acceptance criteria**

- **AC-FE-016-1**
  - **Given** a session and a viewport at `md` or wider
  - **When** the top bar renders
  - **Then** it shows, in order, the logo linking to `/dashboard` (accessible name "Sondix, ir a encuestas"), the sections "Encuestas" and "Invitaciones", the theme button "Tema", the username and "Salir", above a 2 px `--rule-strong` rule
- **AC-FE-016-2**
  - **Given** a viewport below `md`
  - **When** the menu button "Abrir menú" is pressed and then a section is chosen
  - **Then** a sheet opens with the sections, the "Tema" radio group, the username and "Salir", `aria-expanded` is `true` while it is open, and the sheet closes on navigation
- **AC-FE-016-3**
  - **Given** the user presses "Salir"
  - **When** the confirmation dialog is confirmed and the API answers `204`
  - **Then** the whole query cache is cleared and the app navigates to `/auth/login`
- **AC-FE-016-4**
  - **Given** the current-user query has finished loading without a user
  - **When** the top bar renders
  - **Then** it shows "Redirigiendo..." instead of the username and "Salir"

### REQ-FE-017 — Survey list: title, summary line and table

Legacy ID: FE-17.

`components/Surveys.tsx` (`/dashboard`), top to bottom:

1. **Header row:** the title "Encuestas" (`text-h1`) with, under it, the summary line "{all} encuestas · {active} activas · {all − active} inactivas" (`text-small`, `--ink-muted`, tabular figures) from `GET /stats/surveys` (REQ-STAT-008, unaffected by the list filters); singulars when a count is 1 ("1 encuesta", "1 activa", "1 inactiva"). The primary button "Crear encuesta" (link to `/dashboard/surveys/create`) sits on the right of the title, baseline-aligned; below `md` it goes under the summary line, full width.
2. **Active surveys** small multiples (REQ-FE-032).
3. **The survey list** (REQ-FE-018): toolbar, table and pagination.

The table (REQ-BRAND-029) has the columns "Nombre" (the survey name as a link to its details), "Estado" (the status label "Activa" / "Inactiva" and, for a locked survey, the "Bloqueada" label, REQ-FE-026, REQ-BRAND-030), "Respuestas" (`answerCount`) and "Completas" (`completedCount`) (REQ-SURV-021, right-aligned), "Fecha de creación" (`es-CU`, right-aligned), and a last column with the actions menu (icon-only button "Acciones de {name}": "Ver detalles", "Activar" / "Desactivar"). Below `md` the rows stack (REQ-BRAND-029). Creating, activating/deactivating or deleting a survey invalidates the list, the summary and the active-survey statistics (REQ-FE-032); deleting an answer (REQ-FE-022) invalidates the list and the active-survey statistics, whose counts include it.

**Acceptance criteria**

- **AC-FE-017-1**
  - **Given** `GET /stats/surveys` returns `{ all: 12, active: 4 }`
  - **When** `/dashboard` renders
  - **Then** the summary line reads "12 encuestas · 4 activas · 8 inactivas", whatever filters the list has
- **AC-FE-017-2**
  - **Given** `{ all: 1, active: 1 }`
  - **When** `/dashboard` renders
  - **Then** the summary line reads "1 encuesta · 1 activa · 0 inactivas"
- **AC-FE-017-3**
  - **Given** the survey list
  - **When** it renders at `md` or wider
  - **Then** it shows the "Crear encuesta" primary button and a table with the columns Nombre, Estado, Respuestas, Completas, Fecha de creación and the actions menu (Ver detalles, Activar/Desactivar), with Respuestas, Completas and Fecha de creación right-aligned in tabular figures
- **AC-FE-017-4**
  - **Given** a list item with `answerCount: 83` and `completedCount: 71`
  - **When** its row renders
  - **Then** "Respuestas" shows 83 and "Completas" shows 71
- **AC-FE-017-5**
  - **Given** a survey is created, activated, deactivated or deleted
  - **When** the mutation succeeds
  - **Then** the survey list, the summary and the active-survey statistics queries are invalidated

### REQ-FE-018 — Paginated, searchable, filterable list

Legacy ID: FE-18.

The table is server-paginated, 10 per page, newest first by default (REQ-SURV-020). Above it, a toolbar: a search box ("Buscar por nombre", queried 300 ms after typing pauses) taking the free width, and status chips Todas / Activas / Inactivas (`aria-pressed`, REQ-BRAND-030); below `md` the search box takes a full line and the chips go under it. The "Nombre" and "Fecha de creación" headers sort ascending/descending (`aria-sort`, REQ-BRAND-029). Below it, `components/ListPagination.tsx`: "Mostrando 11–20 de 43", "Página 2 de 5", Anterior / Siguiente, using `meta.total` (REQ-SURV-007). Search, status, sort and page live in the URL (`?search=&active=&sort=&page=`, defaults omitted) so reload, links and returning from a survey keep them; changing search, status or sort goes back to page 1. The "Ver todas las activas" link of REQ-FE-032 sets the status to Activas the same way. While a new page loads the previous one stays visible (dimmed to 50% opacity, without animation). Empty states: "Ninguna encuesta coincide con la búsqueda o el filtro." with filters, otherwise an invitation to create the first survey. The API's `date` filter is not exposed.

**Acceptance criteria**

- **AC-FE-018-1**
  - **Given** `/dashboard` with no query string
  - **When** the list loads
  - **Then** it requests page 1 of 10 surveys, newest first (`page` absent or 1; `limit` absent or 10; `sort` absent or `-creation`)
- **AC-FE-018-2**
  - **Given** the user types in "Buscar por nombre"
  - **When** typing pauses for 300 ms
  - **Then** the list is requested with that `search`, the URL gets `?search=…` and the page goes back to 1
- **AC-FE-018-3**
  - **Given** the status chips Todas / Activas / Inactivas
  - **When** "Activas" is pressed
  - **Then** it has `aria-pressed="true"`, the list is requested with `active=true`, the URL gets `active=true` and the page goes back to 1
- **AC-FE-018-4**
  - **Given** the "Nombre" or "Fecha de creación" header
  - **When** it is pressed
  - **Then** the list is sorted ascending/descending by that column, the URL carries `sort` and the page goes back to 1
- **AC-FE-018-5**
  - **Given** `meta.total = 43` on page 2
  - **When** the pagination renders
  - **Then** it shows "Mostrando 11–20 de 43", "Página 2 de 5" and Anterior / Siguiente buttons
- **AC-FE-018-6**
  - **Given** a URL `/dashboard?search=x&active=false&sort=name&page=2`
  - **When** it is loaded
  - **Then** the list is requested with those values and the controls reflect them; default values are omitted from the URL
- **AC-FE-018-7**
  - **Given** a new page is loading
  - **When** it is pending
  - **Then** the previous page stays visible, dimmed
- **AC-FE-018-8**
  - **Given** an empty result with a search or status filter
  - **When** the list renders
  - **Then** it shows "Ninguna encuesta coincide con la búsqueda o el filtro."; with no filters it shows an invitation to create the first survey
- **AC-FE-018-9**
  - **Given** the list controls
  - **When** they are inspected
  - **Then** there is no control for the API's `date` filter

### REQ-FE-019 — Create survey form

Legacy ID: FE-19.

`pages/SurveyCreatePage.tsx`: form with name (required, min 5) and a dynamic list of questions (name required min 5, type select, required checkbox, options for select types). On submit, question ids and option ids are numbered sequentially from 1. On success invalidates the survey list, the summary and the active-survey statistics, toasts and returns to `/dashboard`.

Layout (the existing copy is kept; the title becomes "Nueva encuesta" in sentence case): a back link "Volver a encuestas", the title (`text-h1`), the general fields, then the questions as a numbered list of ruled sections (1 px `--rule` between them, the question number in tabular figures before its name field, no cards); each question holds its name, type select, required checkbox and, for select types, its options with "Añadir opción" and an icon-only "Eliminar opción" button per option, plus an icon-only "Eliminar pregunta" button. Below the list, "Añadir pregunta" (`outline`); at the end, "Crear encuesta" (primary, loading state "Creando..."). Fields follow REQ-BRAND-019, so the empty-option error of AC-BRAND-019-4 is shown under its input.

**Acceptance criteria**

- **AC-FE-019-1**
  - **Given** a survey name or question name shorter than 5 characters
  - **When** the form is submitted
  - **Then** a validation error is shown and no request is sent
- **AC-FE-019-2**
  - **Given** a select-type question
  - **When** it is edited
  - **Then** options can be added; a `TEXT_ANSWER` question has no options
- **AC-FE-019-3**
  - **Given** a valid form with questions and options
  - **When** it is submitted
  - **Then** question ids and, within each question, option ids are numbered 1, 2, 3… in order
- **AC-FE-019-4**
  - **Given** the API answers `201`
  - **When** the form is submitted
  - **Then** the survey list is invalidated, a toast is shown and the app returns to `/dashboard`

### REQ-FE-020 — No editing UI

Legacy ID: FE-20.

There is no UI to edit a survey's name or questions after creation (the API supports it while unlocked).

**Acceptance criteria**

- **AC-FE-020-1**
  - **Given** the web app
  - **When** a survey is viewed
  - **Then** no control edits its name or questions

### REQ-FE-021 — Survey details header

Legacy ID: FE-21.

`pages/SurveyDetailsPage.tsx`: a back link "Encuestas" (to `/dashboard`, keeping the list's query string when it came from there), then a header with the name (`text-h1`), under it a line with the status label, the "Bloqueada" label when locked and the slug (`--ink-muted`), and on the right the buttons "Activar" / "Desactivar" (`outline`) and "Eliminar" (`destructive`; confirmation dialog; on success navigates to `/dashboard`). Below `md` the buttons go under the header, side by side.

**Acceptance criteria**

- **AC-FE-021-1**
  - **Given** a survey
  - **When** its details page renders
  - **Then** the header shows its name, slug, an activate/deactivate button and a delete button
- **AC-FE-021-2**
  - **Given** the delete button
  - **When** it is pressed and the confirmation dialog is confirmed and the API answers `204`
  - **Then** the app navigates to `/dashboard`

### REQ-FE-022 — Survey details tabs

Legacy ID: FE-22.

Tabs, each loading its data lazily when opened:

- **Detalles**: public link `${window.location.origin}/surveys/${slug}` with copy/open buttons; list of questions with type, required badge and options.
- **Respuestas**: table (short id, date, IP, "Ver respuestas"); a side sheet shows each question with the resolved response text and allows deleting the answer after a confirmation dialog.
- **Estadísticas**: the yearbook treatment of REQ-FE-033.

The tabs are standard underline tabs: the active tab in `--ink` weight 600 with a 2 px `--teal` underline, the others in `--ink-muted`, over a 1 px `--rule` line. The public link is shown as text in tabular figures inside a 1 px `--input-border` field with the icon-only buttons "Copiar enlace" and "Abrir enlace". Questions are a numbered ruled list (number, name, type, "Obligatoria" label, options as an indented list). The answers table follows REQ-BRAND-029 and the side sheet REQ-BRAND-016.

**Acceptance criteria**

- **AC-FE-022-1**
  - **Given** the details page
  - **When** it first renders
  - **Then** answers and statistics are not requested until their tab is opened
- **AC-FE-022-2**
  - **Given** the "Detalles" tab
  - **When** it renders
  - **Then** it shows the public link `${window.location.origin}/surveys/${slug}` with copy and open buttons, and every question with its type, a required badge when required, and its options
- **AC-FE-022-3**
  - **Given** the "Respuestas" tab
  - **When** "Ver respuestas" is pressed on a row (short id, date, IP)
  - **Then** a side sheet shows each question with the resolved response text (option ids shown as option contents) and a delete action that asks for confirmation
- **AC-FE-022-4**
  - **Given** the "Estadísticas" tab
  - **When** it renders
  - **Then** it shows the summary line, the completed/incomplete bar and the small multiples of REQ-FE-033, with no cards

### REQ-FE-023 — Answering page

Legacy ID: FE-23.

`pages/SurveyAnsweringPage.tsx` loads the survey by slug; shows "Encuesta no encontrada" on error. Renders textarea (`TEXT_ANSWER`), radio group (`SINGLE_SELECT`, value sent as `[optionId]`) or checkboxes (`MULTI_SELECT`). Required questions are marked with `*` and validated client-side: each unanswered required question shows "Esta pregunta es obligatoria" under it and focus moves to the first of them; empty responses are omitted from the payload. On success shows the thank-you state; on error toasts `error.detail`. Layout and states: REQ-FE-034.

**Acceptance criteria**

- **AC-FE-023-1**
  - **Given** a survey with one question of each type
  - **When** the page renders
  - **Then** it shows a textarea, a radio group and checkboxes respectively, and required questions are marked with `*`
- **AC-FE-023-2**
  - **Given** a required question left empty
  - **When** the form is submitted
  - **Then** "Esta pregunta es obligatoria" is shown under it, focus moves to the first unanswered required question, and no request is sent
- **AC-FE-023-3**
  - **Given** a `SINGLE_SELECT` choice of option 2 and an empty optional question
  - **When** the form is submitted
  - **Then** the payload holds `{ id, content: [2] }` for the select question and omits the empty one
- **AC-FE-023-4**
  - **Given** the API answers `201`
  - **When** the form is submitted
  - **Then** the thank-you state of REQ-FE-034 replaces the form
- **AC-FE-023-5**
  - **Given** the API answers with an error
  - **When** the form is submitted
  - **Then** the error's `detail` is shown in a toast

### REQ-FE-024 — Inactive survey looks missing

Legacy ID: FE-24.

An inactive survey is indistinguishable from a missing one for respondents: loading it shows the same "Encuesta no encontrada — no existe o no está disponible" view as REQ-FE-023, and a submission rejected with `404` (the survey was deactivated meanwhile) shows the API `detail` in a toast, like any other error.

**Acceptance criteria**

- **AC-FE-024-1**
  - **Given** `GET /surveys/:slug` answers `404` (missing or inactive)
  - **When** the answering page loads
  - **Then** it shows "Encuesta no encontrada — no existe o no está disponible"
- **AC-FE-024-2**
  - **Given** the submission is rejected with `404`
  - **When** the form is submitted
  - **Then** the API `detail` is shown in a toast

### REQ-FE-025 — Shared confirmation dialog

Legacy ID: FE-25.

Every confirmation of a destructive action (logout, survey deletion, answer deletion) uses the single shared component `components/ConfirmationDialog.tsx` (title "Confirma tu acción", description, destructive confirm button, "Cancelar"). Pages must not build their own confirmation `DialogContent`.

**Acceptance criteria**

- **AC-FE-025-1**
  - **Given** `ConfirmationDialog`
  - **When** it is open
  - **Then** it shows the title "Confirma tu acción", the given description, a destructive confirm button and "Cancelar"
- **AC-FE-025-2**
  - **Given** logout, survey deletion, answer deletion, invitation revocation and the logout of the accept-invitation page
  - **When** their confirmations are inspected
  - **Then** all use `ConfirmationDialog` and no page builds its own confirmation `DialogContent`

### REQ-FE-026 — Locked badge

Legacy ID: FE-26.

A locked survey (`isLocked`) shows a "Bloqueada" label (lock icon and text, REQ-BRAND-030) next to its status, in the dashboard table (REQ-FE-017) and in the details header (REQ-FE-021). Hovering or focusing it shows the tooltip "Ya fue activada: nombre y preguntas no se pueden modificar". The label is the shared component `components/LockedBadge.tsx` and is focusable so the tooltip is reachable by keyboard.

**Acceptance criteria**

- **AC-FE-026-1**
  - **Given** a survey with `isLocked: true`
  - **When** it appears in the dashboard table or the details header
  - **Then** a "Bloqueada" label with a lock icon (`LockedBadge`) is shown next to its status; an unlocked survey shows none
- **AC-FE-026-2**
  - **Given** the badge
  - **When** it is hovered or focused
  - **Then** the tooltip "Ya fue activada: nombre y preguntas no se pueden modificar" is shown

### REQ-FE-027 — Invitations page

Legacy ID: FE-27.

`pages/InvitationsPage.tsx` (`/dashboard/invitations`) is reached from "Invitaciones" in the side navigation (REQ-FE-031). A form with the email creates an invitation; on success it shows the link `${window.location.origin}/auth/invite/${token}` with a copy button and the note that it is shown only once and expires in 48 hours; `409` shows the API detail in a toast. Below, a table of invitations (email, status badge — Pendiente / Aceptada / Revocada / Caducada —, invited by, created and expiry dates) with a "Revocar" action on pending ones, confirmed with `ConfirmationDialog` (REQ-FE-025). The link of the last created invitation stays visible until another one is created or the page is left. Above the table, a status filter (Todas / Pendiente / Aceptada / Revocada / Caducada, default Todas, as status chips, REQ-BRAND-030) filters on the client: the API returns every invitation (REQ-AUTH-025).

Layout: title "Invitaciones" (`text-h1`); the form as one line (the email field taking the free width and the primary button; stacked below `md`); the created link, when shown, as a ruled block (1 px `--rule-strong` rules above and below) holding the link in a read-only field, the icon-only "Copiar enlace" button and the note; then the chips and the table (REQ-BRAND-029; stacked rows below `md`), with status labels per REQ-BRAND-030 and "Revocar" as a `ghost` button in `--rust`.

**Acceptance criteria**

- **AC-FE-027-1**
  - **Given** a valid email
  - **When** the invitation form is submitted and the API answers `201` with a token
  - **Then** the link `${window.location.origin}/auth/invite/${token}` is shown with a copy button and a note that it is shown only once and expires in 48 hours
- **AC-FE-027-2**
  - **Given** the API answers `409`
  - **When** the form is submitted
  - **Then** the API detail is shown in a toast
- **AC-FE-027-3**
  - **Given** the invitations list
  - **When** the table renders
  - **Then** each row shows email, a status badge (Pendiente / Aceptada / Revocada / Caducada), invited by, created and expiry dates, and only pending rows have "Revocar"
- **AC-FE-027-4**
  - **Given** "Revocar" on a pending invitation
  - **When** it is confirmed in `ConfirmationDialog`
  - **Then** `DELETE /invitations/:id` is sent
- **AC-FE-027-5**
  - **Given** the status filter (default Todas)
  - **When** "Pendiente" is chosen
  - **Then** only pending invitations are shown, without a new API request
- **AC-FE-027-6**
  - **Given** a created invitation link is shown
  - **When** another invitation is created or the page is left
  - **Then** the link is replaced or no longer shown

### REQ-FE-028 — Accept invitation page

Legacy ID: FE-28.

`pages/AcceptInvitationPage.tsx` (`/auth/invite/:token`, public) loads the invitation by token. If it is invalid shows "Invitación no válida o caducada". If the visitor already has a session (`getCurrentUser` succeeds), the form is not shown: the page says that there is a session open as that username and must be closed to accept the invitation, with a "Cerrar sesión" button confirmed with `ConfirmationDialog` (REQ-FE-025); after logging out the query cache is cleared and the form appears. Otherwise shows the email ("Correo electrónico", read only) and a form with username, password and password confirmation, validated with the web's `acceptInvitationFormSchema` (REQ-FE-004); both password fields use `PasswordInput` (REQ-FE-015), each with its own visibility toggle. On success stores the user in the `getCurrentUser` cache (`{ data: user }`) and navigates to `/dashboard`; on error shows the API detail in a toast. UI copy in Spanish (REQ-FE-006). Layout: the auth page frame of REQ-FE-030.

**Acceptance criteria**

- **AC-FE-028-1**
  - **Given** a token the API answers with `404`
  - **When** the page loads
  - **Then** it shows "Invitación no válida o caducada"
- **AC-FE-028-2**
  - **Given** a valid token and a visitor with a session
  - **When** the page loads
  - **Then** the form is hidden and the page says a session is open as that username and must be closed, with a "Cerrar sesión" button
- **AC-FE-028-3**
  - **Given** that "Cerrar sesión" button
  - **When** it is confirmed in `ConfirmationDialog` and the logout succeeds
  - **Then** the query cache is cleared and the form appears
- **AC-FE-028-4**
  - **Given** a valid token and no session
  - **When** the page loads
  - **Then** it shows the read-only email "Correo electrónico" and fields for username, password and password confirmation, each password field with its own visibility toggle
- **AC-FE-028-5**
  - **Given** mismatched passwords or a too-short username
  - **When** the form is submitted
  - **Then** Spanish validation messages from `acceptInvitationFormSchema` are shown and no request is sent
- **AC-FE-028-6**
  - **Given** the API answers `201` with a user
  - **When** the form is submitted
  - **Then** `{ data: user }` is stored in the `getCurrentUser` cache and the app navigates to `/dashboard`
- **AC-FE-028-7**
  - **Given** the API answers with an error
  - **When** the form is submitted
  - **Then** the API detail is shown in a toast

### REQ-FE-029 — Theme selector and logo placement

Legacy ID: FE-29.

The top bar offers the theme selector (REQ-BRAND-011): the "Tema" button from `md`, and the "Tema" radio group in the menu sheet below `md` (REQ-FE-016). The logo (REQ-BRAND-021) is shown in the top bar, the menu sheet, the auth page frame (REQ-FE-030) and the answering page footer (REQ-FE-034); no separate "Sondix" text is rendered next to it.

**Acceptance criteria**

- **AC-FE-029-1**
  - **Given** the top bar at `md` or wider, and the menu sheet below `md`
  - **When** they render
  - **Then** the first has the "Tema" button and the second the "Tema" radio group, both with "Claro", "Oscuro" and "Sistema"
- **AC-FE-029-2**
  - **Given** the top bar, the menu sheet, the auth pages and the answering page
  - **When** they render
  - **Then** each shows the logo component once and no separate "Sondix" text next to it

### REQ-FE-030 — Auth page frame

Legacy ID: FE-30.

The login (`/auth/login`) and accept-invitation (`/auth/invite/:token`) pages share one frame (`pages/AuthPage.tsx`): a single centered column on `--paper`, at most 24 rem wide, vertically centered from `md` and starting 48 px from the top below `md`; the logo (REQ-BRAND-021), under it the line "Sistema de gestión de encuestas" (`text-small`, `--ink-muted`), then a 2 px `--rule-strong` rule, then the page's title (`text-h2`), description and form, with full-width fields and primary button. There is no brand panel, no texture and no card (REQ-BRAND-023).

**Acceptance criteria**

- **AC-FE-030-1**
  - **Given** `/auth/login` and `/auth/invite/:token` at any width
  - **When** they render
  - **Then** each shows a single centered column at most 24 rem wide with the logo, the line "Sistema de gestión de encuestas", a 2 px `--rule-strong` rule and the page's form, with no side panel, card or texture

### REQ-FE-031 — Section navigation

Legacy ID: FE-31.

The top bar's section navigation (`components/TopBar.tsx`, REQ-BRAND-022) holds only the sections that exist: "Encuestas" (`/dashboard`, active on `/dashboard` and `/dashboard/surveys/*`) and "Invitaciones" (`/dashboard/invitations`). "Crear encuesta" is not a section: it is the primary button of the survey list (REQ-FE-017). Items are links (`text-body`, 10 px × 14 px padding); the active one is weight 700 with a 2 px `--teal` underline (inset at the bottom of the bar) and `aria-current="page"`; hover shows the underline in `--rule`. Below `md` the same items are listed in the menu sheet (REQ-FE-016), the active one marked the same way. New sections are added here when they exist.

**Acceptance criteria**

- **AC-FE-031-1**
  - **Given** the section navigation
  - **When** it renders
  - **Then** it shows "Encuestas" (`/dashboard`) and "Invitaciones" (`/dashboard/invitations`), and no other item
- **AC-FE-031-2**
  - **Given** the current path is `/dashboard` or `/dashboard/surveys/<slug>`
  - **When** the navigation renders
  - **Then** "Encuestas" has `aria-current="page"`, weight 700 and the 2 px `--teal` underline; on `/dashboard/invitations`, "Invitaciones" does

### REQ-FE-032 — Active surveys small multiples

On `/dashboard`, between the header row and the survey list, `components/ActiveSurveys.tsx` shows the most recently activated active surveys as small multiples (REQ-BRAND-027) from `GET /stats/surveys/active` (REQ-STAT-009), in the order received (at most 8, 4 / 2 / 1 per line):

- **Section:** a `<section>` with accessible name "Encuestas activas".
- **Cell:** the survey name as a link to `/dashboard/surveys/{slug}` (title), the total of answers as the figure (`text-figure`, with the accessible text "{n} respuestas"), and two bars: "Completas" (`completedAnswers`, teal) and "Incompletas" (`incompleteAnswers`, rust).
- **Common scale:** every bar of the row is drawn from 0 to the same `scaleMax`: the smallest value in the sequence 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000 … (1, 2, 2.5 and 5 × 10ᵏ, k ≥ 1) that is greater than or equal to the largest `totalAnswers` of the row (10 when every survey has 0 answers). The caption reads "Escala común: 0–{scaleMax} respuestas".
- **More than shown:** when the summary's `active` (REQ-STAT-008) is greater than the number of cells, the caption line also holds the link "Ver todas las activas", which sets the list's status filter to Activas (REQ-FE-018) and moves focus to the list.
- **Empty:** with no active survey, the row is replaced by the line "No hay encuestas activas. Activa una encuesta para empezar a recoger respuestas." (`--ink-muted`), between the same two rules.
- **Loading and error:** skeleton cells while loading; on error, the error line with "Reintentar" (REQ-BRAND-033). The rest of the page does not wait for it.

**Acceptance criteria**

- **AC-FE-032-1**
  - **Given** `GET /stats/surveys/active` returns 3 surveys with totals 83, 41 and 12
  - **When** `/dashboard` renders at `lg`
  - **Then** the section "Encuestas activas" shows 3 cells in the order received, each with the name linking to its details, the total, and the "Completas" and "Incompletas" bars, and the caption "Escala común: 0–100 respuestas"
- **AC-FE-032-2**
  - **Given** a largest total of 7, 20, 120 or 0
  - **When** the scale is computed
  - **Then** `scaleMax` is 10, 20, 200 or 10 respectively
- **AC-FE-032-3**
  - **Given** a cell with 71 completed and 12 incomplete answers on a scale of 100
  - **When** it renders
  - **Then** the "Completas" bar is teal at 71% of the track and the "Incompletas" bar is rust at 12%, each with its number as text
- **AC-FE-032-4**
  - **Given** 8 cells and a summary with `active: 11`
  - **When** "Ver todas las activas" is pressed
  - **Then** the list is filtered to Activas (URL `active=true`, page 1) and focus moves to the list
- **AC-FE-032-5**
  - **Given** a summary with `active` equal to the number of cells
  - **When** the row renders
  - **Then** there is no "Ver todas las activas" link
- **AC-FE-032-6**
  - **Given** `GET /stats/surveys/active` returns `[]`
  - **When** `/dashboard` renders
  - **Then** the row shows "No hay encuestas activas. Activa una encuesta para empezar a recoger respuestas."
- **AC-FE-032-7**
  - **Given** the request fails
  - **When** the row renders
  - **Then** it shows the error line with "Reintentar", and the survey list still renders

### REQ-FE-033 — Statistics tab

The "Estadísticas" tab (`components/SurveyStatistics.tsx`, data from `GET /surveys/:slug/stats`, REQ-STAT-002) reads like a yearbook page:

1. **Summary line:** "{totalAnswers} respuestas · {completedAnswers} completas · {incompleteAnswers} incompletas · {questionCount} preguntas" (`text-body`, tabular figures; singulars when a count is 1).
2. **Completion bar:** one full-width stacked bar (8 px, square ends) whose teal segment is `completedAnswers / totalAnswers` and rust segment `incompleteAnswers / totalAnswers`, with the labels "Completas {n} ({p})" and "Incompletas {n} ({p})" under it as text (percentages rounded to integers and written with no space before "%", e.g. "86%", as every percentage in the app, REQ-BRAND-028).
3. **Small multiples by question** (REQ-BRAND-027, 3 / 2 / 1 cells per line), one cell per select question in `optionStats` order: the title "{question number}. {question name}", a caption with the type ("Selección única" / "Selección múltiple"), and one bar per option (REQ-BRAND-028, teal) labelled with the option text and valued "{responseCount} · {p}", where `p = responseCount / totalAnswers`. Every bar of every cell uses the same scale, 0 to `totalAnswers`, so a bar's length is the share of respondents who chose that option. The caption under the row reads "Escala común: 0–{totalAnswers} respuestas (100%)" and, when any question is a multiple choice, also "En selección múltiple los porcentajes pueden sumar más de 100%".
4. **Text questions** are not charted: when the survey has any, a closing line reads "{n} preguntas de texto libre: consulta sus respuestas en la pestaña Respuestas." (singular for 1).

With `totalAnswers = 0`, the tab shows only the line "Todavía no hay respuestas para esta encuesta." Loading and error follow REQ-BRAND-033.

**Acceptance criteria**

- **AC-FE-033-1**
  - **Given** stats with 83 answers, 71 completed, 12 incomplete and 5 questions
  - **When** the tab renders
  - **Then** the summary line reads "83 respuestas · 71 completas · 12 incompletas · 5 preguntas" and the completion bar has a teal segment of 71/83 and a rust segment of 12/83, labelled "Completas 71 (86%)" and "Incompletas 12 (14%)"
- **AC-FE-033-2**
  - **Given** a `SINGLE_SELECT` question whose options have 50 and 33 responses out of 83 answers
  - **When** its cell renders
  - **Then** the bars are 50/83 and 33/83 of the track, valued "50 · 60%" and "33 · 40%", on the same scale as every other cell
- **AC-FE-033-3**
  - **Given** a survey with a `MULTI_SELECT` question
  - **When** the tab renders
  - **Then** the caption includes "En selección múltiple los porcentajes pueden sumar más de 100%"
- **AC-FE-033-4**
  - **Given** a survey with 2 `TEXT_ANSWER` questions
  - **When** the tab renders
  - **Then** they have no cell and the closing line reads "2 preguntas de texto libre: consulta sus respuestas en la pestaña Respuestas."
- **AC-FE-033-5**
  - **Given** `totalAnswers = 0`
  - **When** the tab renders
  - **Then** it shows only "Todavía no hay respuestas para esta encuesta."

### REQ-FE-034 — Answering page: questionnaire sheet

The public answering page (`/surveys/:slug`) is a calm questionnaire sheet, designed mobile-first, that must not look like a generic online form builder:

- **Frame:** no top bar; one column on `--paper`, at most 42 rem wide, centered, 16 px gutters below `md`; no cards, no colored header band, no tinted page ground. From `lg`, the question numbers hang in a left gutter outside the column.
- **Header:** the survey name (`text-h1`), under it "{n} preguntas · Las marcadas con * son obligatorias." (`text-small`, `--ink-muted`), then a 2 px `--rule-strong` rule.
- **Questions:** each is a `<fieldset>` whose `<legend>` holds the number (tabular figures, `--ink-muted`) and the question text (`text-h3`) with ` *` when required (the asterisk `aria-hidden`, plus visually hidden text "(obligatoria)"); questions are separated by 1 px `--rule` rules and 32 px of space.
- **Options:** each radio or checkbox option is a full-width row at least 44 px tall whose whole area toggles it (the label wraps the control); hover shows `--surface-subtle`; a checked row shows `--teal-tint` behind it and the control filled in teal. The textarea (`text-body-lg`) is at least 4 rows tall, with the placeholder "Escribe tu respuesta aquí...".
- **Errors:** "Esta pregunta es obligatoria" under the question in `--rust` with an icon; the fieldset gets `aria-invalid="true"` and `aria-describedby` to the message (REQ-FE-023).
- **Progress:** "{answered} de {n} respondidas" counts the questions with a non-empty response. Below `md` it is a slim line stuck to the top of the viewport (`--paper` with a 1 px `--rule` under it, the text and a 2 px teal progress bar on a `--rule` track); from `md` it is shown, not sticky, next to the submit button.
- **Submit:** the primary button "Enviar respuestas" (loading "Enviando..."), full width below `md`.
- **Thank-you state:** the form is replaced by the survey name, a 2 px `--rule-strong` rule, "¡Muchas gracias!" (`text-h2`) and "Tus respuestas a la encuesta {name} han sido enviadas correctamente."; focus moves to the heading.
- **Not found:** the same frame with "Encuesta no encontrada" (`text-h1`) and "La encuesta que estás intentando acceder no existe o no está disponible." (REQ-FE-024).
- **Loading:** the frame with skeleton rules in the shape of the header and two questions (REQ-BRAND-033).
- **Footer:** the logo (REQ-BRAND-021) at the bottom of the column, `--ink-muted`, small.

**Acceptance criteria**

- **AC-FE-034-1**
  - **Given** a survey with 5 questions, 2 of them required
  - **When** the page renders at 375 px and at 1440 px
  - **Then** it shows the name, "5 preguntas · Las marcadas con * son obligatorias.", a 2 px rule and five numbered fieldsets separated by rules, in one column at most 42 rem wide, with no card, header band or tinted ground, and no horizontal scroll
- **AC-FE-034-2**
  - **Given** a select question
  - **When** a point anywhere in an option row is clicked or tapped
  - **Then** that option toggles, and the row is at least 44 px tall
- **AC-FE-034-3**
  - **Given** a viewport below `md` and 2 of 5 questions answered
  - **When** the page is scrolled
  - **Then** the line "2 de 5 respondidas" with its progress bar stays visible at the top of the viewport
- **AC-FE-034-4**
  - **Given** a required question
  - **When** its legend is read by the accessibility tree
  - **Then** it includes "(obligatoria)" and the visible asterisk is hidden from it
- **AC-FE-034-5**
  - **Given** the API answers `201`
  - **When** the form is submitted
  - **Then** the thank-you state shows "¡Muchas gracias!" and focus is on that heading
- **AC-FE-034-6**
  - **Given** the page
  - **When** it renders
  - **Then** the logo is shown once, in the footer

## Implementation phases

| Phase | Title | Status | REQ-IDs covered |
|---|---|---|---|
| PH-FE-1 | Existing implementation (migrated) | Done | REQ-FE-001, REQ-FE-002, REQ-FE-003, REQ-FE-004, REQ-FE-005, REQ-FE-007, REQ-FE-008, REQ-FE-009, REQ-FE-010, REQ-FE-011, REQ-FE-012, REQ-FE-014, REQ-FE-015, REQ-FE-017, REQ-FE-018, REQ-FE-019, REQ-FE-020, REQ-FE-021, REQ-FE-022, REQ-FE-023, REQ-FE-024, REQ-FE-025, REQ-FE-026, REQ-FE-027, REQ-FE-028, REQ-FE-029, REQ-FE-030, REQ-FE-031 |
| PH-FE-3 | Redesign: dashboard (summary line, active-survey small multiples, survey list) | Done | REQ-FE-017, REQ-FE-018, REQ-FE-026, REQ-FE-032 |
| PH-FE-4 | Redesign: create survey and survey details (header, tabs, answers, statistics) | Done | REQ-FE-002, REQ-FE-019, REQ-FE-021, REQ-FE-022, REQ-FE-033, REQ-BRAND-019, REQ-BRAND-028 |
| PH-FE-5 | Redesign: invitations, login and accept invitation | Done | REQ-FE-015, REQ-FE-027, REQ-FE-028, REQ-FE-030, REQ-BRAND-023, REQ-BRAND-025 |
| PH-FE-6 | Redesign: public answering page | Planned | REQ-FE-002, REQ-FE-023, REQ-FE-024, REQ-FE-034 |

The former PH-FE-2 (Spanish loading texts "Cargando panel..." and "Redirigiendo...") is delivered by PH-BRAND-3, which rewrites the files involved; REQ-FE-001, REQ-FE-002, REQ-FE-006, REQ-FE-013, REQ-FE-016, REQ-FE-029 and REQ-FE-031 are covered there ([BRAND.md](BRAND.md)). The redesign task's phase order is in [BRAND.md](BRAND.md), Implementation phases.

REQ-FE-002 is completed in two steps (DEV-005): PH-FE-4 removes `ui/chart.tsx` and the `recharts` dependency (the `chart.tsx` and `recharts` part of AC-FE-002-3, and AC-BRAND-028-3) and applies the percentage format of REQ-BRAND-028 to `Bar` (DEV-004); PH-FE-5 and PH-FE-6 stop using `ui/card.tsx` in the pages they redesign (`login-form.tsx`, `InvitationsPage.tsx` and `AcceptInvitationPage.tsx` in PH-FE-5, `SurveyAnsweringPage.tsx` in PH-FE-6), and PH-FE-6 deletes `ui/card.tsx` (the `card.tsx` part of AC-FE-002-3).
