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
