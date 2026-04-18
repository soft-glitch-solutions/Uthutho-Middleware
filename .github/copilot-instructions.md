# Copilot instructions for Uthutho-Middleware

This file contains repository-specific guidance for Copilot sessions to help produce useful, focused suggestions.

## Quick commands
- Start dev server: npm run dev
- Build (prod): npm run build
- Build (dev-mode): npm run build:dev
- Preview production build: npm run preview
- Lint: npm run lint

Notes: There are no test scripts configured in package.json. If tests are added (Vitest/Jest), include scripts for running a single test (e.g., `npm run test -- -t "name"`).

## High-level architecture
- Framework: Vite + React (TypeScript) single-page application.
- Styling: Tailwind CSS (tailwind.config.ts) with utility-first classes; shadcn patterns and class-variance-authority used for component variants.
- UI primitives: Radix UI + lucide-react icons; components live under `src/components`.
- Routing: react-router-dom; route-level code organized under `src/pages`.
- State & data fetching: @tanstack/react-query for server state; custom hooks under `src/hooks`.
- Backend integration: Supabase config and helpers in `/supabase` and runtime client usage via `@supabase/supabase-js`.
- Shared utilities: `src/lib` for helper functions and shared logic; `src/integrations` for third-party integration code (maps, analytics, etc.).
- Entry points: `src/main.tsx` bootstraps the app; `src/App.tsx` contains top-level layout and routing.
- Build output: `dist/` contains production artifacts.

## Key conventions and patterns
- Folder roles:
  - `src/components` — reusable UI components (prefer presentational components here).
  - `src/pages` — route-level components (one per route/view).
  - `src/hooks` — custom React hooks for data fetching & behavior.
  - `src/lib` — utilities and shared functions.
  - `src/integrations` — code that wraps 3rd-party SDKs (maps, supabase helpers, exporters).

- Styling & component variants:
  - Use Tailwind utilities and class-variance-authority (cva) for component variant handling.
  - Prefer shadcn-style component composition (Radix primitives + Tailwind wrappers).

- TypeScript:
  - Project uses TypeScript. Keep types in the same file for small components; share reusable types in `src/lib/types` (or `src/lib`).

- Linting:
  - ESLint is configured; run `npm run lint` to check the codebase. The script runs `eslint .` on the repository.

- Package managers:
  - The repo includes both `bun.lock` and `package-lock.json`. Use the package manager your team standardizes on. CI likely uses npm/npm install (package-lock.json present).

## Files/places to check when making changes
- `src/main.tsx` and `src/App.tsx` — app bootstrap and routing.
- `src/pages` — to find route components and lazy-loading patterns.
- `src/integrations` and `/supabase` — for backend and SDK initialization.
- `tailwind.config.ts` — for design tokens and theme tweaks.

## AI / assistant config files
- No repository-specific AI assistant config files were found (CLAUDE.md, .cursorrules, AGENTS.md, etc.).

---

If this needs to be more specific (for example, include test commands once tests are added, or document a custom ESLint config), say which area to expand.

## Open issues and recommended developer actions
Below are actionable notes for currently open issues (as of repository scan). Each entry lists where to look, suggested implementation steps, and focused tests to add.

- #31 Export Data Button (Admin Page)
  - Where to look: src/components/Admin.tsx, src/components/ReportsManagement.tsx, src/components/reports/UserReports.tsx
  - Action: Add an "Export" CTA on the Admin/Reports view that queries the same data used to render tables and streams it to a client-side XLSX export (xlsx dependency already present). Prefer a small exporter helper in src/lib/export.ts and reuse for UserReports and Stops reports.
  - Tests: Playwright E2E: open Admin, click export, intercept network request or verify download (use Playwright page.waitForEvent('download')). Unit: mock exporter and assert correct sheet structure.

