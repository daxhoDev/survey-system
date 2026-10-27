← Back to [MAIN](MAIN.md)

# Frontend

- **Module:** Frontend
- **Module code:** FE
- **Version:** v1.0
- **Status:** Approved
- **Last updated:** 2026-10-27

## Description

The web app (`apps/web`): stack and UI conventions, the generated API client, routes, and every page (login, dashboard layout, header, side navigation, survey list, survey creation and details, invitations, invitation acceptance, public answering page). Brand identity (Sondix name, color tokens, light/dark themes, typography, radii, logo) is specified in [BRAND.md](BRAND.md).

Requirement numbers keep the legacy IDs: legacy `FE-13` is `REQ-FE-013`.

Related: [BRAND.md](BRAND.md), [ARCHITECTURE.md](ARCHITECTURE.md), [API.md](API.md), [AUTH.md](AUTH.md), [SURVEYS.md](SURVEYS.md), [ANSWERS.md](ANSWERS.md), [STATS.md](STATS.md).

### Routes (`apps/web/src/App.tsx`)

| Path | Element | Access |
|------|---------|--------|
| `/` | redirect → `/auth/login` | public |
| `/auth/login` | `AuthPage` › `LoginPage` (holds `LoginBrandPanel` + `LoginForm`) | public |
| `/auth/invite/:token` | `AuthPage` › `AcceptInvitationPage` | public |
| `/dashboard` | `DashboardPage` › `Surveys` | session |
| `/dashboard/surveys/create` | `DashboardPage` › `SurveyCreatePage` | session |
| `/dashboard/surveys/:slug` | `DashboardPage` › `SurveyDetailsPage` | session |
| `/dashboard/invitations` | `DashboardPage` › `InvitationsPage` | session |
| `/surveys/:slug` | `SurveyAnsweringPage` | public |

### Pages and components

| Area | Code | Requirements |
|------|------|--------------|
| Login | `pages/LoginPage.tsx`, `components/login-form.tsx`, `components/LoginBrandPanel.tsx`, `components/PasswordInput.tsx` | REQ-FE-015, REQ-FE-030 |
| Dashboard layout and session guard | `pages/DashboardPage.tsx` | REQ-FE-013 |
| Header | `components/DashboardHeader.tsx`, `components/ThemeSelector.tsx` | REQ-FE-016, REQ-FE-029 |
| Side navigation | `components/AppSidebar.tsx` | REQ-FE-031 |
| Survey list (`/dashboard`) | `components/Surveys.tsx`, `components/ListPagination.tsx` | REQ-FE-017, REQ-FE-018 |
| Create survey | `pages/SurveyCreatePage.tsx` | REQ-FE-019, REQ-FE-020 |
| Survey details | `pages/SurveyDetailsPage.tsx`, `components/LockedBadge.tsx` | REQ-FE-021, REQ-FE-022, REQ-FE-026 |
| Invitations (`/dashboard/invitations`) | `pages/InvitationsPage.tsx` | REQ-FE-027 |
| Accept invitation (`/auth/invite/:token`, public) | `pages/AcceptInvitationPage.tsx` | REQ-FE-028 |
| Answering (`/surveys/:slug`, public) | `pages/SurveyAnsweringPage.tsx` | REQ-FE-023, REQ-FE-024 |
| Destructive confirmations | `components/ConfirmationDialog.tsx` | REQ-FE-025 |

## Requirements

### REQ-FE-001 — Web stack

Legacy ID: FE-01.

Vite 8 + React 19 with the React Compiler (`babel-plugin-react-compiler` via `@rolldown/plugin-babel`), TypeScript, Tailwind CSS 4 (`@tailwindcss/vite`), `tw-animate-css`, Inter variable font. Inter for body text and Manrope (`@fontsource-variable/manrope`) for headings. Brand identity (Sondix name, color tokens, light/dark themes, typography, radii) is in [BRAND.md](BRAND.md).

**Acceptance criteria**

- **AC-FE-001-1**
  - **Given** `apps/web/package.json` and `apps/web/vite.config.ts`
  - **When** they are read
  - **Then** the app uses Vite 8, React 19, TypeScript, Tailwind CSS 4 through `@tailwindcss/vite`, `tw-animate-css`, `@fontsource-variable/inter`, `@fontsource-variable/manrope`, and the React Compiler (`babel-plugin-react-compiler`) through `@rolldown/plugin-babel`

### REQ-FE-002 — UI component libraries

Legacy ID: FE-02.

UI components are shadcn/ui (config `components.json`) in `apps/web/src/components/ui`, built on `radix-ui`; icons from `lucide-react`; toasts with `sonner` (`<Toaster position="top-center" theme={theme} />`, following the active theme, REQ-BRAND-011); tables with `@tanstack/react-table` (`ui/data-table.tsx`); charts with `recharts` through `ui/chart.tsx`.

