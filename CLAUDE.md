# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Frontend (repo root):
- `npm run dev` — Vite dev server on port 5173, proxies `/api` to `http://localhost:4000` (see `vite.config.ts`)
- `npm run build` — `tsc -b && vite build`, then copies `dist/index.html` to `dist/404.html` (GitHub Pages SPA-fallback trick; production base path is `/reality_ranking/`, dev stays at `/`)
- `npm run lint` — ESLint

Backend (`backend/`):
- `npm run dev` — `tsx watch src/server.ts`; port comes from `.env` (`PORT`, defaults to 4000)
- `npm run build` / `npm start` — compile then run compiled JS
- `npm run prisma:generate` / `npm run prisma:migrate` — regenerate client / apply schema changes
- `npm run seed` — `tsx prisma/seed.ts`

Run both together from the root: `npm start` (runs `dev:frontend` and `dev:backend` in parallel via `npm-run-all`).

There is no test suite in either package.

`backend/.env` (`DATABASE_URL`/`DIRECT_DATABASE_URL`) points at a real, already-populated Postgres instance in normal development — check it before assuming you need the `docker-compose.yml` Postgres container, which is not what's actually wired up by default.

## Architecture

- Two-package layout: Vite/React/TypeScript frontend at the repo root, Express/Prisma backend in `backend/`. No shared package — types are duplicated by hand between `src/utils/Constants.ts` and the backend's Prisma schema/route response shapes.
- Data model (`backend/prisma/schema.prisma`): `Show` → `Season` → (`Contestant`, `Episode`); `Episode` → `Elimination` / `Ranking`. A `Contestant` can have at most one `Elimination` (`Elimination.contestantId` is `@unique`).
- No auth middleware or token: `POST /api/users/login` just returns the user row, and the client keeps it in the Redux `user` slice (persisted to localStorage manually and deliberately kept *out* of redux-persist — see the comment in `src/redux/store.ts` explaining the two-competing-copies bug that caused). Admin-only UI is gated purely by a client-side `accountType` check.
- Redux (`src/redux/`): `shows`/`seasons`/`episodes` are flat `createEntityAdapter` caches populated wholesale by `fetchAllShows` (`redux/thunks/showsThunks.ts`) and persisted via redux-persist. `selectShowWithSeasonsAndEpisodes` (`redux/selectors.ts`) is the one place that joins those three flat caches into a nested show→seasons→episodes tree; components read through it rather than the raw slices.
- Two ranking modes per show (`Show.rankingMode`: `EPISODE` | `DAILY`). `EPISODE` shows open ranking a fixed duration after `airDate`. `DAILY` shows (e.g. Big Brother) open ranking per America/New_York calendar day instead of per-episode; that timezone/day-boundary math lives in `src/utils/episodeRankability.ts` and is **duplicated by hand** in `backend/src/utils/episodeRankability.ts` and `backend/src/utils/dailyEpisode.ts` (which auto-creates each day's Episode row) — keep both sides in sync, per the comments in each file.
- `GET /api/eliminations/` (`getEliminations()`) returns every elimination across *every* show/season the logged-in user has, grouped only by `episodeId` — it is not scoped to a season. Anything deriving "who's eliminated as of episode N" must filter to the current season first (see `currentSeasonEliminations` in `RankingComponent2.tsx`), otherwise episode-number collisions across shows (nearly every show has an "episode 1") leak the wrong show's contestants into a grid.
- `buildPastRankingColumn` (`src/utils/util.ts`) fills in any roster member missing from a past `Ranking.contestantIds` (e.g. historical data gaps) as an active fallback entry — but a contestant added to the season *after* a given episode already happened must not be backfilled into that episode's column, only into later ones. This is decided by comparing `Contestant.createdAt` to the episode's `airDate` (or, for DAILY shows, calendar day via `getTodayDayKey`) — see `wasContestantOnRosterFor` in `RankingComponent2.tsx`. The function takes two separate id lists for this reason: `seasonContestantIds` (full current roster, used only to pad every column to the same row count) and `eligibleContestantIds` (roster as of that episode, used for the active-fallback step) — don't collapse them back into one list.
- The ranking grid (`RankingComponent2.tsx` + `Episode.tsx`) and the insights table (`InsightsRankingTable.tsx`) both lay out contestant-by-episode data as one CSS Grid with `grid-auto-flow: column` and fixed-width columns — not a `<table>`. Two rules keep this from silently misaligning column-by-column:
  1. Every column must contribute the exact same number of grid cells; pad short columns with blank/null placeholder cells instead of returning a variable-length array (see `buildPastRankingColumn` in `src/utils/util.ts`).
  2. A column's cells must be direct children of the grid, never wrapped in a container div with an explicit `gridRow: span(...)` — a spanning wrapper stops a cell's real content height from growing its row's `1fr` track, so cells silently render smaller than the rank column.
- Drag-and-drop ranking (`Episode.tsx`) uses `@dnd-kit/core` + `@dnd-kit/sortable`. `DndContext`/`SortableContext` render no DOM element of their own (pure context providers), so they can wrap grid cells without violating the "direct children" rule above.
- Contestant photos fall back to a filesystem convention when no `photoUrl` is set: `<show-slug>/season_<n>/contestants/<contestant-name>.png` under `src/assets/` (see `getImagePath` in `ContestantIcon.tsx`). Uploaded images are written to disk under `backend/../uploads` (via `multer`, `backend/src/routes/images.ts`) and served statically at `/uploads`.
