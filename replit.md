# AI Wardrobe

A premium, AI-powered personal styling web app — users digitize their wardrobe and get AI-generated outfit recommendations.

## Run & Operate

- `pnpm --filter @workspace/ai-wardrobe run dev` — run the AI Wardrobe frontend (main app, served at `/`)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000, not yet used by the frontend)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec (not yet needed — no backend wired up)
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required in production: `DATABASE_URL` — Postgres connection string
- Optional AI analysis env: `GEMINI_API_KEY` and `GEMINI_MODEL` (defaults to `gemini-2.5-flash-lite`). Without a key, wardrobe image analysis is unavailable but manual Add Item remains functional.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/ai-wardrobe/` — the frontend app (React + Vite, served at `/`)
- `artifacts/ai-wardrobe/src/index.css` — design tokens (colors, typography, radius) for light/dark mode
- `artifacts/ai-wardrobe/src/components/AppShell.tsx` — shared authenticated layout (sidebar + topbar), reused by every logged-in page
- `artifacts/ai-wardrobe/src/pages/` — one file per route (landing, auth/_, dashboard, wardrobe/_, outfits/*, style-profile, shopping-assistant, beauty, friends, calendar, settings)
- `artifacts/ai-wardrobe/src/lib/mock-*.ts` — placeholder/mock data per feature area (no backend wired up yet)

## Architecture decisions

- Frontend-only build: no backend, no database, no OpenAPI/codegen. All data is realistic mock data in `src/lib/mock-*.ts` files.
- Fonts: Playfair Display (headings) + Plus Jakarta Sans (body) for the premium/editorial feel.
- Light mode is primary; dark mode is fully wired via `next-themes` with a toggle in the sidebar/settings.

## Product

An AI-powered personal stylist: users digitize their wardrobe (Wardrobe), get AI-generated outfit suggestions (Outfits), track their style identity (Style Profile), get shopping recommendations (Shopping Assistant), manage beauty routines (Beauty), plan outfits on a Calendar, and coordinate looks with friends (Friends). All flows currently use placeholder data — no backend integration yet.

## User preferences

- Design direction (explicitly requested): minimalistic, premium, modern, elegant, soft rounded corners, spacious layouts, smooth animations, glassmorphism only where it fits, white/light mode primary with optional dark mode, no emojis anywhere in the UI.
- Build only the frontend UI/UX first; backend integration is intentionally deferred.

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