**Acceptance criteria**

- **AC-FE-002-1**
  - **Given** the web source
  - **When** UI primitives, icons, toasts, tables and charts are looked up
  - **Then** primitives come from `components/ui` (shadcn/ui on `radix-ui`, configured in `components.json`), icons from `lucide-react`, tables from `ui/data-table.tsx` (`@tanstack/react-table`) and charts from `ui/chart.tsx` (`recharts`)
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

`DashboardPage` is the session guard: it calls `useGetCurrentUser`; while loading shows "Cargando panel...", on error navigates to `/auth/login`. Layout: `TooltipProvider` > `SidebarProvider` with the side navigation (`AppSidebar`, REQ-FE-031) and a `SidebarInset` holding `DashboardHeader` + centered `<Outlet />` (max width 6xl). The sidebar's open state is read back from the `sidebar_state` cookie it writes, so a collapsed sidebar stays collapsed after a reload.

The code today shows the English text "Loading dashboard..." (`apps/web/src/pages/DashboardPage.tsx`); it is corrected in PH-FE-2.

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
  - **Then** the page renders `AppSidebar` and a `SidebarInset` with `DashboardHeader` and the child route centered with max width 6xl
- **AC-FE-013-4**
  - **Given** the cookie `sidebar_state=false`
  - **When** the dashboard is loaded
  - **Then** the sidebar starts collapsed

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

### REQ-FE-016 — Dashboard header

Legacy ID: FE-16.

Top bar of the dashboard (`components/DashboardHeader.tsx`): the sidebar toggle ("Mostrar u ocultar menú", REQ-FE-031), the theme selector (REQ-FE-029), the user's initial and username, and logout. On mobile only (below `md`), where the sidebar is a closed sheet, it also shows the Sondix logo as the link to `/dashboard` (accessible name "Sondix, ir a encuestas"); on desktop the logo lives in the sidebar. Navigation to sections is in the sidebar, not here. Logout asks for confirmation in a dialog; on success clears the whole query cache and navigates to `/auth/login`. When the current user is not available once loading has finished, the header shows "Redirigiendo..." in place of the user and logout.

The code today shows the English text "Redirecting..."; it is corrected in PH-FE-2.

**Acceptance criteria**

- **AC-FE-016-1**
  - **Given** a session
  - **When** the header renders
  - **Then** it shows the sidebar toggle, the theme selector, the user's initial and username, and a logout button
- **AC-FE-016-2**
  - **Given** a viewport below `md`
  - **When** the header renders
  - **Then** it shows the Sondix logo as a link to `/dashboard` with accessible name "Sondix, ir a encuestas"; from `md` up the link is hidden
- **AC-FE-016-3**
  - **Given** the user presses logout
  - **When** the confirmation dialog is confirmed and the API answers `204`
  - **Then** the whole query cache is cleared and the app navigates to `/auth/login`
- **AC-FE-016-4**
  - **Given** the current-user query has finished loading without a user
  - **When** the header renders
  - **Then** it shows "Redirigiendo..." instead of the user and logout

### REQ-FE-017 — Survey list counters and table

Legacy ID: FE-17.

`components/Surveys.tsx` (`/dashboard`) shows the cards "Total de encuestas" and "Encuestas activas" from `GET /stats/surveys` (REQ-STAT-008, unaffected by the list filters), a "Crear encuesta" button and a table (name, creation date, status badge, actions menu: view details, activate/deactivate). Creating, activating/deactivating or deleting a survey invalidates both the list and the counters.

**Acceptance criteria**

- **AC-FE-017-1**
  - **Given** `GET /stats/surveys` returns `{ all: 7, active: 3 }`
  - **When** `/dashboard` renders
  - **Then** "Total de encuestas" shows 7 and "Encuestas activas" shows 3, whatever filters the list has
- **AC-FE-017-2**
  - **Given** the survey list
  - **When** it renders
  - **Then** it shows a "Crear encuesta" button and a table with name, creation date, status badge and an actions menu (view details, activate/deactivate)
- **AC-FE-017-3**
  - **Given** a survey is created, activated, deactivated or deleted
  - **When** the mutation succeeds
  - **Then** both the survey list query and the summary query are invalidated

### REQ-FE-018 — Paginated, searchable, filterable list

Legacy ID: FE-18.

The table is server-paginated, 10 per page, newest first by default (REQ-SURV-020). Above it, a search box ("Buscar por nombre", queried 300 ms after typing pauses) and status chips Todas / Activas / Inactivas (`aria-pressed`); the "Nombre" and "Fecha de creación" headers sort ascending/descending. Below it, `components/ListPagination.tsx`: "Mostrando 11–20 de 43", "Página 2 de 5", Anterior / Siguiente, using `meta.total` (REQ-SURV-007). Search, status, sort and page live in the URL (`?search=&active=&sort=&page=`, defaults omitted) so reload, links and returning from a survey keep them; changing search, status or sort goes back to page 1. While a new page loads the previous one stays visible (dimmed). Empty states: "Ninguna encuesta coincide con la búsqueda o el filtro." with filters, otherwise an invitation to create the first survey. The API's `date` filter is not exposed.