- #26 Organization Sections Custom View
  - Where to look: src/components/OrganisationManagement.tsx, OrganisationDetails.tsx, OrganisationGeofenceMap.tsx
  - Action: Create a compact/customizable view component (e.g., <OrgCustomView />) that composes OrganisationDetails + OrganisationGeofenceMap. Add props to toggle columns and map visibility.
  - Tests: Storybook / visual check (if later added) and an E2E test that opens an organisation and verifies map and details render for a sample org.

- #20 RBAC - Admin (roles & permissions UI)
  - Where to look: src/components/RolesPermissionsManagement.tsx, src/components/UsersManagement.tsx, /supabase (RLS setup)
  - Action: Surface role definitions and module-level permissions in RolesPermissionsManagement. Ensure backend RLS and permission tables (public.permissions, public.role_permissions) are used. Add an "Impersonate" flow for admins to preview a role.
  - Tests: Unit tests for permission-check helpers (src/lib/permissions.ts). E2E: login as admin, open role management, change permission, impersonate user and verify restricted routes are hidden.

- #19 Reports - Safety & Incident Report
  - Where to look: src/components/reports/* and ReportsManagement.tsx, integrations that capture incidents
  - Action: Add a Safety report component that queries incidents table (or supabase function). Include map markers and time filters; allow CSV/XLSX export.
  - Tests: E2E: seed a test incident, load report, confirm marker and row present. Unit: snapshot of report table rendering.

- #18 Transport Availability Report
  - Where to look: ReportsManagement.tsx, RoutesManagement.tsx
  - Action: Implement availability metrics (service gaps) using route and stop utilization data; add dashboard tiles and downloadable report.
  - Tests: E2E: apply date range and validate counts change accordingly.

- #17 Route Demand Report
  - Where to look: ReportsManagement.tsx, JourneysManagement.tsx
  - Action: Aggregate passenger counts per route (time-windowed); provide trending charts (Recharts already included) and export.
  - Tests: Unit tests for aggregation functions; E2E to verify chart renders for synthetic data.

- #16 Session & Activity Monitoring - Admin
  - Where to look: ProfileManagement.tsx, NotificationsManagement.tsx, server-side session logs (backend)
  - Action: Add a session monitoring view showing active sessions, last activity, and an option to force-sign-out. Implement auto-logout on inactivity at client level.
  - Tests: E2E: simulate inactivity and ensure auto-logout; test forced sign-out removes session token.

- #14 Add Filters to Blog page (Date Ranges)
  - Where to look: src/components/BlogsManagement.tsx
  - Action: Add date-range picker UI, wire filters into the query parameters and data fetch. Preserve filters in URL so deep links work.
  - Tests: E2E: apply date range and assert results update; unit: component renders selected range.

- #9 Reports - Stops report
  - Where to look: src/components/StopMapExplorer.tsx, src/components/reports/UserReports.tsx
  - Action: Implement a Stops report with counts per area, optional Leaflet map overlay (leaflet present), and export. Reuse existing TransportMap/StopMapExplorer components.
  - Tests: E2E: verify stops plotted and CSV exports include stop ids and counts.

- #7 Admin Page - user count
  - Where to look: src/components/Admin.tsx, OverviewDashboard.tsx, UsersManagement.tsx
  - Action: Add a summary card on Admin/Overview showing total user count and active users. Backed by a lightweight supabase count query (serverless/edge function if needed).
  - Tests: Unit: ensure count component handles zero/loading states; E2E: create a test user and verify count increments.

- #3 Admin - creating admin management page
  - Where to look: src/components/Admin.tsx, RolesPermissionsManagement.tsx
  - Action: If this refers to administrative user management features, expand Admin.tsx to include links to Roles/Permissions, User management and session tools. Consolidate admin utilities into a single Admin dashboard component.
  - Tests: E2E: admin navigation covers all sub-pages and permissions prevent non-admin access.

---

If helpful, the next step can be: (1) create GitHub Actions workflow to run Playwright E2E on pull requests, (2) scaffold unit test tooling (Vitest) and add a couple of core unit tests (permissions + exporter). Say which to prioritize and I will add the files and CI config.