**Acceptance criteria**

- **AC-FE-018-1**
  - **Given** `/dashboard` with no query string
  - **When** the list loads
  - **Then** it requests page 1 with limit 10 and no sort (newest first)
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

`pages/SurveyCreatePage.tsx`: form with name (required, min 5) and a dynamic list of questions (name required min 5, type select, required checkbox, options for select types). On submit, question ids and option ids are numbered sequentially from 1. On success invalidates the survey list, toasts and returns to `/dashboard`.

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

`pages/SurveyDetailsPage.tsx`: header with name, slug, activate/deactivate button and delete button (confirmation dialog; on success navigates to `/dashboard`).

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
- **Estadísticas**: total/completed/incomplete cards and one horizontal bar chart per select question.

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
  - **Then** it shows total, completed and incomplete cards and one horizontal bar chart per select question

### REQ-FE-023 — Answering page

Legacy ID: FE-23.

`pages/SurveyAnsweringPage.tsx` loads the survey by slug; shows "Encuesta no encontrada" on error. Renders textarea (`TEXT_ANSWER`), radio group (`SINGLE_SELECT`, value sent as `[optionId]`) or checkboxes (`MULTI_SELECT`). Required questions are marked with `*` and validated client-side; empty responses are omitted from the payload. On success shows a thank-you card; on error toasts `error.detail`.

**Acceptance criteria**

- **AC-FE-023-1**
  - **Given** a survey with one question of each type
  - **When** the page renders
  - **Then** it shows a textarea, a radio group and checkboxes respectively, and required questions are marked with `*`
- **AC-FE-023-2**
  - **Given** a required question left empty
  - **When** the form is submitted
  - **Then** a client-side error is shown and no request is sent
- **AC-FE-023-3**
  - **Given** a `SINGLE_SELECT` choice of option 2 and an empty optional question
  - **When** the form is submitted
  - **Then** the payload holds `{ id, content: [2] }` for the select question and omits the empty one
- **AC-FE-023-4**
  - **Given** the API answers `201`
  - **When** the form is submitted
  - **Then** a thank-you card is shown
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

A locked survey (`isLocked`) shows a "Bloqueada" badge next to its status, in the dashboard table (REQ-FE-017) and in the details header (REQ-FE-021). Hovering or focusing it shows the tooltip "Ya fue activada: nombre y preguntas no se pueden modificar". The badge is the shared component `components/LockedBadge.tsx`.

**Acceptance criteria**

- **AC-FE-026-1**
  - **Given** a survey with `isLocked: true`
  - **When** it appears in the dashboard table or the details header
  - **Then** a "Bloqueada" badge (`LockedBadge`) is shown next to its status; an unlocked survey shows none
- **AC-FE-026-2**
  - **Given** the badge
  - **When** it is hovered or focused
  - **Then** the tooltip "Ya fue activada: nombre y preguntas no se pueden modificar" is shown

### REQ-FE-027 — Invitations page

Legacy ID: FE-27.

`pages/InvitationsPage.tsx` (`/dashboard/invitations`) is reached from "Invitaciones" in the side navigation (REQ-FE-031). A form with the email creates an invitation; on success it shows the link `${window.location.origin}/auth/invite/${token}` with a copy button and the note that it is shown only once and expires in 48 hours; `409` shows the API detail in a toast. Below, a table of invitations (email, status badge — Pendiente / Aceptada / Revocada / Caducada —, invited by, created and expiry dates) with a "Revocar" action on pending ones, confirmed with `ConfirmationDialog` (REQ-FE-025). The link of the last created invitation stays visible until another one is created or the page is left. Above the table, a status filter (Todas / Pendiente / Aceptada / Revocada / Caducada, default Todas) filters on the client: the API returns every invitation (REQ-AUTH-025).

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

`pages/AcceptInvitationPage.tsx` (`/auth/invite/:token`, public) loads the invitation by token. If it is invalid shows "Invitación no válida o caducada". If the visitor already has a session (`getCurrentUser` succeeds), the form is not shown: the page says that there is a session open as that username and must be closed to accept the invitation, with a "Cerrar sesión" button confirmed with `ConfirmationDialog` (REQ-FE-025); after logging out the query cache is cleared and the form appears. Otherwise shows the email ("Correo electrónico", read only) and a form with username, password and password confirmation, validated with the web's `acceptInvitationFormSchema` (REQ-FE-004); both password fields use `PasswordInput` (REQ-FE-015), each with its own visibility toggle. On success stores the user in the `getCurrentUser` cache (`{ data: user }`) and navigates to `/dashboard`; on error shows the API detail in a toast. UI copy in Spanish (REQ-FE-006).

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

### REQ-FE-029 — Theme selector and logo wordmark

Legacy ID: FE-29.

The header shows a theme selector ("Claro" / "Oscuro" / "Sistema", REQ-BRAND-011). The product name "Sondix" is the wordmark of the theme-aware SVG logo (REQ-BRAND-001, REQ-BRAND-026), switching with the theme.

**Acceptance criteria**

- **AC-FE-029-1**
  - **Given** the dashboard header
  - **When** it renders
  - **Then** it has a theme selector with the options "Claro", "Oscuro" and "Sistema"
- **AC-FE-029-2**
  - **Given** the light or dark theme
  - **When** the logo is shown
  - **Then** it is `logo-light.svg` in light and `logo-dark.svg` in dark, and no separate "Sondix" text is rendered next to it

### REQ-FE-030 — Login brand panel

Legacy ID: FE-30.

The login page shows the textured Sondix brand panel beside the form on wide screens (REQ-BRAND-023).

**Acceptance criteria**

- **AC-FE-030-1**
  - **Given** `/auth/login` at the `lg` breakpoint or wider
  - **When** it renders
  - **Then** `LoginBrandPanel` is shown beside the login form; below `lg` it is hidden

### REQ-FE-031 — Side navigation

Legacy ID: FE-31.

Sidebar (`components/AppSidebar.tsx`, shadcn `ui/sidebar.tsx`, REQ-BRAND-022) with only the sections that exist: "Encuestas" (`/dashboard`, active on `/dashboard` and `/dashboard/surveys/*`) and, under the group label "Administración", "Invitaciones" (`/dashboard/invitations`). The header holds the Sondix logo (the theme-aware lockup, or the isotype when collapsed) as the link to `/dashboard`. The active item is highlighted with `--sidebar-accent` and has `aria-current="page"`. On desktop it collapses to an icon rail (toggle button, rail or Ctrl/⌘+B) with tooltips, and the state persists in the `sidebar_state` cookie; on mobile (below `md`) it opens as a sheet from the toggle and closes on navigation. New sections are added here when they exist.

**Acceptance criteria**

- **AC-FE-031-1**
  - **Given** the sidebar
  - **When** it renders
  - **Then** it shows "Encuestas" (`/dashboard`) and, under "Administración", "Invitaciones" (`/dashboard/invitations`), and no other section
- **AC-FE-031-2**
  - **Given** the current path is `/dashboard` or `/dashboard/surveys/<slug>`
  - **When** the sidebar renders
  - **Then** "Encuestas" has `aria-current="page"` and the `--sidebar-accent` highlight; on `/dashboard/invitations`, "Invitaciones" does
- **AC-FE-031-3**
  - **Given** the sidebar header
  - **When** it renders expanded or collapsed
  - **Then** it shows the theme-aware lockup expanded, the isotype collapsed, linking to `/dashboard`
- **AC-FE-031-4**
  - **Given** a desktop viewport
  - **When** the toggle, the rail or Ctrl/⌘+B is used
  - **Then** the sidebar collapses to an icon rail with tooltips and `sidebar_state` is written to a cookie
- **AC-FE-031-5**
  - **Given** a viewport below `md`
  - **When** the toggle is pressed and then a section is chosen
  - **Then** the sidebar opens as a sheet and closes on navigation

## Implementation phases

| Phase | Title | Status | REQ-IDs covered |
|---|---|---|---|
| PH-FE-1 | Existing implementation (migrated) | Done | REQ-FE-001, REQ-FE-002, REQ-FE-003, REQ-FE-004, REQ-FE-005, REQ-FE-007, REQ-FE-008, REQ-FE-009, REQ-FE-010, REQ-FE-011, REQ-FE-012, REQ-FE-014, REQ-FE-015, REQ-FE-017, REQ-FE-018, REQ-FE-019, REQ-FE-020, REQ-FE-021, REQ-FE-022, REQ-FE-023, REQ-FE-024, REQ-FE-025, REQ-FE-026, REQ-FE-027, REQ-FE-028, REQ-FE-029, REQ-FE-030, REQ-FE-031 |
| PH-FE-2 | Spanish loading texts | Planned | REQ-FE-006, REQ-FE-013, REQ-FE-016, REQ-BRAND-024 |

PH-FE-2 replaces "Loading dashboard..." (`apps/web/src/pages/DashboardPage.tsx`) with "Cargando panel..." and "Redirecting..." (`apps/web/src/components/DashboardHeader.tsx`) with "Redirigiendo...".
